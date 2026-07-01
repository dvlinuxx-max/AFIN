import { type Field, type FormSchema, isContainer } from "./form-schema";
import { evalBool, evalValue, type Answers } from "./expr";
import type { Locale } from "./i18n";

function pick(pair: { ar: string; en: string } | undefined, locale: Locale): string {
  if (!pair) return "";
  return (locale === "ar" ? pair.ar : pair.en) || pair.ar || pair.en || "";
}

// Repeat instances are stored as an array of answer objects under the repeat's id.
export type RepeatValue = Answers[];

export function repeatInstances(value: unknown): Answers[] {
  return Array.isArray(value) ? (value as Answers[]) : [];
}

// Evaluating an expression inside a repeat instance sees the instance's own answers
// layered on top of the form-level answers.
function scopeFor(base: Answers, instance?: Answers): Answers {
  return instance ? { ...base, ...instance } : base;
}

export function isVisible(field: Field, scope: Answers): boolean {
  return evalBool(field.relevant, scope, scope[field.id]);
}

// Fill calculated fields based on current answers, walking into groups and repeats.
// Returns a new answers object; repeat instances are recomputed per instance.
export function applyCalculations(schema: FormSchema, answers: Answers): Answers {
  const next: Answers = { ...answers };
  computeInto(schema.fields, next, next);
  return next;
}

function computeInto(fields: Field[], store: Answers, base: Answers): void {
  for (const f of fields) {
    if (f.type === "calculate" && f.calculation) {
      store[f.id] = evalValue(f.calculation, base, store[f.id]) ?? "";
    } else if (f.type === "group" && f.children) {
      computeInto(f.children, store, base);
    } else if (f.type === "repeat" && f.children) {
      const instances = repeatInstances(store[f.id]).map((inst) => {
        const copy = { ...inst };
        computeInto(f.children!, copy, scopeFor(base, copy));
        return copy;
      });
      store[f.id] = instances;
    }
  }
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

export interface ValidationResult {
  ok: boolean;
  // Keyed by field id, or by "repeatId.index.childId" for fields inside a repeat.
  errors: Record<string, string>;
}

export function validate(schema: FormSchema, answers: Answers, locale: Locale): ValidationResult {
  const errors: Record<string, string> = {};
  validateInto(schema.fields, answers, answers, "", errors, locale);
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateInto(
  fields: Field[],
  store: Answers,
  base: Answers,
  prefix: string,
  errors: Record<string, string>,
  locale: Locale,
): void {
  const requiredMsg = locale === "ar" ? "هذا الحقل إلزامي" : "This field is required";
  const invalidMsg = locale === "ar" ? "قيمة غير صالحة" : "Invalid value";

  for (const f of fields) {
    if (!isVisible(f, base)) continue;

    if (f.type === "group" && f.children) {
      validateInto(f.children, store, base, prefix, errors, locale);
      continue;
    }
    if (f.type === "repeat" && f.children) {
      const instances = repeatInstances(store[f.id]);
      if (f.minRepeat && instances.length < f.minRepeat) {
        errors[prefix + f.id] = locale === "ar" ? `أضف ${f.minRepeat} عنصر على الأقل` : `Add at least ${f.minRepeat} items`;
      }
      instances.forEach((inst, i) => {
        validateInto(f.children!, inst, scopeFor(base, inst), `${prefix}${f.id}.${i}.`, errors, locale);
      });
      continue;
    }

    if (f.type === "note" || f.type === "calculate") continue;
    const key = prefix + f.id;
    const v = store[f.id];

    if (f.required && isEmpty(v)) {
      errors[key] = f.requiredMessage ? pick(f.requiredMessage, locale) : requiredMsg;
      continue;
    }
    if (isEmpty(v)) continue;

    if ((f.type === "number" || f.type === "decimal" || f.type === "range") && typeof v !== "undefined") {
      const n = Number(v);
      if (!Number.isFinite(n)) errors[key] = invalidMsg;
      else if (f.min !== undefined && n < f.min) errors[key] = invalidMsg;
      else if (f.max !== undefined && n > f.max) errors[key] = invalidMsg;
    }
    if (f.type === "email" && typeof v === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      errors[key] = invalidMsg;
    }
    const scope = scopeFor(base, undefined);
    if (!errors[key] && f.constraint && !evalBool(f.constraint, scope, v)) {
      errors[key] = f.constraintMessage ? pick(f.constraintMessage, locale) : invalidMsg;
    }
  }
}

// Choices left after applying a cascading choice_filter, given the current scope.
export function filteredChoices(field: Field, scope: Answers) {
  const choices = field.choices ?? [];
  if (!field.choiceFilter || !field.choiceFilter.trim()) return choices;
  return choices.filter((c) => {
    // Answers are referenced as ${field}; the choice's own attributes as @attr.
    return evalBool(field.choiceFilter, scope, c.value, c.attrs ?? {});
  });
}
