import "server-only";
import { db } from "./db";
import type { FormSchema, Field, FieldType } from "./form-schema";
import { FIELD_TYPES, newFieldId } from "./form-schema";

interface AiConfig {
  provider: string;
  apiKey: string;
  model: string;
}

// Org-level settings override env defaults, so each organization can plug in its own key.
export async function aiConfig(orgId: string): Promise<AiConfig> {
  const rows = await db.setting.findMany({
    where: { orgId, key: { in: ["ai_provider", "ai_key", "ai_model"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    provider: map.ai_provider || process.env.AI_PROVIDER || "anthropic",
    apiKey: map.ai_key || process.env.AI_API_KEY || "",
    model: map.ai_model || process.env.AI_MODEL || "claude-opus-4-8",
  };
}

export async function aiConfigured(orgId: string): Promise<boolean> {
  const cfg = await aiConfig(orgId);
  return Boolean(cfg.apiKey);
}

const SYSTEM = `You design data-collection forms. Given a description, output ONLY valid JSON, no markdown, with this exact shape:
{"fields":[{"id":"snake_case_id","type":"<type>","label":{"ar":"عربي","en":"English"},"required":true|false,"choices":[{"value":"v","label":{"ar":"","en":""}}]}]}
Allowed types: ${FIELD_TYPES.join(", ")}.
Rules: every label has both ar and en. Use choices only for select_one/select_multiple/rank. For "group" and "repeat" put nested fields in a "children" array (use repeat for things collected many times, e.g. household members). Keep ids short, unique, ascii snake_case. 6-15 fields. Output JSON only.`;

async function callAnthropic(cfg: AiConfig, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(cfg: AiConfig, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model.startsWith("gpt") ? cfg.model : "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

interface RawField {
  id?: string;
  type?: string;
  label?: { ar?: string; en?: string } | string;
  required?: boolean;
  choices?: { value?: string; label?: { ar?: string; en?: string } | string }[];
  children?: RawField[];
}

function coerceField(f: RawField, seen: Set<string>): Field {
  const type: FieldType = FIELD_TYPES.includes(f.type as FieldType) ? (f.type as FieldType) : "text";
  let id = String(f.id || "").replace(/[^a-zA-Z0-9_]/g, "") || newFieldId(type);
  while (seen.has(id)) id = newFieldId(type);
  seen.add(id);

  const labelObj = typeof f.label === "object" ? f.label : undefined;
  const labelStr = typeof f.label === "string" ? f.label : "";
  const field: Field = {
    id,
    type,
    label: { ar: String(labelObj?.ar ?? labelStr), en: String(labelObj?.en ?? labelStr) },
    required: Boolean(f.required),
  };
  if ((type === "select_one" || type === "select_multiple" || type === "rank") && Array.isArray(f.choices)) {
    field.choices = f.choices.map((c, i) => {
      const cl = typeof c.label === "object" ? c.label : undefined;
      const cs = typeof c.label === "string" ? c.label : "";
      return { value: String(c.value ?? `opt${i + 1}`), label: { ar: String(cl?.ar ?? cs), en: String(cl?.en ?? cs) } };
    });
  }
  if ((type === "group" || type === "repeat") && Array.isArray(f.children)) {
    field.children = f.children.map((c) => coerceField(c, seen));
  }
  return field;
}

function coerceSchema(text: string): FormSchema {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end >= 0) raw = raw.slice(start, end + 1);

  const parsed = JSON.parse(raw);
  const inFields: RawField[] = Array.isArray(parsed.fields) ? parsed.fields : [];
  const seen = new Set<string>();
  return { fields: inFields.map((f) => coerceField(f, seen)) };
}

export async function generateForm(orgId: string, prompt: string, locale: string): Promise<FormSchema> {
  const cfg = await aiConfig(orgId);
  if (!cfg.apiKey) throw new Error("not_configured");

  const userPrompt = `${prompt}\n\n(Primary language: ${locale === "en" ? "English" : "Arabic"}. Still fill both ar and en labels.)`;
  const text = cfg.provider === "openai" ? await callOpenAI(cfg, userPrompt) : await callAnthropic(cfg, userPrompt);
  return coerceSchema(text);
}
