import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, badRequest, roleInOrg, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";
import { ROLES } from "@/lib/rbac";

const schema = z.object({ role: z.enum(ROLES as [string, ...string[]]) });

// `id` is a membership id.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const member = await db.membership.findUnique({ where: { id } });
  if (!member) return notFound();
  const actorRole = await roleInOrg(ctx.userId, member.orgId);
  if (!ensure(actorRole, "members:manage")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();

  // Only an owner can grant or revoke the owner role.
  if ((member.role === "owner" || parsed.data.role === "owner") && actorRole !== "owner") return forbidden();

  await db.membership.update({ where: { id }, data: { role: parsed.data.role } });
  await writeAudit(member.orgId, ctx.userId, "role", "member", id, { role: parsed.data.role });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const member = await db.membership.findUnique({ where: { id } });
  if (!member) return notFound();
  const actorRole = await roleInOrg(ctx.userId, member.orgId);
  if (!ensure(actorRole, "members:manage")) return forbidden();
  if (member.role === "owner" && actorRole !== "owner") return forbidden();

  // Never remove the last owner.
  if (member.role === "owner") {
    const owners = await db.membership.count({ where: { orgId: member.orgId, role: "owner" } });
    if (owners <= 1) return forbidden();
  }

  await db.membership.delete({ where: { id } });
  await writeAudit(member.orgId, ctx.userId, "remove", "member", id);
  return NextResponse.json({ ok: true });
}
