"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

interface Props {
  orgName: string;
  provider: string;
  model: string;
  hasKey: boolean;
}

export function SettingsForm({ orgName, provider, model, hasKey }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [prov, setProv] = useState(provider || "anthropic");
  const [mdl, setMdl] = useState(model);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const body: Record<string, string> = { name, ai_provider: prov, ai_model: mdl };
    if (key.trim()) body.ai_key = key.trim();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setKey("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-lg">
      <div className="card p-4 space-y-3">
        <h2 className="font-bold">{t.settings.organization}</h2>
        <div>
          <label className="label">{t.auth.orgName}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-bold">{t.settings.aiSettings}</h2>
        <div>
          <label className="label">{t.settings.aiProvider}</label>
          <select className="input" value={prov} onChange={(e) => setProv(e.target.value)}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div>
          <label className="label">{t.settings.aiModel}</label>
          <input
            className="input"
            dir="ltr"
            placeholder={prov === "openai" ? "gpt-4o-mini" : "claude-opus-4-8"}
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t.settings.aiKey}</label>
          <input
            className="input"
            type="password"
            dir="ltr"
            placeholder={hasKey ? "••••••••" : ""}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            {t.settings.aiKeyHint}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary px-5 py-2.5" disabled={busy}>
          {busy ? t.common.saving : t.settings.save}
        </button>
        {saved && <span className="text-brand-600 text-sm">{t.common.saved}</span>}
        <span className="sr-only">{locale}</span>
      </div>
    </form>
  );
}
