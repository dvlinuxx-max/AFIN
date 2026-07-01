import * as XLSX from "xlsx";
import { type Field, type FormSchema, isContainer, isMedia } from "./form-schema";
import type { Locale } from "./i18n";

export interface ExportSubmission {
  id: string;
  createdAt: string;
  geoLat: number | null;
  geoLng: number | null;
  data: Record<string, unknown>;
  // Present (and data empty) until decrypted client-side for end-to-end encrypted forms.
  enc?: { encKey: string; encIv: string; encData: string };
}

function pick(pair: { ar: string; en: string }, locale: Locale): string {
  return (locale === "ar" ? pair.ar : pair.en) || pair.ar || pair.en;
}

export function cellValue(field: Field, value: unknown, locale: Locale): string {
  if (field.type === "repeat") {
    const n = Array.isArray(value) ? value.length : 0;
    return n ? `${n} ${locale === "ar" ? "عنصر" : "items"}` : "";
  }
  if (value === undefined || value === null || value === "") return "";
  if (isMedia(field.type)) {
    return typeof value === "string" && value.startsWith("data:") ? `[${field.type}]` : String(value);
  }
  if (field.type === "geopoint") {
    const p = value as { lat?: number; lng?: number };
    return p.lat !== undefined ? `${p.lat}, ${p.lng}` : "";
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const choice = field.choices?.find((c) => c.value === v);
        return choice ? pick(choice.label, locale) : String(v);
      })
      .join(" | ");
  }
  if (field.choices) {
    const choice = field.choices.find((c) => c.value === value);
    if (choice) return pick(choice.label, locale);
  }
  return String(value);
}

interface Column {
  header: string;
  read: (data: Record<string, unknown>) => string;
}

// Flatten the form tree into spreadsheet columns. Groups are transparent; a repeat's
// child columns join the values across all of its instances with " | ".
function buildColumns(fields: Field[], locale: Locale): Column[] {
  const cols: Column[] = [];
  for (const f of fields) {
    if (f.type === "note") continue;
    if (f.type === "group") {
      cols.push(...buildColumns(f.children ?? [], locale));
    } else if (f.type === "repeat") {
      cols.push({
        header: `${pick(f.label, locale) || f.id} #`,
        read: (data) => String(Array.isArray(data[f.id]) ? (data[f.id] as unknown[]).length : 0),
      });
      for (const child of f.children ?? []) {
        if (isContainer(child.type) || child.type === "note") continue;
        const label = `${pick(f.label, locale) || f.id} · ${pick(child.label, locale) || child.id}`;
        cols.push({
          header: label,
          read: (data) => {
            const instances = Array.isArray(data[f.id]) ? (data[f.id] as Record<string, unknown>[]) : [];
            return instances.map((inst) => cellValue(child, inst[child.id], locale)).filter(Boolean).join(" | ");
          },
        });
      }
    } else {
      cols.push({
        header: pick(f.label, locale) || f.id,
        read: (data) => cellValue(f, data[f.id], locale),
      });
    }
  }
  return cols;
}

export function buildTable(schema: FormSchema, submissions: ExportSubmission[], locale: Locale) {
  const columns = buildColumns(schema.fields, locale);
  const headers = [
    "id",
    locale === "ar" ? "تاريخ الإرسال" : "submitted_at",
    ...columns.map((c) => c.header),
    "lat",
    "lng",
  ];
  const rows = submissions.map((s) => [
    s.id,
    new Date(s.createdAt).toLocaleString(locale === "ar" ? "ar" : "en"),
    ...columns.map((c) => c.read(s.data)),
    s.geoLat ?? "",
    s.geoLng ?? "",
  ]);
  return { headers, rows, columns };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(schema: FormSchema, submissions: ExportSubmission[], locale: Locale, name: string) {
  const { headers, rows } = buildTable(schema, submissions, locale);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
  // BOM so Excel reads UTF-8 (Arabic) correctly.
  triggerDownload(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `${name}.csv`);
}

export function exportExcel(schema: FormSchema, submissions: ExportSubmission[], locale: Locale, name: string) {
  const { headers, rows } = buildTable(schema, submissions, locale);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "data");
  XLSX.writeFile(wb, `${name}.xlsx`);
}
