import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, badRequest, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).max(160).optional(),
  ai_provider: z.enum(["anthropic", "openai"]).optional(),
  ai_key: z.string().max(400).optional(),
  ai_model: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  if (!ensure(ctx.role, "org:manage")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const { name, ...settings } = parsed.data;

  if (name) await db.organization.update({ where: { id: ctx.orgId }, data: { name } });

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    await db.setting.upsert({
      where: { orgId_key: { orgId: ctx.orgId, key } },
      create: { orgId: ctx.orgId, key, value },
      update: { value },
    });
  }

  await writeAudit(ctx.orgId, ctx.userId, "update", "settings", ctx.orgId);
  return NextResponse.json({ ok: true });
}
