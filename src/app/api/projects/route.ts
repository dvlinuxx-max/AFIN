import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, badRequest, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  if (!ensure(ctx.role, "project:write")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      color: parsed.data.color ?? "#059669",
      orgId: ctx.orgId,
      createdById: ctx.userId,
    },
  });
  await writeAudit(ctx.orgId, ctx.userId, "create", "project", project.id, { name: project.name });
  return NextResponse.json({ ok: true, id: project.id });
}
