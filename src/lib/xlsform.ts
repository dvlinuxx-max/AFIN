// Import/export between AFIN's form schema and the XLSForm standard used by
// KoboToolbox and ODK. Covers survey + choices sheets, groups, repeats, cascading
// selects (choice_filter + choice attributes), and the common field types.

import * as XLSX from "xlsx";
import type { Choice, Field, FieldType, FormSchema } from "./form-schema";
import { newFieldId } from "./form-schema";

const TO_XLS: Record<FieldType, string> = {
  text: "text",
  paragraph: "text",
  number: "integer",
  decimal: "decimal",
  email: "text",
  phone: "text",
  select_one: "select_one",
  select_multiple: "select_multiple",
  rank: "rank",
  date: "date",
  time: "time",
  datetime: "dateTime",
  rating: "integer",
  range: "range",
  geopoint: "geopoint",
  photo: "image",
  audio: "audio",
  video: "video",
  file: "file",
  signature: "image",
  barcode: "barcode",
  note: "note",
  calculate: "calculate",
  group: "begin_group",
  repeat: "begin_repeat",
};

const FROM_XLS: Record<string, FieldType> = {
  text: "text",
  integer: "number",
  int: "number",
  decimal: "decimal",
  select_one: "select_one",
  select_multiple: "select_multiple",
  rank: "rank",
  date: "date",
  time: "time",
  datetime: "datetime",
  range: "range",
  geopoint: "geopoint",
  geotrace: "geopoint",
  image: "photo",
  audio: "audio",
  video: "video",
  file: "file",
  barcode: "barcode",
  note: "note",
  calculate: "calculate",
};

const SURVEY_HEADER = [
  "type",
  "name",
  "label::Arabic (ar)",
  "label::English (en)",
  "required",
  "relevant",
  "constraint",
  "constraint_message::Arabic (ar)",
  "calculation",
  "hint::Arabic (ar)",
  "guidance_hint::Arabic (ar)",
  "choice_filter",
  "appearance",
];

function selectListName(f: Field): string {
  return `${f.id}_opts`;
}

export function schemaToWorkbook(schema: FormSchema, title: string): XLSX.WorkBook {
  const survey: (string | undefined)[][] = [SURVEY_HEADER];
  const choices: (string | undefined)[][] = [];
  const attrKeys = new Set<string>();

  // Discover the union of choice attribute keys so the choices sheet gets stable columns.
  const collectAttrs = (fields: Field[]) => {
    for (const f of fields) {
      for (const c of f.choices ?? []) for (const k of Object.keys(c.attrs ?? {})) attrKeys.add(k);
      if (f.children) collectAttrs(f.children);
    }
  };
  collectAttrs(schema.fields);
  const attrCols = [...attrKeys];
  choices.push(["list_name", "name", "label::Arabic (ar)", "label::English (en)", ...attrCols]);

  const surveyRow = (f: Field, type: string) => {
    survey.push([
      type,
      f.id,
      f.label.ar,
      f.label.en,
      f.required ? "yes" : "",
      f.relevant ?? "",
      f.constraint ?? "",
      f.constraintMessage?.ar ?? "",
      f.calculation ?? "",
      f.hint?.ar ?? "",
      f.guidance?.ar ?? "",
      f.choiceFilter ?? "",
      f.appearance ?? "",
    ]);
  };

  const emit = (fields: Field[]) => {
    for (const f of fields) {
      if (f.type === "group" || f.type === "repeat") {
        surveyRow(f, f.type === "group" ? "begin_group" : "begin_repeat");
        emit(f.children ?? []);
        survey.push([f.type === "group" ? "end_group" : "end_repeat", f.id]);
        continue;
      }
      let type = TO_XLS[f.type];
      if (f.type === "select_one" || f.type === "select_multiple" || f.type === "rank") {
        const list = selectListName(f);
        type = `${TO_XLS[f.type]} ${list}`;
        for (const c of f.choices ?? []) {
          choices.push([list, c.value, c.label.ar, c.label.en, ...attrCols.map((k) => c.attrs?.[k] ?? "")]);
        }
      }
      surveyRow(f, type);
    }
  };
  emit(schema.fields);

  const settings: string[][] = [
    ["form_title", "form_id", "default_language"],
    [title, "afin_form", "Arabic (ar)"],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(survey), "survey");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(choices), "choices");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(settings), "settings");
  return wb;
}

export function downloadXlsform(schema: FormSchema, title: string): void {
  const wb = schemaToWorkbook(schema, title);
  XLSX.writeFile(wb, `${title || "form"}.xlsx`);
}

const KNOWN_CHOICE_COLS = new Set(["list_name", "listname", "name", "label"]);

function col(row: Record<string, unknown>, ...names: string[]): string {
  for (const n of names) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().replace(/\s+/g, "") === n.toLowerCase().replace(/\s+/g, "")) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      }
    }
  }
  return "";
}

function isLabelCol(key: string): boolean {
  return key.toLowerCase().startsWith("label");
}

export function workbookToSchema(wb: XLSX.WorkBook): FormSchema {
  const surveySheet = wb.Sheets["survey"];
  const choicesSheet = wb.Sheets["choices"];
  if (!surveySheet) return { fields: [] };

  const surveyRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(surveySheet, { defval: "" });
  const choiceRows = choicesSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(choicesSheet, { defval: "" }) : [];

  const choicesByList = new Map<string, Choice[]>();
  for (const r of choiceRows) {
    const list = col(r, "list_name", "listname");
    if (!list) continue;
    const value = col(r, "name");
    const ar = col(r, "label::Arabic (ar)", "label::arabic", "label", "label::ar");
    const en = col(r, "label::English (en)", "label::english", "label::en");
    const attrs: Record<string, string> = {};
    for (const key of Object.keys(r)) {
      const norm = key.toLowerCase().replace(/\s+/g, "");
      if (KNOWN_CHOICE_COLS.has(norm) || isLabelCol(key)) continue;
      const v = String(r[key] ?? "").trim();
      if (v) attrs[key.trim()] = v;
    }
    if (!choicesByList.has(list)) choicesByList.set(list, []);
    choicesByList.get(list)!.push({
      value: value || ar,
      label: { ar: ar || en, en: en || ar },
      ...(Object.keys(attrs).length ? { attrs } : {}),
    });
  }

  const root: Field[] = [];
  const stack: Field[][] = [root];
  const top = () => stack[stack.length - 1];

  for (const r of surveyRows) {
    const rawType = col(r, "type");
    if (!rawType) continue;
    const [base, listName] = rawType.split(/\s+/);

    if (base === "end_group" || base === "end_repeat") {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const ar = col(r, "label::Arabic (ar)", "label::arabic", "label", "label::ar");
    const en = col(r, "label::English (en)", "label::english", "label::en");
    const name = col(r, "name") || newFieldId("text");

    if (base === "begin_group" || base === "begin_repeat") {
      const container: Field = {
        id: name,
        type: base === "begin_group" ? "group" : "repeat",
        label: { ar: ar || en || name, en: en || ar || name },
        children: [],
      };
      const rel = col(r, "relevant");
      if (rel) container.relevant = rel;
      top().push(container);
      stack.push(container.children!);
      continue;
    }

    const type = FROM_XLS[base];
    if (!type) continue;

    const field: Field = {
      id: name,
      type,
      label: { ar: ar || en || name, en: en || ar || name },
      required: /^(yes|true|1)$/i.test(col(r, "required")),
    };
    const hintAr = col(r, "hint::Arabic (ar)", "hint", "hint::ar");
    if (hintAr) field.hint = { ar: hintAr, en: col(r, "hint::English (en)") || hintAr };
    const guidanceAr = col(r, "guidance_hint::Arabic (ar)", "guidance_hint", "guidance");
    if (guidanceAr) field.guidance = { ar: guidanceAr, en: col(r, "guidance_hint::English (en)") || guidanceAr };
    const relevant = col(r, "relevant");
    if (relevant) field.relevant = relevant;
    const constraint = col(r, "constraint");
    if (constraint) field.constraint = constraint;
    const calc = col(r, "calculation");
    if (calc) field.calculation = calc;
    const filter = col(r, "choice_filter");
    if (filter) field.choiceFilter = filter;
    const appearance = col(r, "appearance");
    if (appearance) {
      field.appearance = appearance;
      if (appearance.includes("signature") && type === "photo") field.type = "signature";
    }
    if ((type === "select_one" || type === "select_multiple" || type === "rank") && listName) {
      field.choices = choicesByList.get(listName) ?? [];
    }
    top().push(field);
  }

  return { fields: root };
}

export async function readXlsformFile(file: File): Promise<FormSchema> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return workbookToSchema(wb);
}
