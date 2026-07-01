import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { bi } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import { NewFormButton } from "./NewFormButton";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const { t, locale } = await getDict();

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.org.id },
    include: {
      forms: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { submissions: true } } },
      },
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/projects" className="text-sm text-brand-700">
            ← {t.projects.title}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: project.color }} />
            {project.name}
          </h1>
        </div>
        {can(ctx.role, "form:write") && <NewFormButton projectId={project.id} />}
      </div>

      {project.forms.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>
          {t.forms.noForms}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {project.forms.map((f) => (
            <Link key={f.id} href={`/forms/${f.id}`} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{bi({ ar: f.title, en: f.titleEn || f.title }, locale)}</h3>
                <StatusBadge status={f.status} />
              </div>
              <div className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
                {f._count.submissions} {t.forms.submissions} · {t.forms.version} {f.version}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
