import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserId } from "./auth";
import { db } from "./db";
import { can, type Permission, type Role } from "./rbac";

const ORG_COOKIE = "afin_org";

export interface ApiContext {
  userId: string;
  orgId: string;
  role: Role;
}

// Resolve the caller's identity and their role in the active org (from cookie, or first membership).
export async function apiContext(): Promise<ApiContext | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const store = await cookies();
  const wanted = store.get(ORG_COOKIE)?.value;

  const memberships = await db.membership.findMany({ where: { userId } });
  if (memberships.length === 0) return null;
  const active = memberships.find((m) => m.orgId === wanted) ?? memberships[0];
  return { userId, orgId: active.orgId, role: active.role as Role };
}

// Resolve role within a specific org (used when the org is derived from a resource).
export async function roleInOrg(userId: string, orgId: string): Promise<Role | null> {
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
  return m ? (m.role as Role) : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function badRequest(detail?: unknown) {
  return NextResponse.json({ error: "invalid", detail }, { status: 400 });
}

export function ensure(role: Role | null, perm: Permission): boolean {
  return role !== null && can(role, perm);
}
