import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { writeAudit } from "@/lib/session";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const invite = await db.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.acceptedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId: invite.orgId } },
  });
  if (!existing) {
    await db.membership.create({ data: { userId, orgId: invite.orgId, role: invite.role } });
  }
  await db.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await writeAudit(invite.orgId, userId, "join", "member", userId);

  return NextResponse.json({ ok: true, orgId: invite.orgId });
}
