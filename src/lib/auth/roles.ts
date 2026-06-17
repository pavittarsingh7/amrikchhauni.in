import type { UserRole } from "@/lib/db/types";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRATOR: "ADMINISTRATOR",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Administrator",
  VIEWER: "Viewer",
} as const satisfies Record<UserRole, string>;

/** Actions restricted to SUPER_ADMIN only */
export const SUPER_ADMIN_ONLY = [
  "nginx.restart",
  "nginx.reload",
  "ssl.manage",
  "settings.manage",
  "server.execute",
  "users.manage",
] as const;

export type SuperAdminAction = (typeof SUPER_ADMIN_ONLY)[number];

export function isSuperAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function canPerform(role: UserRole, action: SuperAdminAction): boolean {
  if (SUPER_ADMIN_ONLY.includes(action)) {
    return isSuperAdmin(role);
  }
  return role !== "VIEWER";
}

export function canWrite(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMINISTRATOR";
}
