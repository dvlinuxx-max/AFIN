"use client";

import { FIELD_TYPES, FIELD_LABELS, type FieldType } from "@/lib/form-schema";
import { useI18n } from "@/components/I18nProvider";

const ICONS: Record<FieldType, string> = {
  text: "Aa",
  paragraph: "¶",
  number: "#",
  decimal: ".5",
  email: "@",
  phone: "☎",
  select_one: "◉",
  select_multiple: "☑",
  rank: "↕",
  date: "▦",
  time: "◷",
  datetime: "▦◷",
  rating: "★",
  range: "▭",
  geopoint: "⌖",
  photo: "▣",
  audio: "◢",
  video: "▷",
  file: "▤",
  signature: "∿",
  barcode: "▥",
  note: "ℹ",
  calculate: "ƒ",
  group: "▢",
  repeat: "⟳",
};

export function FieldPalette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="card p-3">
      <h3 className="font-bold text-sm mb-2 px-1">{t.builder.addField}</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {FIELD_TYPES.map((ft) => (
          <button
            key={ft}
            type="button"
            onClick={() => onAdd(ft)}
            className="flex items-center gap-2 rounded-lg border px-2 py-2 text-sm text-start hover:bg-[var(--color-bg)] transition-colors"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
              {ICONS[ft]}
            </span>
            <span className="truncate">{FIELD_LABELS[ft][locale]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
