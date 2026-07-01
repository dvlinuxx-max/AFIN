"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

export default function Landing() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 max-w-6xl mx-auto w-full">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/login" className="btn btn-ghost px-4 py-1.5 text-sm">
            {t.auth.login}
          </Link>
          <Link href="/register" className="btn btn-primary px-4 py-1.5 text-sm">
            {t.auth.register}
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] opacity-70"
            style={{
              background: "radial-gradient(600px 300px at 50% 0%, color-mix(in srgb, var(--color-brand-500) 22%, transparent), transparent)",
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center py-16 sm:py-24">
            <div className={ar ? "text-right" : "text-left"}>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.1]">
                {ar ? "اجمع بياناتك الميدانية بثقة" : "Collect your field data with confidence"}
              </h1>
              <div className={`mt-8 flex items-center gap-3 ${ar ? "justify-end" : "justify-start"}`}>
                <Link href="/register" className="btn btn-primary px-6 py-3">
                  {ar ? "ابدأ مجاناً" : "Get started free"}
                </Link>
                <Link href="/login" className="btn btn-ghost px-6 py-3">
                  {t.auth.login}
                </Link>
              </div>
            </div>

            <HeroPreview ar={ar} />
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
        AFIN — {t.app.tagline}
      </footer>
    </div>
  );
}

// A decorative product preview: a form card and a small results panel, pure markup.
function HeroPreview({ ar }: { ar: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-md" dir={ar ? "rtl" : "ltr"}>
      <div className="card p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Logo mark size={22} />
          <div className="h-2.5 w-24 rounded-full" style={{ background: "var(--color-border)" }} />
        </div>
        <div className="space-y-3">
          <Line w="w-40" label={ar ? "الاسم" : "Name"} />
          <div>
            <div className="mb-1.5 h-2 w-20 rounded-full" style={{ background: "var(--color-border)" }} />
            <div className="flex gap-2">
              <Pill active>{ar ? "بغداد" : "Baghdad"}</Pill>
              <Pill>{ar ? "البصرة" : "Basra"}</Pill>
              <Pill>{ar ? "أربيل" : "Erbil"}</Pill>
            </div>
          </div>
          <Line w="w-28" label={ar ? "العمر" : "Age"} />
          <div className="h-9 rounded-lg" style={{ background: "var(--color-brand-600)" }} />
        </div>
      </div>

      <div className="card absolute -bottom-6 -start-6 w-44 p-3 shadow-lg hidden sm:block">
        <div className="mb-2 h-2 w-16 rounded-full" style={{ background: "var(--color-border)" }} />
        <div className="flex items-end gap-1.5 h-16">
          {[40, 70, 55, 90, 65].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "var(--color-brand-500)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Line({ w, label }: { w: string; label: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold">{label}</div>
      <div className={`h-9 rounded-lg border ${w}`} style={{ borderColor: "var(--color-border)" }} />
    </div>
  );
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold border"
      style={
        active
          ? { background: "var(--color-brand-50)", color: "var(--color-brand-700)", borderColor: "var(--color-brand-200)" }
          : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
      }
    >
      {children}
    </span>
  );
}
