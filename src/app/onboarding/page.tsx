"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function OnboardingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4">
        <Logo />
        <LanguageToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 space-y-4">
          <h1 className="text-xl font-bold">{t.auth.orgName}</h1>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="btn btn-primary w-full py-2.5" disabled={busy}>
            {busy ? t.common.loading : t.common.create}
          </button>
        </form>
      </main>
    </div>
  );
}
