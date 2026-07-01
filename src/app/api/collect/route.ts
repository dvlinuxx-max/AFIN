import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { parseSchema } from "@/lib/form-schema";
import { applyCalculations, validate } from "@/lib/form-runtime";
import { writeAudit } from "@/lib/session";
import { clientIp } from "@/lib/security";
import { rateLimit } from "@/lib/ratelimit";
import type { Answers } from "@/lib/expr";

const MAX_BODY = 16 * 1024 * 1024; // 16 MB, room for a few inline media attachments

const encPayload = z.object({
  encKey: z.string().min(1).max(4096),
  encIv: z.string().min(1).max(256),
  encData: z.string().min(1),
});

const schema = z.object({
  token: z.string().min(1).max(120),
  data: z.record(z.string(), z.unknown()).optional(),
  enc: encPayload.optional(),
  clientId: z.string().max(80).optional(),
  deviceId: z.string().max(80).optional(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`collect:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { token, data, enc, clientId, deviceId, geo } = parsed.data;

  const form = await db.form.findUnique({
    where: { shareToken: token },
    include: { project: { select: { orgId: true } } },
  });
  if (!form) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (form.status !== "deployed") return NextResponse.json({ error: "closed" }, { status: 403 });

  const userId = await getUserId();
  if (!form.allowAnonymous && !userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // Dedupe retried offline submissions by their client-generated id.
  if (clientId) {
    const dupe = await db.submission.findFirst({ where: { formId: form.id, clientId } });
    if (dupe) return NextResponse.json({ ok: true, id: dupe.id, deduped: true });
  }

  let created;
  if (form.encrypted) {
    // Encrypted forms send an opaque payload; the server cannot read, validate, or derive
    // geo from it. The client is responsible for validating before encrypting.
    if (!enc) return NextResponse.json({ error: "encryption_required" }, { status: 400 });
    created = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        dataJson: "",
        encrypted: true,
        encKey: enc.encKey,
        encIv: enc.encIv,
        encData: enc.encData,
        clientId: clientId ?? "",
        deviceId: deviceId ?? "",
        submittedById: userId ?? null,
      },
    });
  } else {
    if (!data) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const schemaObj = parseSchema(form.schemaJson);
    const answers = applyCalculations(schemaObj, data as Answers);
    const result = validate(schemaObj, answers, "ar");
    if (!result.ok) return NextResponse.json({ error: "validation", errors: result.errors }, { status: 422 });

    let lat = geo?.lat ?? null;
    let lng = geo?.lng ?? null;
    if (lat === null) {
      for (const f of schemaObj.fields) {
        if (f.type === "geopoint") {
          const v = answers[f.id] as { lat?: number; lng?: number } | undefined;
          if (v && typeof v.lat === "number") {
            lat = v.lat;
            lng = v.lng ?? null;
            break;
          }
        }
      }
    }

    created = await db.submission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        dataJson: JSON.stringify(answers),
        geoLat: lat,
        geoLng: lng,
        clientId: clientId ?? "",
        deviceId: deviceId ?? "",
        submittedById: userId ?? null,
      },
    });
  }

  await writeAudit(form.project.orgId, userId, "submit", "submission", created.id, { formId: form.id });
  return NextResponse.json({ ok: true, id: created.id });
}
