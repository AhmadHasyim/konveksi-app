/**
 * Kode role yang dikenal aplikasi.
 *
 * Database tetap menjadi source of truth untuk role & permission
 * (tabel Role / Permission / UserRole / RolePermission).
 * Constants ini hanya type-safe reference agar tidak ada
 * string permission/role yang tersebar (magic string) di codebase.
 */
export const ROLE_CODES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  LIVE_SALES: "LIVE_SALES",
  PRODUKSI: "PRODUKSI",
  PENJAHIT: "PENJAHIT",
  KANCING: "KANCING",
  HR: "HR",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  LIVE_SALES: "Live Sales",
  PRODUKSI: "Produksi",
  PENJAHIT: "Penjahit",
  KANCING: "Kancing",
  HR: "HR",
};
