import Link from "next/link";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { NewProjectButton } from "./NewProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const ctx = await requireContext();
  const { t } = await getDict();

  const projects = await db.project.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { forms: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.projects.title}</h1>
        {can(ctx.role, "project:write") && <NewProjectButton />}
      </div>

      {projects.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>
          {t.projects.noProjects}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                <h3 className="font-bold truncate">{p.name}</h3>
              </div>
              {p.description && (
                <p className="mt-2 text-sm line-clamp-2" style={{ color: "var(--color-muted)" }}>
                  {p.description}
                </p>
              )}
              <div className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
                {p._count.forms} {t.projects.forms}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
