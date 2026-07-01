"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { displayFields, type FormSchema, type Field } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import type { ExportSubmission } from "@/lib/export";
import { useI18n } from "@/components/I18nProvider";
import { bi } from "@/lib/i18n";

const PALETTE = ["#059669", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#ca8a04", "#dc2626"];

function distribution(field: Field, submissions: ExportSubmission[], locale: Locale) {
  const counts = new Map<string, number>();
  const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

  for (const s of submissions) {
    const v = s.data[field.id];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => add(String(x)));
    else add(String(v));
  }

  return Array.from(counts.entries()).map(([value, count]) => {
    const choice = field.choices?.find((c) => c.value === value);
    const label = choice ? bi(choice.label, locale) : value;
    return { label, count };
  });
}

export function DataCharts({ schema, submissions, locale }: { schema: FormSchema; submissions: ExportSubmission[]; locale: Locale }) {
  const { t } = useI18n();
  const chartable = displayFields(schema.fields).filter(
    (f) => f.type === "select_one" || f.type === "select_multiple" || f.type === "rating",
  );

  if (submissions.length === 0) {
    return <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>{t.data.noData}</div>;
  }
  if (chartable.length === 0) {
    return <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>{t.common.none}</div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {chartable.map((f) => {
        const data = distribution(f, submissions, locale);
        return (
          <div key={f.id} className="card p-4">
            <h3 className="font-bold mb-3">{bi(f.label, locale) || f.id}</h3>
            <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
