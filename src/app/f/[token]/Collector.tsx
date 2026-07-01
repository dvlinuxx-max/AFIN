"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormSchema } from "@/lib/form-schema";
import type { Locale } from "@/lib/i18n";
import type { Answers } from "@/lib/expr";
import { FormFill } from "@/components/FormFill";
import { useI18n } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { enqueue, getDeviceId, pendingCount, syncQueue } from "@/lib/offline";
import { encryptAnswers } from "@/lib/crypto-client";

interface Props {
  token: string;
  title: string;
  description: string;
  schema: FormSchema;
  locale: Locale;
  requireGeo: boolean;
  encrypted?: boolean;
  publicKey?: string;
}

export function Collector({ token, title, description, schema, locale, requireGeo, encrypted, publicKey }: Props) {
  const { t } = useI18n();
  const [done, setDone] = useState<"online" | "offline" | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [queued, setQueued] = useState(0);
  const [formKey, setFormKey] = useState(0);

  const refreshQueue = useCallback(async () => {
    setQueued(await pendingCount());
  }, []);

  useEffect(() => {
    pendingCount().then(setQueued).catch(() => {});

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    async function goOnline() {
      setOnline(true);
      await syncQueue();
      await refreshQueue();
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (navigator.onLine) goOnline();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshQueue]);

  async function getGeo(): Promise<{ lat: number; lng: number } | undefined> {
    if (!requireGeo || !navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function onSubmit(answers: Answers) {
    setBusy(true);
    const clientId = crypto.randomUUID();
    const deviceId = getDeviceId();
    // Encrypted forms drop server-readable geo by design; the payload stays opaque.
    const geo = encrypted ? undefined : await getGeo();
    const enc = encrypted && publicKey ? await encryptAnswers(publicKey, answers) : undefined;
    const payload = enc
      ? { token, enc, clientId, deviceId }
      : { token, data: answers, clientId, deviceId, geo };

    if (navigator.onLine) {
      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setBusy(false);
          setDone("online");
          return;
        }
      } catch {
        // fall through to offline save
      }
    }

    await enqueue({ clientId, token, data: enc ? undefined : answers, enc, geo, deviceId, createdAt: Date.now() });
    await refreshQueue();
    setBusy(false);
    setDone("offline");
  }

  function again() {
    setDone(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <Logo size={22} />
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${online ? "bg-brand-100 text-brand-700" : "bg-gray-200 text-gray-600"}`}
          >
            {online ? t.collect.online : t.collect.offline}
          </span>
          <LanguageToggle />
        </div>
      </header>

      {queued > 0 && (
        <div className="bg-amber-50 text-amber-800 text-sm px-4 py-2 flex items-center justify-between">
          <span>
            {queued} {t.collect.pending}
          </span>
          <button
            className="font-semibold underline"
            onClick={async () => {
              await syncQueue();
              await refreshQueue();
            }}
          >
            {t.collect.syncNow}
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-xl mx-auto p-4">
        {done ? (
          <div className="card p-8 text-center space-y-3 mt-8">
            <div className="text-4xl">{done === "online" ? "✓" : "⤓"}</div>
            <h2 className="text-xl font-bold">{t.collect.thankYou}</h2>
            <p style={{ color: "var(--color-muted)" }}>
              {done === "online" ? t.collect.submitted : t.collect.offlineSaved}
            </p>
            <button className="btn btn-primary px-5 py-2.5" onClick={again}>
              {t.collect.another}
            </button>
          </div>
        ) : (
          <div className="card p-5 mt-4">
            <h1 className="text-xl font-bold mb-1">{title}</h1>
            {description && (
              <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
                {description}
              </p>
            )}
            <FormFill key={formKey} schema={schema} locale={locale} onSubmit={onSubmit} busy={busy} />
          </div>
        )}
      </main>
    </div>
  );
}
