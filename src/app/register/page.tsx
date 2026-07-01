"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", orgName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError(t.auth.weakPassword);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, locale }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "email_taken" ? t.auth.emailTaken : t.auth.weakPassword);
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
          <h1 className="text-xl font-bold">{t.auth.registerTitle}</h1>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">{t.auth.fullName}</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">{t.auth.orgName}</label>
            <input className="input" value={form.orgName} onChange={(e) => set("orgName", e.target.value)} required />
          </div>
          <div>
            <label className="label">{t.common.email}</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required dir="ltr" />
          </div>
          <div>
            <label className="label">{t.common.password}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required dir="ltr" />
          </div>
          <button className="btn btn-primary w-full py-2.5" disabled={busy}>
            {busy ? t.common.loading : t.auth.register}
          </button>
          <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="text-brand-700 font-semibold">
              {t.auth.login}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
