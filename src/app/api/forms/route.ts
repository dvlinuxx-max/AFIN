import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { apiContext, unauthorized, forbidden, notFound, badRequest, roleInOrg, ensure } from "@/lib/api";
import { writeAudit } from "@/lib/session";
import { templateById } from "@/lib/templates";
import { emptySchema } from "@/lib/form-schema";

const schema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional(),
  templateId: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { projectId, title, titleEn, templateId } = parsed.data;

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return notFound();
  const role = await roleInOrg(ctx.userId, project.orgId);
  if (!ensure(role, "form:write")) return forbidden();

  const tpl = templateId ? templateById(templateId) : undefined;
  const schemaJson = JSON.stringify(tpl ? tpl.schema : emptySchema());

  const form = await db.form.create({
    data: {
      title,
      titleEn: titleEn ?? "",
      shareToken: nanoid(10),
      schemaJson,
      projectId,
      createdById: ctx.userId,
    },
  });
  await writeAudit(project.orgId, ctx.userId, "create", "form", form.id, { title });
  return NextResponse.json({ ok: true, id: form.id });
}
