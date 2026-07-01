"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

interface Org {
  id: string;
  name: string;
  role: string;
}

export function OrgSwitcher({ current, orgs }: { current: { id: string; name: string; role: Role }; orgs: Org[] }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function switchTo(orgId: string) {
    if (orgId === current.id) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    setBusy(false);
    setOpen(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function createOrg() {
    const name = window.prompt(locale === "ar" ? "اسم المنظمة الجديدة" : "New organization name");
    if (!name?.trim()) return;
    setBusy(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.id) {
      await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: data.id }),
      });
      setBusy(false);
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-start hover:bg-[var(--color-bg)] transition-colors"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="inline-flex w-7 h-7 items-center justify-center rounded-md text-xs font-bold text-white shrink-0"
          style={{ background: "var(--color-brand-600)" }}
        >
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{current.name}</span>
          <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
            {ROLE_LABELS[current.role][locale]}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute z-40 mt-1 w-full rounded-lg border bg-[var(--color-surface)] shadow-lg py-1"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="px-3 py-1 text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
            {locale === "ar" ? "المنظمات" : "Organizations"}
          </div>
          <div className="max-h-64 overflow-auto">
            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => switchTo(o.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-start text-sm hover:bg-[var(--color-bg)]"
              >
                <span
                  className="inline-flex w-6 h-6 items-center justify-center rounded text-[10px] font-bold text-white shrink-0"
                  style={{ background: "var(--color-brand-600)" }}
                >
                  {o.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.id === current.id && <span className="text-brand-700">✓</span>}
              </button>
            ))}
          </div>
          <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
          <button
            type="button"
            onClick={createOrg}
            className="w-full px-3 py-2 text-start text-sm font-semibold text-brand-700 hover:bg-[var(--color-bg)]"
          >
            + {locale === "ar" ? "منظمة جديدة" : "New organization"}
          </button>
        </div>
      )}
    </div>
  );
}
