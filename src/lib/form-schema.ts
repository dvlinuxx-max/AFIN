// Shape of a form definition. Stored as JSON in Form.schemaJson and rendered both
// in the builder and the collection view.

export type FieldType =
  | "text"
  | "paragraph"
  | "number"
  | "decimal"
  | "email"
  | "phone"
  | "select_one"
  | "select_multiple"
  | "rank"
  | "date"
  | "time"
  | "datetime"
  | "rating"
  | "range"
  | "geopoint"
  | "photo"
  | "audio"
  | "video"
  | "file"
  | "signature"
  | "barcode"
  | "note"
  | "calculate"
  | "group"
  | "repeat";

export interface Bilingual {
  ar: string;
  en: string;
}

export interface Choice {
  value: string;
  label: Bilingual;
  // Arbitrary attributes a cascading filter can match against (e.g. { country: "iq" }).
  attrs?: Record<string, string>;
}

export interface Field {
  id: string;
  type: FieldType;
  label: Bilingual;
  hint?: Bilingual;
  // Longer help text shown under the hint (XLSForm "guidance_hint").
  guidance?: Bilingual;
  required?: boolean;
  requiredMessage?: Bilingual;
  choices?: Choice[];
  // Cascading select: a boolean expression over choice attrs (as `attr`) and answers (${field}).
  choiceFilter?: string;
  // Rendering hint, mirrors XLSForm "appearance" (e.g. minimal, likert, multiline, map).
  appearance?: string;
  // Skip logic: a JS-like boolean expression over earlier answers, e.g. ${age} >= 18
  relevant?: string;
  // Validation: a JS-like boolean expression over `.` (this field's value)
  constraint?: string;
  constraintMessage?: Bilingual;
  // For calculate fields: expression evaluated from other answers
  calculation?: string;
  min?: number;
  max?: number;
  step?: number;
  maxRating?: number;
  defaultValue?: string;
  // Nested fields for group / repeat containers.
  children?: Field[];
  // Repeat bounds (optional). repeatCount fixes the instance count from an expression.
  repeatCount?: string;
  minRepeat?: number;
  maxRepeat?: number;
}

export interface FormSchema {
  fields: Field[];
}

// Field types that hold nested children.
export const CONTAINER_TYPES: FieldType[] = ["group", "repeat"];

export function isContainer(type: FieldType): boolean {
  return type === "group" || type === "repeat";
}

// Field types whose answer is a base64 data URL (encrypt/skip-in-charts aware).
export const MEDIA_TYPES: FieldType[] = ["photo", "audio", "video", "file", "signature"];

export function isMedia(type: FieldType): boolean {
  return MEDIA_TYPES.includes(type);
}

export const FIELD_TYPES: FieldType[] = [
  "text",
  "paragraph",
  "number",
  "decimal",
  "email",
  "phone",
  "select_one",
  "select_multiple",
  "rank",
  "date",
  "time",
  "datetime",
  "rating",
  "range",
  "geopoint",
  "photo",
  "audio",
  "video",
  "file",
  "signature",
  "barcode",
  "note",
  "calculate",
  "group",
  "repeat",
];

export const FIELD_LABELS: Record<FieldType, Bilingual> = {
  text: { ar: "نص قصير", en: "Short text" },
  paragraph: { ar: "فقرة", en: "Paragraph" },
  number: { ar: "رقم صحيح", en: "Integer" },
  decimal: { ar: "رقم عشري", en: "Decimal" },
  email: { ar: "بريد إلكتروني", en: "Email" },
  phone: { ar: "هاتف", en: "Phone" },
  select_one: { ar: "اختيار واحد", en: "Single choice" },
  select_multiple: { ar: "اختيار متعدد", en: "Multiple choice" },
  rank: { ar: "ترتيب", en: "Rank" },
  date: { ar: "تاريخ", en: "Date" },
  time: { ar: "وقت", en: "Time" },
  datetime: { ar: "تاريخ ووقت", en: "Date & time" },
  rating: { ar: "تقييم", en: "Rating" },
  range: { ar: "نطاق", en: "Range" },
  geopoint: { ar: "موقع جغرافي", en: "GPS location" },
  photo: { ar: "صورة", en: "Photo" },
  audio: { ar: "تسجيل صوتي", en: "Audio" },
  video: { ar: "فيديو", en: "Video" },
  file: { ar: "ملف", en: "File" },
  signature: { ar: "توقيع", en: "Signature" },
  barcode: { ar: "باركود", en: "Barcode" },
  note: { ar: "ملاحظة", en: "Note" },
  calculate: { ar: "حقل محسوب", en: "Calculated" },
  group: { ar: "مجموعة", en: "Group" },
  repeat: { ar: "مجموعة متكررة", en: "Repeat group" },
};

export function hasChoices(type: FieldType): boolean {
  return type === "select_one" || type === "select_multiple" || type === "rank";
}

export function emptySchema(): FormSchema {
  return { fields: [] };
}

export function parseSchema(raw: string | null | undefined): FormSchema {
  if (!raw) return emptySchema();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.fields)) return parsed as FormSchema;
  } catch {
    // fall through
  }
  return emptySchema();
}

let counter = 0;
export function newFieldId(type: FieldType): string {
  counter += 1;
  const stamp = Date.now().toString(36).slice(-4);
  return `${type}_${stamp}${counter}`;
}

// Depth-first walk over every field including nested children.
export function walkFields(fields: Field[], visit: (f: Field, parent: Field | null) => void, parent: Field | null = null): void {
  for (const f of fields) {
    visit(f, parent);
    if (f.children?.length) walkFields(f.children, visit, f);
  }
}

// Every non-container leaf field, flattened (used for export columns, charts, etc).
export function leafFields(fields: Field[]): Field[] {
  const out: Field[] = [];
  walkFields(fields, (f) => {
    if (!isContainer(f.type)) out.push(f);
  });
  return out;
}

// Flatten for tabular display: groups become transparent, repeats stay as a single
// summary field, notes are dropped. Repeat children are not expanded here.
export function displayFields(fields: Field[]): Field[] {
  const out: Field[] = [];
  for (const f of fields) {
    if (f.type === "note") continue;
    if (f.type === "group") out.push(...displayFields(f.children ?? []));
    else out.push(f);
  }
  return out;
}

// Find a field anywhere in the tree by id.
export function findField(fields: Field[], id: string): Field | null {
  let found: Field | null = null;
  walkFields(fields, (f) => {
    if (f.id === id) found = f;
  });
  return found;
}
