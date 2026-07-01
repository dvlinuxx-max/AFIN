"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/rbac";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  isSelf: boolean;
}
interface Invite {
  id: string;
  email: string;
  role: Role;
  token: string;
}

export function MembersManager({
  members,
  invites,
  canManage,
  isOwner,
}: {
  members: Member[];
  invites: Invite[];
  canManage: boolean;
  isOwner: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("collector");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const roleOptions = ROLES.filter((r) => isOwner || r !== "owner");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setLink(`${window.location.origin}/invite/${data.token}`);
      setEmail("");
      router.refresh();
    }
  }

  async function changeRole(id: string, newRole: Role) {
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    if (!confirm(t.members.removeMember + "?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function cancelInvite(id: string) {
    const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <form onSubmit={invite} className="card p-4 space-y-3">
          <h2 className="font-bold">{t.members.invite}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[200px]"
              type="email"
              placeholder={t.members.inviteEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
            <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r][locale]}
                </option>
              ))}
            </select>
            <button className="btn btn-primary px-4 py-2" disabled={busy}>
              {t.members.invite}
            </button>
          </div>
          {link && (
            <div className="flex gap-2 items-center">
              <input className="input flex-1" value={link} readOnly dir="ltr" />
              <button type="button" className="btn btn-ghost px-3 py-2" onClick={() => navigator.clipboard.writeText(link)}>
                {t.common.copy}
              </button>
            </div>
          )}
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <th className="text-start p-3 font-semibold">{t.common.name}</th>
              <th className="text-start p-3 font-semibold">{t.common.email}</th>
              <th className="text-start p-3 font-semibold">{t.members.role}</th>
              {canManage && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <td className="p-3 font-semibold">
                  {m.name} {m.isSelf && <span className="text-xs text-brand-700">({t.members.you})</span>}
                </td>
                <td className="p-3" dir="ltr" style={{ color: "var(--color-muted)" }}>
                  {m.email}
                </td>
                <td className="p-3">
                  {canManage && !m.isSelf && (isOwner || m.role !== "owner") ? (
                    <select
                      className="input py-1 w-36"
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r][locale]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    ROLE_LABELS[m.role][locale]
                  )}
                </td>
                {canManage && (
                  <td className="p-3 text-end">
                    {!m.isSelf && (isOwner || m.role !== "owner") && (
                      <button className="text-red-600" onClick={() => remove(m.id)}>
                        {t.common.remove}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && invites.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold mb-2">{t.members.pending}</h3>
          <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {invites.map((inv) => (
              <li key={inv.id} className="py-2 flex items-center justify-between gap-2">
                <span dir="ltr">{inv.email}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {ROLE_LABELS[inv.role][locale]}
                  </span>
                  <button
                    className="text-brand-700 text-sm"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`)}
                  >
                    {t.members.inviteLink}
                  </button>
                  <button className="text-red-600 text-sm" onClick={() => cancelInvite(inv.id)}>
                    {t.common.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
