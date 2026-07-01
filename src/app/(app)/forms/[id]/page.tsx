import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { bi } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import { parseSchema } from "@/lib/form-schema";
import { FormControls } from "./FormControls";

export const dynamic = "force-dynamic";

export default async function FormOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const { t, locale } = await getDict();

  const form = await db.form.findFirst({
    where: { id, project: { orgId: ctx.org.id } },
    include: { project: true, _count: { select: { submissions: true } } },
  });
  if (!form) notFound();

  const schema = parseSchema(form.schemaJson);
  const canWrite = can(ctx.role, "form:write");

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/projects/${form.projectId}`} className="text-sm text-brand-700">
          ← {form.project.name}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold">{bi({ ar: form.title, en: form.titleEn || form.title }, locale)}</h1>
          <StatusBadge status={form.status} />
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          {schema.fields.length} {locale === "ar" ? "حقل" : "fields"} · {form._count.submissions} {t.forms.submissions} ·{" "}
          {t.forms.version} {form.version}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <Link href={`/forms/${form.id}/build`} className="btn btn-primary px-4 py-2">
            {t.forms.build}
          </Link>
        )}
        <Link href={`/forms/${form.id}/data`} className="btn btn-ghost px-4 py-2">
          {t.forms.openData}
        </Link>
      </div>

      <FormControls
        formId={form.id}
        shareToken={form.shareToken}
        status={form.status}
        allowAnonymous={form.allowAnonymous}
        requireGeo={form.requireGeo}
        encrypted={form.encrypted}
        canWrite={canWrite}
      />
    </div>
  );
}
