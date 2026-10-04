import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import type { PermissionCode } from "@/lib/constants/permissions";
import type { RoleCode } from "@/lib/constants/roles";
import type { SessionUser } from "@/types/auth";

/**
 * Authorization helpers. Authentication (siapa user) disediakan
 * oleh Auth.js; fungsi di sini menjawab (boleh melakukan apa).
 * Permission SELALU diperiksa di server — menyembunyikan UI saja
 * tidak cukup.
 */

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

export function hasPermission(
  user: SessionUser | null | undefined,
  code: PermissionCode,
): boolean {
  if (!user) return false;
  return user.permissions.includes(code);
}

export function hasAnyPermission(
  user: SessionUser | null | undefined,
  codes: PermissionCode[],
): boolean {
  if (!user) return false;
  return codes.some((c) => user.permissions.includes(c));
}

export function hasRole(
  user: SessionUser | null | undefined,
  code: RoleCode,
): boolean {
  if (!user) return false;
  return user.roles.some((r) => r.code === code);
}

/** Pastikan ada user login; jika tidak, arahkan ke halaman login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Pastikan user login DAN memiliki permission.
 * Tanpa login -> redirect /login. Tanpa permission -> halaman 403.
 */
export async function requirePermission(
  code: PermissionCode,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, code)) forbidden();
  return user;
}

/** Pastikan user login DAN memiliki salah satu role. */
export async function requireRole(code: RoleCode): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, code)) forbidden();
  return user;
}
