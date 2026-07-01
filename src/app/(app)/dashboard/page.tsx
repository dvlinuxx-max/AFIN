import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { bi } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const { t, locale } = await getDict();
  const orgId = ctx.org.id;

  const [projectCount, formCount, memberCount, submissionCount, recentForms] = await Promise.all([
    db.project.count({ where: { orgId } }),
    db.form.count({ where: { project: { orgId } } }),
    db.membership.count({ where: { orgId } }),
    db.submission.count({ where: { form: { project: { orgId } } } }),
    db.form.findMany({
      where: { project: { orgId } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { project: true, _count: { select: { submissions: true } } },
    }),
  ]);

  const stats = [
    { label: t.dashboard.totalProjects, value: projectCount },
    { label: t.dashboard.totalForms, value: formCount },
    { label: t.dashboard.totalSubmissions, value: submissionCount },
    { label: t.dashboard.members, value: memberCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t.dashboard.welcome}، {ctx.user.name}
        </h1>
        <p style={{ color: "var(--color-muted)" }}>{ctx.org.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-3xl font-extrabold text-brand-700">{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">{t.dashboard.recentForms}</h2>
          <Link href="/projects" className="text-sm text-brand-700 font-semibold">
            {t.nav.projects}
          </Link>
        </div>
        {recentForms.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>{t.forms.noForms}</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {recentForms.map((f) => {
              const title = bi({ ar: f.title, en: f.titleEn || f.title }, locale);
              return (
                <li key={f.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/forms/${f.id}`} className="font-semibold hover:text-brand-700 truncate block">
                      {title}
                    </Link>
                    <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                      {f.project.name}
                    </div>
                  </div>
                  <div className="text-sm whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                    {f._count.submissions} {t.forms.submissions}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
