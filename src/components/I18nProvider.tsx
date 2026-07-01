"use client";

import { createContext, useContext, useCallback } from "react";
import { dictionaries, dirFor, type Dict, type Locale, LOCALE_COOKIE } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dict;
  switchLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const switchLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }, []);

  const value: I18nValue = {
    locale,
    dir: dirFor(locale),
    t: dictionaries[locale],
    switchLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
