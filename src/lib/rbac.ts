// Role-based access control. Roles are ordered; most checks are "at least this role".

export type Role = "owner" | "admin" | "editor" | "collector" | "viewer";

export const ROLES: Role[] = ["owner", "admin", "editor", "collector", "viewer"];

const RANK: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  collector: 2,
  viewer: 1,
};

export function isRole(value: string): value is Role {
  return value in RANK;
}

export function atLeast(role: string, min: Role): boolean {
  if (!isRole(role)) return false;
  return RANK[role] >= RANK[min];
}

export type Permission =
  | "org:manage"
  | "members:manage"
  | "project:write"
  | "form:write"
  | "form:deploy"
  | "data:read"
  | "data:write"
  | "data:delete"
  | "data:export"
  | "data:submit";

const MIN_ROLE: Record<Permission, Role> = {
  "org:manage": "owner",
  "members:manage": "admin",
  "project:write": "editor",
  "form:write": "editor",
  "form:deploy": "editor",
  "data:read": "viewer",
  "data:write": "editor",
  "data:delete": "admin",
  "data:export": "viewer",
  "data:submit": "collector",
};

export function can(role: string, perm: Permission): boolean {
  return atLeast(role, MIN_ROLE[perm]);
}

export const ROLE_LABELS: Record<Role, { ar: string; en: string }> = {
  owner: { ar: "مالك", en: "Owner" },
  admin: { ar: "مدير", en: "Admin" },
  editor: { ar: "محرر", en: "Editor" },
  collector: { ar: "جامع بيانات", en: "Collector" },
  viewer: { ar: "مشاهد", en: "Viewer" },
};
