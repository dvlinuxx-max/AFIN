"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

export function AcceptInvite({ token, orgName, role }: { token: string; orgName: string; role: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="card p-6 max-w-sm w-full text-center space-y-4">
      <h1 className="text-xl font-bold">{orgName}</h1>
      <p style={{ color: "var(--color-muted)" }}>
        {locale === "ar" ? `تمت دعوتك كـ ${role}` : `You were invited as ${role}`}
      </p>
      <button className="btn btn-primary w-full py-2.5" onClick={accept} disabled={busy}>
        {busy ? t.common.loading : locale === "ar" ? "قبول الانضمام" : "Accept and join"}
      </button>
    </div>
  );
}
