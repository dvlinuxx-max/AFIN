import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { dirFor, normalizeLocale, LOCALE_COOKIE } from "@/lib/i18n";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AFIN — منصة جمع البيانات الميدانية",
  description: "AFIN — منصة مفتوحة لتصميم النماذج وجمع البيانات الميدانية أونلاين وأوفلاين.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AFIN", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
