import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, badRequest, roleInOrg, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";

async function load(id: string) {
  return db.submission.findUnique({ where: { id }, include: { form: { include: { project: true } } } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const sub = await load(id);
  if (!sub) return notFound();
  const role = await roleInOrg(ctx.userId, sub.form.project.orgId);
  if (!ensure(role, "data:write")) return forbidden();

  const parsed = z.object({ data: z.record(z.string(), z.unknown()) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();

  await db.submission.update({ where: { id }, data: { dataJson: JSON.stringify(parsed.data.data) } });
  await writeAudit(sub.form.project.orgId, ctx.userId, "update", "submission", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const sub = await load(id);
  if (!sub) return notFound();
  const role = await roleInOrg(ctx.userId, sub.form.project.orgId);
  if (!ensure(role, "data:delete")) return forbidden();

  await db.submission.delete({ where: { id } });
  await writeAudit(sub.form.project.orgId, ctx.userId, "delete", "submission", id);
  return NextResponse.json({ ok: true });
}
