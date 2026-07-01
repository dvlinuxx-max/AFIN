import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, roleInOrg, ensure } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const invite = await db.invite.findUnique({ where: { id } });
  if (!invite) return notFound();
  const role = await roleInOrg(ctx.userId, invite.orgId);
  if (!ensure(role, "members:manage")) return forbidden();

  await db.invite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
