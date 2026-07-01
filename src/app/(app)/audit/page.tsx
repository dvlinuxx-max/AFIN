import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  create: { ar: "إنشاء", en: "Create" },
  update: { ar: "تعديل", en: "Update" },
  delete: { ar: "حذف", en: "Delete" },
  status: { ar: "تغيير حالة", en: "Status change" },
  role: { ar: "تغيير دور", en: "Role change" },
  invite: { ar: "دعوة", en: "Invite" },
  join: { ar: "انضمام", en: "Join" },
  remove: { ar: "إزالة", en: "Remove" },
  register: { ar: "تسجيل", en: "Register" },
  seed: { ar: "تهيئة", en: "Seed" },
};

export default async function AuditPage() {
  const ctx = await requireContext();
  if (!can(ctx.role, "members:manage")) redirect("/dashboard");
  const { t, locale } = await getDict();

  const logs = await db.auditLog.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.nav.audit}</h1>
      {logs.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>
          {t.common.empty}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-start p-3 font-semibold whitespace-nowrap">{t.common.date}</th>
                <th className="text-start p-3 font-semibold">{t.common.name}</th>
                <th className="text-start p-3 font-semibold">{t.common.actions}</th>
                <th className="text-start p-3 font-semibold">{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-3 whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                    {new Date(l.createdAt).toLocaleString(locale === "ar" ? "ar" : "en")}
                  </td>
                  <td className="p-3">{l.user?.name ?? "—"}</td>
                  <td className="p-3">{ACTION_LABELS[l.action]?.[locale] ?? l.action}</td>
                  <td className="p-3" style={{ color: "var(--color-muted)" }}>
                    {l.entityType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
