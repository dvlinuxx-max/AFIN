import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getLocale } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { parseSchema } from "@/lib/form-schema";
import { bi } from "@/lib/i18n";
import { DataView } from "@/components/data/DataView";
import type { ExportSubmission } from "@/lib/export";

export const dynamic = "force-dynamic";

export default async function DataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  if (!can(ctx.role, "data:read")) redirect("/dashboard");

  const form = await db.form.findFirst({ where: { id, project: { orgId: ctx.org.id } } });
  if (!form) notFound();

  const rows = await db.submission.findMany({
    where: { formId: id },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const locale = await getLocale();
  const title = bi({ ar: form.title, en: form.titleEn || form.title }, locale);

  const submissions: ExportSubmission[] = rows.map((s) => {
    if (s.encrypted) {
      return {
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        geoLat: null,
        geoLng: null,
        data: {},
        enc: { encKey: s.encKey, encIv: s.encIv, encData: s.encData },
      };
    }
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(s.dataJson);
    } catch {
      data = {};
    }
    return { id: s.id, createdAt: s.createdAt.toISOString(), geoLat: s.geoLat, geoLng: s.geoLng, data };
  });

  return (
    <DataView
      formId={form.id}
      formTitle={title}
      schema={parseSchema(form.schemaJson)}
      initialSubmissions={submissions}
      locale={locale}
      canDelete={can(ctx.role, "data:delete")}
      canExport={can(ctx.role, "data:export")}
      encrypted={form.encrypted}
      formKeys={form.encrypted ? { privKeyEnc: form.privKeyEnc, keySalt: form.keySalt, keyIv: form.keyIv } : undefined}
    />
  );
}
