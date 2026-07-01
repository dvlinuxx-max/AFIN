"use client";

import type { Choice } from "@/lib/form-schema";
import { useI18n } from "@/components/I18nProvider";

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_؀-ۿ]/g, "").slice(0, 40);
}

function attrsToText(attrs: Record<string, string> | undefined): string {
  if (!attrs) return "";
  return Object.entries(attrs).map(([k, v]) => `${k}=${v}`).join(", ");
}

function textToAttrs(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const pair of text.split(",")) {
    const [k, ...rest] = pair.split("=");
    const key = k.trim();
    if (key) out[key] = rest.join("=").trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export function ChoicesEditor({ choices, onChange }: { choices: Choice[]; onChange: (c: Choice[]) => void }) {
  const { t } = useI18n();

  function update(i: number, patch: Partial<Choice>) {
    onChange(choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function updateLabel(i: number, lang: "ar" | "en", v: string) {
    const c = choices[i];
    const label = { ...c.label, [lang]: v };
    const value = c.value || (lang === "ar" ? slug(v) : c.value);
    update(i, { label, value });
  }

  return (
    <div className="space-y-2">
      <label className="label">{t.builder.choices}</label>
      {choices.map((c, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-1.5 items-center">
            <input
              className="input flex-1"
              placeholder="عربي"
              value={c.label.ar}
              onChange={(e) => updateLabel(i, "ar", e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="English"
              value={c.label.en}
              onChange={(e) => updateLabel(i, "en", e.target.value)}
              dir="ltr"
            />
            <button
              type="button"
              className="text-red-600 px-2"
              onClick={() => onChange(choices.filter((_, idx) => idx !== i))}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
          <input
            className="input text-xs"
            dir="ltr"
            placeholder="attrs: country=iq, region=south"
            value={attrsToText(c.attrs)}
            onChange={(e) => update(i, { attrs: textToAttrs(e.target.value) })}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost px-3 py-1.5 text-sm"
        onClick={() => onChange([...choices, { value: "", label: { ar: "", en: "" } }])}
      >
        + {t.builder.addChoice}
      </button>
    </div>
  );
}
