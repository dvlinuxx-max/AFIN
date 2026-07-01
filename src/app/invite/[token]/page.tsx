import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { Logo } from "@/components/Logo";
import { AcceptInvite } from "./AcceptInvite";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { locale } = await getDict();

  const invite = await db.invite.findUnique({ where: { token }, include: { org: true } });

  const userId = await getUserId();
  if (!userId) redirect(`/login?next=/invite/${token}`);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {!invite || invite.acceptedAt ? (
          <div className="card p-6 text-center" style={{ color: "var(--color-muted)" }}>
            {locale === "ar" ? "الدعوة غير صالحة أو مستخدمة" : "Invite is invalid or already used"}
          </div>
        ) : (
          <AcceptInvite token={token} orgName={invite.org.name} role={ROLE_LABELS[invite.role as Role][locale]} />
        )}
      </main>
    </div>
  );
}
