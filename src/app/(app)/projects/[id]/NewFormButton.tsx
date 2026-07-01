"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { bi } from "@/lib/i18n";
import { Modal } from "@/components/Modal";
import { TEMPLATES } from "@/lib/templates";

export function NewFormButton({ projectId }: { projectId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, titleEn, templateId: templateId || undefined }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/forms/${data.id}/build`);
    }
  }

  function pickTemplate(id: string) {
    setTemplateId(id);
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (tpl && !title) {
      setTitle(tpl.title.ar);
      setTitleEn(tpl.title.en);
    }
  }

  return (
    <>
      <button className="btn btn-primary px-4 py-2" onClick={() => setOpen(true)}>
        {t.forms.newForm}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.forms.newForm}>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">{t.forms.formTitle}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">{t.forms.formTitleEn}</label>
            <input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="label">{t.builder.templates}</label>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-auto">
              <button
                type="button"
                onClick={() => setTemplateId("")}
                className={`text-start rounded-lg border p-2 text-sm ${templateId === "" ? "border-brand-500 bg-brand-50" : ""}`}
                style={{ borderColor: templateId === "" ? undefined : "var(--color-border)" }}
              >
                {locale === "ar" ? "نموذج فارغ" : "Blank form"}
              </button>
              {TEMPLATES.map((tpl) => (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => pickTemplate(tpl.id)}
                  className={`text-start rounded-lg border p-2 text-sm ${templateId === tpl.id ? "border-brand-500 bg-brand-50" : ""}`}
                  style={{ borderColor: templateId === tpl.id ? undefined : "var(--color-border)" }}
                >
                  <div className="font-semibold">{bi(tpl.title, locale)}</div>
                  <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {bi(tpl.description, locale)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost px-4 py-2" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-primary px-4 py-2" disabled={busy || !title}>
              {busy ? t.common.saving : t.common.create}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
