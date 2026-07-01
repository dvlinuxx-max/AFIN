import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { clientIp, passwordStrength } from "@/lib/security";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  orgName: z.string().min(1).max(160),
  locale: z.enum(["ar", "en"]).optional(),
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${nanoid(5)}`;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, orgName, locale } = parsed.data;

  const strong = passwordStrength(password);
  if (!strong.ok) {
    return NextResponse.json({ error: "weak_password", message: strong.message }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      locale: locale ?? "ar",
    },
  });

  const org = await db.organization.create({ data: { name: orgName, slug: slugify(orgName) } });
  await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });
  await db.auditLog.create({
    data: { orgId: org.id, userId: user.id, action: "register", entityType: "org", entityId: org.id },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
