"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { FormSchema } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import { exportCsv, exportExcel, type ExportSubmission } from "@/lib/export";
import { decryptSubmission, unwrapPrivateKey } from "@/lib/crypto-client";
import { useI18n } from "@/components/I18nProvider";
import { SubmissionsTable } from "./SubmissionsTable";
import { DataCharts } from "./DataCharts";

interface FormKeys {
  privKeyEnc: string;
  keySalt: string;
  keyIv: string;
}

const DataMap = dynamic(() => import("./DataMap"), {
  ssr: false,
  loading: () => <div className="card p-10 text-center">…</div>,
});

interface Props {
  formId: string;
  formTitle: string;
  schema: FormSchema;
  initialSubmissions: ExportSubmission[];
  locale: Locale;
  canDelete: boolean;
  canExport: boolean;
  encrypted?: boolean;
  formKeys?: FormKeys;
}

type Tab = "table" | "charts" | "map";

export function DataView({ formId, formTitle, schema, initialSubmissions, locale, canDelete, canExport, encrypted, formKeys }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("table");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [locked, setLocked] = useState(!!encrypted);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState("");

  const hasGeo = useMemo(() => submissions.some((s) => s.geoLat !== null), [submissions]);

  async function unlock(passphrase: string) {
    if (!formKeys) return;
    setDecrypting(true);
    setDecryptError("");
    try {
      const privateKey = await unwrapPrivateKey(formKeys, passphrase);
      const next = await Promise.all(
        submissions.map(async (s) => {
          if (!s.enc) return s;
          try {
            const data = await decryptSubmission(privateKey, s.enc);
            const geo = Object.values(data).find(
              (v): v is { lat: number; lng: number } =>
                !!v && typeof v === "object" && typeof (v as { lat?: unknown }).lat === "number",
            );
            return { ...s, data, geoLat: geo?.lat ?? null, geoLng: geo?.lng ?? null };
          } catch {
            return s;
          }
        }),
      );
      setSubmissions(next);
      setLocked(false);
    } catch {
      setDecryptError(locale === "ar" ? "كلمة المرور غير صحيحة" : "Wrong passphrase");
    } finally {
      setDecrypting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "table", label: t.data.table },
    { id: "charts", label: t.data.charts },
    ...(hasGeo ? [{ id: "map" as Tab, label: t.data.map }] : []),
  ];

  function onDelete(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/forms/${formId}`} className="text-sm text-brand-700">
            ← {formTitle}
          </Link>
          <h1 className="text-2xl font-bold">{t.data.title}</h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {submissions.length} {t.forms.submissions}
          </p>
        </div>
        {canExport && submissions.length > 0 && !locked && (
          <div className="flex gap-2">
            <button className="btn btn-ghost px-3 py-2 text-sm" onClick={() => exportCsv(schema, submissions, locale, formTitle)}>
              {t.data.exportCsv}
            </button>
            <button className="btn btn-ghost px-3 py-2 text-sm" onClick={() => exportExcel(schema, submissions, locale, formTitle)}>
              {t.data.exportExcel}
            </button>
          </div>
        )}
      </div>

      {locked && (
        <form
          className="card p-6 max-w-md mx-auto space-y-3 text-center"
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem("pass") as HTMLInputElement)?.value;
            if (input) unlock(input);
          }}
        >
          <h2 className="font-bold">{locale === "ar" ? "بيانات مشفّرة" : "Encrypted data"}</h2>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {locale === "ar"
              ? "أدخل كلمة مرور التشفير لفك البيانات في متصفحك. لا تُرسل كلمة المرور للخادم."
              : "Enter the encryption passphrase to decrypt the data in your browser. The passphrase is never sent to the server."}
          </p>
          <input name="pass" type="password" className="input" dir="ltr" autoComplete="off" placeholder="passphrase" />
          {decryptError && <p className="text-xs text-red-600">{decryptError}</p>}
          <button type="submit" className="btn btn-primary w-full py-2.5" disabled={decrypting}>
            {decrypting ? "…" : locale === "ar" ? "فك التشفير" : "Decrypt"}
          </button>
        </form>
      )}

      {!locked && (
        <>
          <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-border)" }}>
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
                  tab === tb.id ? "border-brand-600 text-brand-700" : "border-transparent"
                }`}
                style={tab === tb.id ? {} : { color: "var(--color-muted)" }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {tab === "table" && (
            <SubmissionsTable schema={schema} submissions={submissions} locale={locale} canDelete={canDelete} onDelete={onDelete} />
          )}
          {tab === "charts" && <DataCharts schema={schema} submissions={submissions} locale={locale} />}
          {tab === "map" && <DataMap submissions={submissions} locale={locale} />}
        </>
      )}
    </div>
  );
}
