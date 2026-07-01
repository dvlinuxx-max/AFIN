import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, badRequest, roleInOrg, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  titleEn: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  allowAnonymous: z.boolean().optional(),
  requireGeo: z.boolean().optional(),
  status: z.enum(["draft", "deployed", "closed"]).optional(),
  schemaJson: z.string().optional(),
  encrypted: z.boolean().optional(),
  publicKey: z.string().max(4096).optional(),
  privKeyEnc: z.string().max(8192).optional(),
  keySalt: z.string().max(256).optional(),
  keyIv: z.string().max(256).optional(),
});

async function load(id: string) {
  return db.form.findUnique({ where: { id }, include: { project: true } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const form = await load(id);
  if (!form) return notFound();
  const role = await roleInOrg(ctx.userId, form.project.orgId);
  if (!ensure(role, "form:write")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const data = parsed.data;

  // Validate any incoming schema JSON.
  if (data.schemaJson !== undefined) {
    try {
      const obj = JSON.parse(data.schemaJson);
      if (!obj || !Array.isArray(obj.fields)) return badRequest("schema");
    } catch {
      return badRequest("schema");
    }
  }

  // Turning on encryption rotates in a fresh keypair; refuse if any submission already
  // exists, since old plaintext rows can't be retrofitted and old keys would be lost.
  if (data.encrypted === true && !form.encrypted) {
    const count = await db.submission.count({ where: { formId: id } });
    if (count > 0) return badRequest("has_submissions");
    if (!data.publicKey || !data.privKeyEnc || !data.keySalt || !data.keyIv) return badRequest("missing_keys");
  }

  const update: Record<string, unknown> = { ...data };
  let newVersion = form.version;

  // Snapshot a version when the schema changes on a deployed form, or on first deploy.
  const schemaChanged = data.schemaJson !== undefined && data.schemaJson !== form.schemaJson;
  const deployingNow = data.status === "deployed" && form.status !== "deployed";

  if ((schemaChanged && form.status === "deployed") || deployingNow) {
    const effectiveSchema = data.schemaJson ?? form.schemaJson;
    newVersion = form.version + (schemaChanged && form.status === "deployed" ? 1 : 0);
    update.version = newVersion;
    await db.formVersion.upsert({
      where: { formId_version: { formId: id, version: newVersion } },
      create: { formId: id, version: newVersion, schemaJson: effectiveSchema, createdById: ctx.userId },
      update: { schemaJson: effectiveSchema },
    });
  }

  await db.form.update({ where: { id }, data: update });
  await writeAudit(form.project.orgId, ctx.userId, data.status ? "status" : "update", "form", id, {
    status: data.status,
  });
  return NextResponse.json({ ok: true, version: newVersion });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const form = await load(id);
  if (!form) return notFound();
  const role = await roleInOrg(ctx.userId, form.project.orgId);
  if (!ensure(role, "data:delete")) return forbidden();

  await db.form.delete({ where: { id } });
  await writeAudit(form.project.orgId, ctx.userId, "delete", "form", id);
  return NextResponse.json({ ok: true });
}
