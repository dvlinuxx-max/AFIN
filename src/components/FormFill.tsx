"use client";

import { useMemo, useState } from "react";
import type { Field, FormSchema } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import { bi } from "@/lib/i18n";
import { applyCalculations, filteredChoices, isVisible, repeatInstances, validate } from "@/lib/form-runtime";
import type { Answers } from "@/lib/expr";
import { FieldInput } from "./FieldInput";
import { useI18n } from "./I18nProvider";

interface Props {
  schema: FormSchema;
  locale: Locale;
  initialAnswers?: Answers;
  onSubmit?: (answers: Answers) => void | Promise<void>;
  submitLabel?: string;
  busy?: boolean;
  disabled?: boolean;
}

type Path = (string | number)[];

function getByPath(obj: Answers, path: Path): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

function setByPath(obj: Answers, path: Path, value: unknown): Answers {
  if (path.length === 0) return obj;
  const [head, ...rest] = path;
  const clone: Answers = Array.isArray(obj) ? ([...(obj as unknown[])] as unknown as Answers) : { ...obj };
  if (rest.length === 0) {
    (clone as Record<string | number, unknown>)[head] = value;
  } else {
    const child = (clone as Record<string | number, unknown>)[head];
    (clone as Record<string | number, unknown>)[head] = setByPath((child as Answers) ?? {}, rest, value);
  }
  return clone;
}

export function FormFill({ schema, locale, initialAnswers, onSubmit, submitLabel, busy, disabled }: Props) {
  const { t } = useI18n();
  const [raw, setRaw] = useState<Answers>(initialAnswers ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const answers = useMemo(() => applyCalculations(schema, raw), [schema, raw]);

  function setPath(path: Path, value: unknown) {
    setRaw((prev) => setByPath(prev, path, value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate(schema, answers, locale);
    setErrors(result.errors);
    if (!result.ok) {
      const first = document.querySelector(`[data-field-error="true"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await onSubmit?.(answers);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Nodes
        fields={schema.fields}
        answers={answers}
        scope={answers}
        path={[]}
        errPrefix=""
        errors={errors}
        locale={locale}
        disabled={disabled}
        setPath={setPath}
      />
      {onSubmit && (
        <button type="submit" className="btn btn-primary w-full py-3" disabled={busy || disabled}>
          {busy ? t.common.saving : submitLabel ?? t.common.submit}
        </button>
      )}
    </form>
  );
}

interface NodesProps {
  fields: Field[];
  answers: Answers;
  scope: Answers;
  path: Path;
  errPrefix: string;
  errors: Record<string, string>;
  locale: Locale;
  disabled?: boolean;
  setPath: (path: Path, value: unknown) => void;
}

function Nodes({ fields, answers, scope, path, errPrefix, errors, locale, disabled, setPath }: NodesProps) {
  return (
    <div className="space-y-5">
      {fields.map((f) => {
        if (!isVisible(f, scope)) return null;

        if (f.type === "group") {
          return (
            <fieldset key={f.id} className="rounded-xl border p-4 space-y-4" style={{ borderColor: "var(--color-border)" }}>
              {bi(f.label, locale) && <legend className="px-2 font-semibold text-sm">{bi(f.label, locale)}</legend>}
              <Nodes
                fields={f.children ?? []}
                answers={answers}
                scope={scope}
                path={path}
                errPrefix={errPrefix}
                errors={errors}
                locale={locale}
                disabled={disabled}
                setPath={setPath}
              />
            </fieldset>
          );
        }

        if (f.type === "repeat") {
          return (
            <RepeatBlock
              key={f.id}
              field={f}
              answers={answers}
              scope={scope}
              path={path}
              errPrefix={errPrefix}
              errors={errors}
              locale={locale}
              disabled={disabled}
              setPath={setPath}
            />
          );
        }

        const fieldPath = [...path, f.id];
        const value = getByPath(answers, fieldPath);
        const choices = f.choiceFilter ? filteredChoices(f, scope) : undefined;
        const key = errPrefix + f.id;
        return (
          <div key={f.id} data-field-error={errors[key] ? "true" : undefined}>
            <FieldInput
              field={f}
              value={value}
              onChange={(v) => setPath(fieldPath, v)}
              locale={locale}
              error={errors[key]}
              disabled={disabled}
              choices={choices}
            />
          </div>
        );
      })}
    </div>
  );
}

function RepeatBlock({ field, answers, scope, path, errPrefix, errors, locale, disabled, setPath }: Omit<NodesProps, "fields"> & { field: Field }) {
  const repeatPath = [...path, field.id];
  const instances = repeatInstances(getByPath(answers, repeatPath));
  const max = field.maxRepeat ?? 50;
  const addLabel = locale === "ar" ? "إضافة" : "Add";
  const removeLabel = locale === "ar" ? "حذف" : "Remove";
  const itemLabel = bi(field.label, locale);

  function add() {
    if (instances.length >= max) return;
    setPath(repeatPath, [...instances, {}]);
  }
  function remove(i: number) {
    setPath(repeatPath, instances.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{itemLabel}</span>
        <button type="button" className="btn btn-ghost px-3 py-1 text-sm" onClick={add} disabled={disabled || instances.length >= max}>
          + {addLabel}
        </button>
      </div>
      {errors[errPrefix + field.id] && <p className="text-xs text-red-600">{errors[errPrefix + field.id]}</p>}
      {instances.length === 0 && (
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          {locale === "ar" ? "لا عناصر بعد" : "No items yet"}
        </p>
      )}
      {instances.map((inst, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface, #fafafa)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
              {itemLabel} {i + 1}
            </span>
            <button type="button" className="text-xs text-red-600" onClick={() => remove(i)} disabled={disabled}>
              {removeLabel}
            </button>
          </div>
          <Nodes
            fields={field.children ?? []}
            answers={answers}
            scope={{ ...scope, ...inst }}
            path={[...repeatPath, i]}
            errPrefix={`${errPrefix}${field.id}.${i}.`}
            errors={errors}
            locale={locale}
            disabled={disabled}
            setPath={setPath}
          />
        </div>
      ))}
    </div>
  );
}
