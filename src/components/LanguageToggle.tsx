"use client";

import { useI18n } from "./I18nProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, switchLocale } = useI18n();
  return (
    <button
      type="button"
      onClick={() => switchLocale(locale === "ar" ? "en" : "ar")}
      className={`btn btn-ghost px-3 py-1.5 text-sm ${className}`}
      aria-label="Switch language"
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
