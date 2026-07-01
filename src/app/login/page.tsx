"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/dashboard");
      router.refresh();
    } else {
      setError(t.auth.loginFailed);
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
          <h1 className="text-xl font-bold">{t.auth.loginTitle}</h1>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">{t.common.email}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
          </div>
          <div>
            <label className="label">{t.common.password}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
          </div>
          <button className="btn btn-primary w-full py-2.5" disabled={busy}>
            {busy ? t.common.loading : t.auth.login}
          </button>
          <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
            {t.auth.noAccount}{" "}
            <Link href="/register" className="text-brand-700 font-semibold">
              {t.auth.register}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
