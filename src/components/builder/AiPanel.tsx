"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useI18n } from "@/components/I18nProvider";
import type { FormSchema } from "@/lib/form-schema";

export function AiPanel({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (schema: FormSchema, mode: "replace" | "append") => void;
}) {
  const { t, locale } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FormSchema | null>(null);

  async function generate() {
    setBusy(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, locale }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "not_configured" ? t.ai.notConfigured : t.ai.error);
      return;
    }
    const data = await res.json();
    setResult(data.schema as FormSchema);
  }

  return (
    <Modal open={open} onClose={onClose} title={t.ai.title}>
      <div className="space-y-3">
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {t.ai.prompt}
        </p>
        <textarea
          className="input"
          rows={4}
          placeholder={t.ai.promptPlaceholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
            {result.fields.length} {locale === "ar" ? "حقل تم توليده" : "fields generated"}
          </div>
        )}
        <div className="flex justify-between gap-2 pt-1">
          <button className="btn btn-ghost px-4 py-2" onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? t.ai.generating : t.ai.generate}
          </button>
          {result && (
            <div className="flex gap-2">
              <button className="btn btn-ghost px-3 py-2" onClick={() => { onApply(result, "append"); onClose(); }}>
                {t.common.add}
              </button>
              <button className="btn btn-primary px-3 py-2" onClick={() => { onApply(result, "replace"); onClose(); }}>
                {t.ai.apply}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
