import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, badRequest, roleInOrg, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return notFound();
  const role = await roleInOrg(ctx.userId, project.orgId);
  if (!ensure(role, "project:write")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();

  await db.project.update({ where: { id }, data: parsed.data });
  await writeAudit(project.orgId, ctx.userId, "update", "project", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return notFound();
  const role = await roleInOrg(ctx.userId, project.orgId);
  if (!ensure(role, "data:delete")) return forbidden();

  await db.project.delete({ where: { id } });
  await writeAudit(project.orgId, ctx.userId, "delete", "project", id);
  return NextResponse.json({ ok: true });
}
