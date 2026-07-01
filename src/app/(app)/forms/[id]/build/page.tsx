import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getLocale } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { parseSchema } from "@/lib/form-schema";
import { aiConfigured } from "@/lib/ai";
import { Builder } from "@/components/builder/Builder";
import { bi } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  if (!can(ctx.role, "form:write")) redirect(`/forms/${id}`);

  const form = await db.form.findFirst({ where: { id, project: { orgId: ctx.org.id } } });
  if (!form) notFound();

  const locale = await getLocale();
  const aiEnabled = await aiConfigured(ctx.org.id);
  const title = bi({ ar: form.title, en: form.titleEn || form.title }, locale);

  return <Builder formId={form.id} title={title} initialSchema={parseSchema(form.schemaJson)} aiEnabled={aiEnabled} />;
}
