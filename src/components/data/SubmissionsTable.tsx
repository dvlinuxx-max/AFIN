"use client";

import { useState } from "react";
import { displayFields, type FormSchema } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import { cellValue, type ExportSubmission } from "@/lib/export";
import { useI18n } from "@/components/I18nProvider";
import { bi } from "@/lib/i18n";
import { Modal } from "@/components/Modal";

interface Props {
  schema: FormSchema;
  submissions: ExportSubmission[];
  locale: Locale;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

export function SubmissionsTable({ schema, submissions, locale, canDelete, onDelete }: Props) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<ExportSubmission | null>(null);
  const fields = displayFields(schema.fields);
  const shown = fields.slice(0, 6);

  async function remove(id: string) {
    if (!confirm(t.data.deleteConfirm)) return;
    const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
    if (res.ok) onDelete(id);
  }

  if (submissions.length === 0) {
    return (
      <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>
        {t.data.noData}
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <th className="text-start p-3 font-semibold whitespace-nowrap">{t.data.submittedAt}</th>
              {shown.map((f) => (
                <th key={f.id} className="text-start p-3 font-semibold whitespace-nowrap">
                  {bi(f.label, locale) || f.id}
                </th>
              ))}
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-[var(--color-bg)]" style={{ borderColor: "var(--color-border)" }}>
                <td className="p-3 whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                  {new Date(s.createdAt).toLocaleString(locale === "ar" ? "ar" : "en")}
                </td>
                {shown.map((f) => (
                  <td key={f.id} className="p-3 max-w-[200px] truncate">
                    {cellValue(f, s.data[f.id], locale)}
                  </td>
                ))}
                <td className="p-3 whitespace-nowrap text-end">
                  <button className="text-brand-700 font-semibold me-2" onClick={() => setDetail(s)}>
                    {t.common.open}
                  </button>
                  {canDelete && (
                    <button className="text-red-600" onClick={() => remove(s.id)}>
                      {t.common.delete}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={t.data.viewSubmission}>
        {detail && (
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {fields.map((f) => (
              <div key={f.id} className="border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
                <div className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
                  {bi(f.label, locale) || f.id}
                </div>
                <div>{cellValue(f, detail.data[f.id], locale) || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
