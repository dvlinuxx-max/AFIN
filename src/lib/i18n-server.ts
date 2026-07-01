import "server-only";
import { cookies } from "next/headers";
import { dictionaries, normalizeLocale, LOCALE_COOKIE, type Locale, type Dict } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
