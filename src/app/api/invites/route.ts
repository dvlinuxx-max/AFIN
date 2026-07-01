import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, badRequest, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";
import { ROLES } from "@/lib/rbac";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as [string, ...string[]]),
});

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  if (!ensure(ctx.role, "members:manage")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  if (parsed.data.role === "owner" && ctx.role !== "owner") return forbidden();

  const invite = await db.invite.create({
    data: { orgId: ctx.orgId, email: parsed.data.email.toLowerCase(), role: parsed.data.role, token: nanoid(16) },
  });
  await writeAudit(ctx.orgId, ctx.userId, "invite", "invite", invite.id, { email: invite.email });
  return NextResponse.json({ ok: true, token: invite.token });
}
