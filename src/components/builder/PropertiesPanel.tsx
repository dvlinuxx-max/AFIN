"use client";

import type { Field } from "@/lib/form-schema";
import { hasChoices, isContainer } from "@/lib/form-schema";
import { useI18n } from "@/components/I18nProvider";
import { ChoicesEditor } from "./ChoicesEditor";

interface Props {
  field: Field | null;
  onChange: (patch: Partial<Field>) => void;
}

export function PropertiesPanel({ field, onChange }: Props) {
  const { t, locale } = useI18n();

  if (!field) {
    return (
      <div className="card p-5 text-center text-sm" style={{ color: "var(--color-muted)" }}>
        {t.builder.noFieldSelected}
      </div>
    );
  }

  const container = isContainer(field.type);
  const isInput = field.type !== "note" && !container;

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-bold text-sm">{t.builder.properties}</h3>

      <div>
        <label className="label">{t.builder.fieldLabel}</label>
        <input className="input" value={field.label.ar} onChange={(e) => onChange({ label: { ...field.label, ar: e.target.value } })} />
      </div>
      <div>
        <label className="label">{t.builder.fieldLabelEn}</label>
        <input
          className="input"
          dir="ltr"
          value={field.label.en}
          onChange={(e) => onChange({ label: { ...field.label, en: e.target.value } })}
        />
      </div>

      <div>
        <label className="label">{t.builder.fieldName}</label>
        <input
          className="input"
          dir="ltr"
          value={field.id}
          onChange={(e) => onChange({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
        />
      </div>

      {!container && (
        <div>
          <label className="label">{t.builder.hint}</label>
          <input
            className="input"
            value={field.hint?.ar ?? ""}
            onChange={(e) => onChange({ hint: { ar: e.target.value, en: field.hint?.en ?? "" } })}
          />
        </div>
      )}

      {hasChoices(field.type) && (
        <>
          <ChoicesEditor choices={field.choices ?? []} onChange={(choices) => onChange({ choices })} />
          <div>
            <label className="label">{locale === "ar" ? "تصفية الخيارات (cascading)" : "Choice filter (cascading)"}</label>
            <input
              className="input"
              dir="ltr"
              placeholder="@country == ${selected_country}"
              value={field.choiceFilter ?? ""}
              onChange={(e) => onChange({ choiceFilter: e.target.value })}
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              {locale === "ar" ? "استخدم ${حقل} للإجابات و @سمة لخصائص الخيار" : "Use ${field} for answers and @attr for choice attributes"}
            </p>
          </div>
        </>
      )}

      {(field.type === "number" || field.type === "decimal" || field.type === "range") && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label">min</label>
            <input
              className="input"
              type="number"
              dir="ltr"
              value={field.min ?? ""}
              onChange={(e) => onChange({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">max</label>
            <input
              className="input"
              type="number"
              dir="ltr"
              value={field.max ?? ""}
              onChange={(e) => onChange({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          {field.type === "range" && (
            <div>
              <label className="label">step</label>
              <input
                className="input"
                type="number"
                dir="ltr"
                value={field.step ?? ""}
                onChange={(e) => onChange({ step: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}

      {field.type === "rating" && (
        <div>
          <label className="label">max</label>
          <input
            className="input"
            type="number"
            dir="ltr"
            value={field.maxRating ?? 5}
            onChange={(e) => onChange({ maxRating: Number(e.target.value) || 5 })}
          />
        </div>
      )}

      {field.type === "repeat" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{locale === "ar" ? "أدنى تكرار" : "Min repeats"}</label>
            <input
              className="input"
              type="number"
              dir="ltr"
              value={field.minRepeat ?? ""}
              onChange={(e) => onChange({ minRepeat: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">{locale === "ar" ? "أقصى تكرار" : "Max repeats"}</label>
            <input
              className="input"
              type="number"
              dir="ltr"
              value={field.maxRepeat ?? ""}
              onChange={(e) => onChange({ maxRepeat: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {field.type === "calculate" && (
        <div>
          <label className="label">{t.builder.calculation}</label>
          <input className="input" dir="ltr" value={field.calculation ?? ""} onChange={(e) => onChange({ calculation: e.target.value })} />
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            {t.builder.calculationHint}
          </p>
        </div>
      )}

      {(isInput || field.type === "select_one") && (
        <div>
          <label className="label">{locale === "ar" ? "المظهر (appearance)" : "Appearance"}</label>
          <input
            className="input"
            dir="ltr"
            placeholder="minimal, multiline, likert…"
            value={field.appearance ?? ""}
            onChange={(e) => onChange({ appearance: e.target.value })}
          />
        </div>
      )}

      {isInput && (
        <>
          <div>
            <label className="label">{locale === "ar" ? "مساعدة موسّعة" : "Guidance"}</label>
            <input
              className="input"
              value={field.guidance?.ar ?? ""}
              onChange={(e) => onChange({ guidance: { ar: e.target.value, en: field.guidance?.en ?? "" } })}
            />
          </div>

          <label className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.common.required}</span>
            <input
              type="checkbox"
              checked={field.required ?? false}
              onChange={(e) => onChange({ required: e.target.checked })}
              className="w-5 h-5 accent-[var(--color-brand-600)]"
            />
          </label>
        </>
      )}

      {(isInput || container) && (
        <div>
          <label className="label">{t.builder.skipLogic}</label>
          <input className="input" dir="ltr" value={field.relevant ?? ""} onChange={(e) => onChange({ relevant: e.target.value })} />
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            {t.builder.skipLogicHint}
          </p>
        </div>
      )}

      {isInput && field.type !== "calculate" && (
        <div>
          <label className="label">{t.builder.constraint}</label>
          <input className="input" dir="ltr" value={field.constraint ?? ""} onChange={(e) => onChange({ constraint: e.target.value })} />
          <input
            className="input mt-1.5"
            placeholder={t.builder.constraintMessage}
            value={field.constraintMessage?.ar ?? ""}
            onChange={(e) => onChange({ constraintMessage: { ar: e.target.value, en: field.constraintMessage?.en ?? "" } })}
          />
        </div>
      )}
    </div>
  );
}
