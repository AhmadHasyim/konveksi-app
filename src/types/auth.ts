import type { PermissionCode } from "@/lib/constants/permissions";
import type { RoleCode } from "@/lib/constants/roles";

/** Ringkasan role yang ditempel pada session. */
export interface SessionRole {
  code: RoleCode;
  name: string;
}

/** User yang terekspos ke client via session (tidak pernah berisi passwordHash). */
export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  roles: SessionRole[];
  permissions: PermissionCode[];
}

/** Internal record (server-only). */
export interface UserRecord extends SessionUser {
  passwordHash: string;
  isActive: boolean;
}

export type { PermissionCode, RoleCode };
