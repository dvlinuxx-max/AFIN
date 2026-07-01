"use client";

import { useI18n } from "./I18nProvider";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: t.forms.draft, cls: "bg-gray-100 text-gray-600" },
    deployed: { label: t.forms.deployed, cls: "bg-brand-100 text-brand-700" },
    closed: { label: t.forms.closed, cls: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
