"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { Modal } from "@/components/Modal";

const COLORS = ["#059669", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];

export function NewProjectButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, color }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    }
  }

  return (
    <>
      <button className="btn btn-primary px-4 py-2" onClick={() => setOpen(true)}>
        {t.projects.newProject}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.projects.newProject}>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">{t.projects.projectName}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">{t.common.description}</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.projects.color}</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2"
                  style={{ background: c, borderColor: color === c ? "#111" : "transparent" }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost px-4 py-2" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-primary px-4 py-2" disabled={busy || !name}>
              {busy ? t.common.saving : t.common.create}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
