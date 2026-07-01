"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useI18n } from "@/components/I18nProvider";
import { generateFormKeys } from "@/lib/crypto-client";

interface Props {
  formId: string;
  shareToken: string;
  status: string;
  allowAnonymous: boolean;
  requireGeo: boolean;
  encrypted: boolean;
  canWrite: boolean;
}

export function FormControls({ formId, shareToken, status, allowAnonymous, requireGeo, encrypted, canWrite }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const url = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/f/${shareToken}` : ""),
    [shareToken],
  );
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(allowAnonymous);
  const [geo, setGeo] = useState(requireGeo);
  const [encBusy, setEncBusy] = useState(false);

  async function enableEncryption() {
    const pass = window.prompt(
      locale === "ar"
        ? "اختر كلمة مرور للتشفير. ستحتاجها لفك تشفير البيانات لاحقاً، ولا يمكن استرجاعها إذا فُقدت."
        : "Choose an encryption passphrase. You will need it to decrypt data later; it cannot be recovered if lost.",
    );
    if (!pass) return;
    const confirmPass = window.prompt(locale === "ar" ? "أعد إدخال كلمة المرور للتأكيد" : "Re-enter the passphrase to confirm");
    if (confirmPass !== pass) {
      alert(locale === "ar" ? "كلمتا المرور غير متطابقتين" : "Passphrases do not match");
      return;
    }
    setEncBusy(true);
    try {
      const keys = await generateFormKeys(pass);
      await patch({ encrypted: true, ...keys });
    } finally {
      setEncBusy(false);
    }
  }

  useEffect(() => {
    if (url) QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQr).catch(() => {});
  }, [url]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="card p-4 flex flex-wrap items-center gap-2">
          {status !== "deployed" && (
            <button className="btn btn-primary px-4 py-2" disabled={busy} onClick={() => patch({ status: "deployed" })}>
              {t.forms.deploy}
            </button>
          )}
          {status === "deployed" && (
            <button className="btn btn-ghost px-4 py-2" disabled={busy} onClick={() => patch({ status: "closed" })}>
              {t.forms.close}
            </button>
          )}
          {status === "closed" && (
            <button className="btn btn-primary px-4 py-2" disabled={busy} onClick={() => patch({ status: "deployed" })}>
              {t.forms.reopen}
            </button>
          )}
        </div>
      )}

      {status === "deployed" && (
        <div className="card p-4">
          <h3 className="font-bold mb-1">{t.forms.shareLink}</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-muted)" }}>
            {t.forms.shareDesc}
          </p>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" value={url} readOnly dir="ltr" />
            <button className="btn btn-ghost px-3 py-2 whitespace-nowrap" onClick={copy}>
              {copied ? t.common.copied : t.common.copy}
            </button>
            <a className="btn btn-ghost px-3 py-2 whitespace-nowrap" href={url} target="_blank" rel="noreferrer">
              {t.common.open}
            </a>
          </div>
          {qr && (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" width={180} height={180} />
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                {t.forms.qrcode}
              </span>
            </div>
          )}
        </div>
      )}

      {canWrite && (
        <div className="card p-4 space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t.forms.allowAnonymous}</span>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => {
                setAnon(e.target.checked);
                patch({ allowAnonymous: e.target.checked });
              }}
              className="w-5 h-5 accent-[var(--color-brand-600)]"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t.forms.requireGeo}</span>
            <input
              type="checkbox"
              checked={geo}
              onChange={(e) => {
                setGeo(e.target.checked);
                patch({ requireGeo: e.target.checked });
              }}
              className="w-5 h-5 accent-[var(--color-brand-600)]"
            />
          </label>

          <div className="border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            {encrypted ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-brand-700">
                  {locale === "ar" ? "التشفير مفعّل (شامل من الطرف للطرف)" : "Encryption enabled (end-to-end)"}
                </span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {locale === "ar" ? "تحتاج كلمة المرور لفك البيانات" : "Passphrase required to read data"}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{locale === "ar" ? "تشفير الردود" : "Encrypt submissions"}</span>
                  <button className="btn btn-ghost px-3 py-1.5 text-sm" disabled={encBusy} onClick={enableEncryption}>
                    {encBusy ? "…" : locale === "ar" ? "تفعيل" : "Enable"}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {locale === "ar"
                    ? "يشفّر كل رد في متصفح المستجيب بمفتاح عام. لا يمكن تفعيله بعد وجود ردود، وتفقد التحليلات والخرائط على الخادم."
                    : "Each response is encrypted in the respondent's browser. Cannot be enabled after submissions exist; server-side analytics and maps are disabled."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
