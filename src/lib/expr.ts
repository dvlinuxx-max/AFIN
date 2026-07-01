// Tiny expression engine for skip logic, constraints and calculations.
// Expressions are authored by form designers (trusted) and reference answers as ${field}.
// Answer values are passed as a bound variables object, never string-concatenated, so a
// respondent's input can't become code.

export type Answers = Record<string, unknown>;

function toNum(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

const DAY = 86400000;

const helpers = {
  selected(value: unknown, option: string): boolean {
    if (Array.isArray(value)) return value.includes(option);
    return value === option;
  },
  count(value: unknown): number {
    if (Array.isArray(value)) return value.length;
    if (value === undefined || value === null || value === "") return 0;
    return 1;
  },
  len(value: unknown): number {
    if (value === undefined || value === null) return 0;
    return String(value).length;
  },
  num: toNum,
  int(value: unknown): number {
    return Math.trunc(toNum(value));
  },
  round(value: unknown, places = 0): number {
    const f = 10 ** Math.trunc(toNum(places));
    return Math.round(toNum(value) * f) / f;
  },
  sum(...values: unknown[]): number {
    return values.flat().reduce<number>((acc, v) => acc + toNum(v), 0);
  },
  max(...values: unknown[]): number {
    return Math.max(...values.flat().map(toNum));
  },
  min(...values: unknown[]): number {
    return Math.min(...values.flat().map(toNum));
  },
  // String helpers mirroring common XLSForm functions.
  concat(...parts: unknown[]): string {
    return parts.map((p) => (p === undefined || p === null ? "" : String(p))).join("");
  },
  substr(value: unknown, start: number, end?: number): string {
    return String(value ?? "").slice(start, end);
  },
  contains(value: unknown, needle: string): boolean {
    return String(value ?? "").includes(needle);
  },
  starts(value: unknown, prefix: string): boolean {
    return String(value ?? "").startsWith(prefix);
  },
  ends(value: unknown, suffix: string): boolean {
    return String(value ?? "").endsWith(suffix);
  },
  upper(value: unknown): string {
    return String(value ?? "").toUpperCase();
  },
  lower(value: unknown): string {
    return String(value ?? "").toLowerCase();
  },
  trim(value: unknown): string {
    return String(value ?? "").trim();
  },
  regex(value: unknown, pattern: string): boolean {
    try {
      return new RegExp(pattern).test(String(value ?? ""));
    } catch {
      return false;
    }
  },
  // Logic helpers.
  iff(cond: unknown, a: unknown, b: unknown): unknown {
    return cond ? a : b;
  },
  coalesce(...values: unknown[]): unknown {
    for (const v of values) {
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "";
  },
  // Date helpers. Dates are ISO strings (yyyy-mm-dd or full ISO).
  today(): string {
    return new Date().toISOString().slice(0, 10);
  },
  now(): string {
    return new Date().toISOString();
  },
  daysBetween(a: unknown, b: unknown): number {
    const da = asDate(a);
    const db = asDate(b);
    if (!da || !db) return 0;
    return Math.round((db.getTime() - da.getTime()) / DAY);
  },
  // Whole years between a date and today (handy for age from a birthdate).
  age(value: unknown): number {
    const d = asDate(value);
    if (!d) return 0;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
    return years;
  },
  year(value: unknown): number {
    const d = asDate(value);
    return d ? d.getFullYear() : 0;
  },
  empty(value: unknown): boolean {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  },
};

export type Helpers = typeof helpers;
export type Attrs = Record<string, unknown>;

type Compiled = (vars: Answers, h: Helpers, self: unknown, attrs: Attrs) => unknown;

const cache = new Map<string, Compiled>();

function compile(expr: string): Compiled {
  let fn = cache.get(expr);
  if (fn) return fn;
  // ${field} -> answers, @attr -> choice attribute (cascading filters), bare leading dot -> self.
  const body = expr
    .replace(/\$\{\s*([a-zA-Z0-9_]+)\s*\}/g, 'vars["$1"]')
    .replace(/@([a-zA-Z0-9_]+)/g, 'attrs["$1"]')
    .replace(/(^|[^.\w])\.(?![\w.])/g, "$1self");
  fn = new Function("vars", "h", "self", "attrs", `"use strict"; try { return (${body}); } catch (e) { return undefined; }`) as Compiled;
  cache.set(expr, fn);
  return fn;
}

export function evalBool(expr: string | undefined, answers: Answers, self?: unknown, attrs: Attrs = {}): boolean {
  if (!expr || !expr.trim()) return true;
  try {
    return Boolean(compile(expr)(answers, helpers, self, attrs));
  } catch {
    return true;
  }
}

export function evalValue(expr: string | undefined, answers: Answers, self?: unknown, attrs: Attrs = {}): unknown {
  if (!expr || !expr.trim()) return undefined;
  try {
    return compile(expr)(answers, helpers, self, attrs);
  } catch {
    return undefined;
  }
}
