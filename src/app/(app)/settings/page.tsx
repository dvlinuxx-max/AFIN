import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireContext();
  if (!can(ctx.role, "org:manage")) redirect("/dashboard");
  const { t } = await getDict();

  const rows = await db.setting.findMany({
    where: { orgId: ctx.org.id, key: { in: ["ai_provider", "ai_model", "ai_key"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>
      <SettingsForm
        orgName={ctx.org.name}
        provider={map.ai_provider ?? "anthropic"}
        model={map.ai_model ?? ""}
        hasKey={Boolean(map.ai_key)}
      />
    </div>
  );
}
