import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getDict } from "@/lib/i18n-server";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/rbac";
import { MembersManager } from "./MembersManager";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const ctx = await requireContext();
  if (!can(ctx.role, "members:manage")) redirect("/dashboard");
  const { t } = await getDict();

  const [rawMembers, invites] = await Promise.all([
    db.membership.findMany({ where: { orgId: ctx.org.id }, include: { user: true }, orderBy: { role: "asc" } }),
    db.invite.findMany({ where: { orgId: ctx.org.id, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);

  const members = rawMembers.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role as Role,
    isSelf: m.userId === ctx.user.id,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.members.title}</h1>
      <MembersManager
        members={members}
        invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role as Role, token: i.token }))}
        canManage={can(ctx.role, "members:manage")}
        isOwner={ctx.role === "owner"}
      />
    </div>
  );
}
