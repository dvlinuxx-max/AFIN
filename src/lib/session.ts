import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";
import { db } from "./db";
import type { Role } from "./rbac";

const ORG_COOKIE = "afin_org";

export interface AppContext {
  user: { id: string; name: string; email: string; locale: string };
  org: { id: string; name: string; slug: string };
  role: Role;
  orgs: { id: string; name: string; role: string }[];
}

// Server-side gate: returns the active context or redirects to /login.
export async function requireContext(): Promise<AppContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length === 0) redirect("/onboarding");

  const store = await cookies();
  const wanted = store.get(ORG_COOKIE)?.value;
  const active =
    user.memberships.find((m) => m.orgId === wanted) ?? user.memberships[0];

  return {
    user: { id: user.id, name: user.name, email: user.email, locale: user.locale },
    org: { id: active.org.id, name: active.org.name, slug: active.org.slug },
    role: active.role as Role,
    orgs: user.memberships.map((m) => ({ id: m.orgId, name: m.org.name, role: m.role })),
  };
}

export async function writeAudit(
  orgId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId = "",
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { orgId, userId, action, entityType, entityId, metaJson: JSON.stringify(meta) },
    });
  } catch {
    // auditing must never break the request
  }
}
