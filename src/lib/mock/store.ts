import { compare } from "bcryptjs";
import { PERMISSION_CODES, type PermissionCode } from "@/lib/constants/permissions";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { UserRecord } from "@/types/auth";

/**
 * Lapisan data DUMMY (pengganti database sementara).
 *
 * Struktur file ini зеркалит Prisma schema foundation
 * (User, Role, Permission, UserRole, RolePermission) sehingga
 * migrasi ke PostgreSQL + Prisma nanti hanya mengganti
 * fungsi akses data, tanpa mengubah API/helper yang memakainya.
 *
 * Semua user dummy memakai password dev: "Admin123!"
 * (hash bcrypt di bawah adalah hash dari password tersebut,
 * HANYA untuk development — jangan dipakai di production).
 */
const DEV_PASSWORD_HASH =
  "$2b$10$A1pzi5hUWsv3eI./qVoI4OGZFWNI.CXDZlANf2Qw.DaQSrBbabbqi";

export const DEV_PASSWORD_HINT = "Admin123!";

interface DummyPermission {
  code: PermissionCode;
  name: string;
  description: string;
  module: string;
}

export const DUMMY_PERMISSIONS: DummyPermission[] = [
  { code: PERMISSION_CODES.DASHBOARD_VIEW, name: "Lihat Dashboard", description: "Mengakses halaman dashboard.", module: "dashboard" },
  { code: PERMISSION_CODES.USER_VIEW, name: "Lihat User", description: "Melihat daftar user.", module: "users" },
  { code: PERMISSION_CODES.USER_CREATE, name: "Buat User", description: "Membuat user baru.", module: "users" },
  { code: PERMISSION_CODES.USER_UPDATE, name: "Ubah User", description: "Mengubah data user.", module: "users" },
  { code: PERMISSION_CODES.USER_DELETE, name: "Hapus User", description: "Menonaktifkan/menghapus user.", module: "users" },
  { code: PERMISSION_CODES.ROLE_VIEW, name: "Lihat Role", description: "Melihat daftar role.", module: "roles" },
  { code: PERMISSION_CODES.ROLE_MANAGE, name: "Kelola Role", description: "Mengelola role dan permission.", module: "roles" },
  { code: PERMISSION_CODES.PRODUCT_VIEW, name: "Lihat Produk", description: "Melihat data produk.", module: "products" },
  { code: PERMISSION_CODES.PRODUCT_CREATE, name: "Buat Produk", description: "Menambah produk baru.", module: "products" },
  { code: PERMISSION_CODES.PRODUCT_UPDATE, name: "Ubah Produk", description: "Mengubah data produk.", module: "products" },
  { code: PERMISSION_CODES.PRODUCT_DELETE, name: "Hapus Produk", description: "Menghapus produk.", module: "products" },
  { code: PERMISSION_CODES.INVENTORY_VIEW, name: "Lihat Persediaan", description: "Melihat stok.", module: "inventory" },
  { code: PERMISSION_CODES.INVENTORY_MANAGE, name: "Kelola Persediaan", description: "Mengelola stok & mutasi.", module: "inventory" },
  { code: PERMISSION_CODES.SALES_VIEW, name: "Lihat Penjualan", description: "Melihat data penjualan.", module: "sales" },
  { code: PERMISSION_CODES.SALES_CREATE, name: "Buat Penjualan", description: "Membuat transaksi penjualan.", module: "sales" },
  { code: PERMISSION_CODES.SALES_UPDATE, name: "Ubah Penjualan", description: "Mengubah transaksi penjualan.", module: "sales" },
  { code: PERMISSION_CODES.PRODUCTION_VIEW, name: "Lihat Produksi", description: "Melihat data produksi.", module: "production" },
  { code: PERMISSION_CODES.PRODUCTION_MANAGE, name: "Kelola Produksi", description: "Mengelola proses produksi.", module: "production" },
  { code: PERMISSION_CODES.PAYROLL_VIEW, name: "Lihat Payroll", description: "Melihat data payroll.", module: "payroll" },
  { code: PERMISSION_CODES.PAYROLL_MANAGE, name: "Kelola Payroll", description: "Mengelola payroll & bonus.", module: "payroll" },
  { code: PERMISSION_CODES.REPORT_VIEW, name: "Lihat Laporan", description: "Mengakses laporan.", module: "reports" },
  { code: PERMISSION_CODES.AUDIT_LOG_VIEW, name: "Lihat Audit Log", description: "Melihat jejak audit.", module: "audit" },
  { code: PERMISSION_CODES.HPP_VIEW, name: "Lihat HPP", description: "Melihat harga pokok penjualan.", module: "financial" },
  { code: PERMISSION_CODES.HPP_MANAGE, name: "Kelola HPP", description: "Mengubah data HPP produk.", module: "financial" },
  { code: PERMISSION_CODES.PROFIT_VIEW, name: "Lihat Keuntungan", description: "Melihat perhitungan keuntungan.", module: "financial" },
  { code: PERMISSION_CODES.PROFIT_REPORT, name: "Laporan Profit", description: "Mengakses laporan profit.", module: "financial" },
  { code: PERMISSION_CODES.MARGIN_VIEW, name: "Lihat Margin", description: "Melihat margin penjualan.", module: "financial" },
  { code: PERMISSION_CODES.FINANCIAL_REPORT_VIEW, name: "Laporan Keuangan", description: "Mengakses laporan keuangan owner.", module: "financial" },
];

const ALL_PERMISSIONS = DUMMY_PERMISSIONS.map((p) => p.code);

interface DummyRole {
  code: RoleCode;
  name: string;
  description: string;
  permissions: PermissionCode[];
}

export const DUMMY_ROLES: DummyRole[] = [
  {
    code: ROLE_CODES.OWNER,
    name: "Owner",
    description: "Akses penuh seluruh sistem.",
    permissions: ALL_PERMISSIONS,
  },
  {
    code: ROLE_CODES.ADMIN,
    name: "Administrator",
    description: "Pengelola operasional & master data.",
    permissions: [
      PERMISSION_CODES.DASHBOARD_VIEW,
      PERMISSION_CODES.USER_VIEW,
      PERMISSION_CODES.USER_CREATE,
      PERMISSION_CODES.USER_UPDATE,
      PERMISSION_CODES.ROLE_VIEW,
      PERMISSION_CODES.ROLE_MANAGE,
      PERMISSION_CODES.PRODUCT_VIEW,
      PERMISSION_CODES.PRODUCT_CREATE,
      PERMISSION_CODES.PRODUCT_UPDATE,
      PERMISSION_CODES.PRODUCT_DELETE,
      PERMISSION_CODES.INVENTORY_VIEW,
      PERMISSION_CODES.INVENTORY_MANAGE,
      PERMISSION_CODES.SALES_VIEW,
      PERMISSION_CODES.SALES_CREATE,
      PERMISSION_CODES.SALES_UPDATE,
      PERMISSION_CODES.PRODUCTION_VIEW,
      PERMISSION_CODES.PRODUCTION_MANAGE,
      PERMISSION_CODES.PAYROLL_VIEW,
      PERMISSION_CODES.REPORT_VIEW,
      PERMISSION_CODES.AUDIT_LOG_VIEW,
    ],
  },
  {
    code: ROLE_CODES.LIVE_SALES,
    name: "Live Sales",
    description: "Tim penjualan live.",
    permissions: [
      PERMISSION_CODES.DASHBOARD_VIEW,
      PERMISSION_CODES.PRODUCT_VIEW,
      PERMISSION_CODES.SALES_VIEW,
      PERMISSION_CODES.SALES_CREATE,
    ],
  },
  {
    code: ROLE_CODES.PRODUKSI,
    name: "Produksi",
    description: "Tim produksi.",
    permissions: [
      PERMISSION_CODES.DASHBOARD_VIEW,
      PERMISSION_CODES.PRODUCT_VIEW,
      PERMISSION_CODES.INVENTORY_VIEW,
      PERMISSION_CODES.PRODUCTION_VIEW,
      PERMISSION_CODES.PRODUCTION_MANAGE,
    ],
  },
  {
    code: ROLE_CODES.PENJAHIT,
    name: "Penjahit",
    description: "Operator jahit.",
    permissions: [PERMISSION_CODES.DASHBOARD_VIEW, PERMISSION_CODES.PRODUCTION_VIEW],
  },
  {
    code: ROLE_CODES.KANCING,
    name: "Kancing",
    description: "Operator kancing.",
    permissions: [PERMISSION_CODES.DASHBOARD_VIEW, PERMISSION_CODES.PRODUCTION_VIEW],
  },
  {
    code: ROLE_CODES.HR,
    name: "HR",
    description: "Human resources & payroll.",
    permissions: [
      PERMISSION_CODES.DASHBOARD_VIEW,
      PERMISSION_CODES.PAYROLL_VIEW,
      PERMISSION_CODES.PAYROLL_MANAGE,
      PERMISSION_CODES.REPORT_VIEW,
    ],
  },
];

const roleMap = new Map(DUMMY_ROLES.map((r) => [r.code, r]));

function buildUser(
  id: string,
  username: string,
  email: string,
  roleCodes: RoleCode[],
): UserRecord {
  const permissions = [
    ...new Set(roleCodes.flatMap((c) => roleMap.get(c)?.permissions ?? [])),
  ];
  return {
    id,
    username,
    email,
    passwordHash: DEV_PASSWORD_HASH,
    isActive: true,
    roles: roleCodes.map((code) => ({
      code,
      name: roleMap.get(code)?.name ?? code,
    })),
    permissions,
  };
}

const DUMMY_USERS: UserRecord[] = [
  buildUser("dummy-admin-id", "admin", "admin@konveksi.local", [ROLE_CODES.ADMIN]),
  buildUser("dummy-owner-id", "owner", "owner@konveksi.local", [ROLE_CODES.OWNER]),
  buildUser("dummy-sales-id", "sales", "sales@konveksi.local", [ROLE_CODES.LIVE_SALES]),
  buildUser("dummy-produksi-id", "produksi", "produksi@konveksi.local", [ROLE_CODES.PRODUKSI]),
  buildUser("dummy-hr-id", "hr", "hr@konveksi.local", [ROLE_CODES.HR]),
];

/** Cari user dummy berdasarkan username atau email (case-insensitive). */
export function findDummyUser(usernameOrEmail: string): UserRecord | null {
  const key = usernameOrEmail.trim().toLowerCase();
  return (
    DUMMY_USERS.find(
      (u) => u.username.toLowerCase() === key || u.email?.toLowerCase() === key,
    ) ?? null
  );
}

/** Verifikasi password terhadap hash bcrypt. */
export async function verifyDummyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  if (!plainPassword || !passwordHash) return false;
  try {
    return await compare(plainPassword, passwordHash);
  } catch {
    return false;
  }
}
