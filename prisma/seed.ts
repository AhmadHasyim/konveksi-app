import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

/**
 * Seed foundation: permission, role (+ pemetaan), dan satu user development.
 *
 * Dijalankan SETELAH database PostgreSQL disiapkan (Phase 2):
 *   npx prisma migrate dev
 *   npx prisma db seed
 *
 * Password admin HANYA dari SEED_ADMIN_PASSWORD (env).
 * JANGAN memakai password ini di production.
 */
const PERMISSIONS: Array<{
  code: string;
  name: string;
  description: string;
  module: string;
}> = [
  { code: "DASHBOARD_VIEW", name: "Lihat Dashboard", description: "Mengakses halaman dashboard.", module: "dashboard" },
  { code: "USER_VIEW", name: "Lihat User", description: "Melihat daftar user.", module: "users" },
  { code: "USER_CREATE", name: "Buat User", description: "Membuat user baru.", module: "users" },
  { code: "USER_UPDATE", name: "Ubah User", description: "Mengubah data user.", module: "users" },
  { code: "USER_DELETE", name: "Hapus User", description: "Menonaktifkan/menghapus user.", module: "users" },
  { code: "ROLE_VIEW", name: "Lihat Role", description: "Melihat daftar role.", module: "roles" },
  { code: "ROLE_MANAGE", name: "Kelola Role", description: "Mengelola role dan permission.", module: "roles" },
  { code: "PRODUCT_VIEW", name: "Lihat Produk", description: "Melihat data produk.", module: "products" },
  { code: "PRODUCT_CREATE", name: "Buat Produk", description: "Menambah produk baru.", module: "products" },
  { code: "PRODUCT_UPDATE", name: "Ubah Produk", description: "Mengubah data produk.", module: "products" },
  { code: "PRODUCT_DELETE", name: "Hapus Produk", description: "Menghapus produk.", module: "products" },
  { code: "INVENTORY_VIEW", name: "Lihat Persediaan", description: "Melihat stok.", module: "inventory" },
  { code: "INVENTORY_MANAGE", name: "Kelola Persediaan", description: "Mengelola stok & mutasi.", module: "inventory" },
  { code: "SALES_VIEW", name: "Lihat Penjualan", description: "Melihat data penjualan.", module: "sales" },
  { code: "SALES_CREATE", name: "Buat Penjualan", description: "Membuat transaksi penjualan.", module: "sales" },
  { code: "SALES_UPDATE", name: "Ubah Penjualan", description: "Mengubah transaksi penjualan.", module: "sales" },
  { code: "PRODUCTION_VIEW", name: "Lihat Produksi", description: "Melihat data produksi.", module: "production" },
  { code: "PRODUCTION_MANAGE", name: "Kelola Produksi", description: "Mengelola proses produksi.", module: "production" },
  { code: "PAYROLL_VIEW", name: "Lihat Payroll", description: "Melihat data payroll.", module: "payroll" },
  { code: "PAYROLL_MANAGE", name: "Kelola Payroll", description: "Mengelola payroll & bonus.", module: "payroll" },
  { code: "REPORT_VIEW", name: "Lihat Laporan", description: "Mengakses laporan.", module: "reports" },
  { code: "AUDIT_LOG_VIEW", name: "Lihat Audit Log", description: "Melihat jejak aktivitas.", module: "audit" },
  { code: "HPP_VIEW", name: "Lihat HPP", description: "Melihat harga pokok penjualan.", module: "financial" },
  { code: "HPP_MANAGE", name: "Kelola HPP", description: "Mengubah data HPP produk.", module: "financial" },
  { code: "PROFIT_VIEW", name: "Lihat Keuntungan", description: "Melihat perhitungan keuntungan.", module: "financial" },
  { code: "PROFIT_REPORT", name: "Laporan Profit", description: "Mengakses laporan profit.", module: "financial" },
  { code: "MARGIN_VIEW", name: "Lihat Margin", description: "Melihat margin penjualan.", module: "financial" },
  { code: "FINANCIAL_REPORT_VIEW", name: "Laporan Keuangan", description: "Mengakses laporan keuangan owner.", module: "financial" },
];

const ROLES: Array<{
  code: string;
  name: string;
  description: string;
  permissions: string[] | "ALL";
}> = [
  { code: "OWNER", name: "Owner", description: "Akses penuh seluruh sistem.", permissions: "ALL" },
  {
    code: "ADMIN",
    name: "Administrator",
    description: "Pengelola operasional & master data.",
    permissions: [
      "DASHBOARD_VIEW",
      "USER_VIEW",
      "USER_CREATE",
      "USER_UPDATE",
      "ROLE_VIEW",
      "ROLE_MANAGE",
      "PRODUCT_VIEW",
      "PRODUCT_CREATE",
      "PRODUCT_UPDATE",
      "PRODUCT_DELETE",
      "INVENTORY_VIEW",
      "INVENTORY_MANAGE",
      "SALES_VIEW",
      "SALES_CREATE",
      "SALES_UPDATE",
      "PRODUCTION_VIEW",
      "PRODUCTION_MANAGE",
      "PAYROLL_VIEW",
      "REPORT_VIEW",
      "AUDIT_LOG_VIEW",
    ],
  },
  {
    code: "LIVE_SALES",
    name: "Live Sales",
    description: "Tim penjualan live.",
    permissions: ["DASHBOARD_VIEW", "PRODUCT_VIEW", "SALES_VIEW", "SALES_CREATE"],
  },
  {
    code: "PRODUKSI",
    name: "Produksi",
    description: "Tim produksi.",
    permissions: [
      "DASHBOARD_VIEW",
      "PRODUCT_VIEW",
      "INVENTORY_VIEW",
      "PRODUCTION_VIEW",
      "PRODUCTION_MANAGE",
    ],
  },
  {
    code: "PENJAHIT",
    name: "Penjahit",
    description: "Operator jahit.",
    permissions: ["DASHBOARD_VIEW", "PRODUCTION_VIEW"],
  },
  {
    code: "KANCING",
    name: "Kancing",
    description: "Operator kancing.",
    permissions: ["DASHBOARD_VIEW", "PRODUCTION_VIEW"],
  },
  {
    code: "HR",
    name: "HR",
    description: "Human resources & payroll.",
    permissions: [
      "DASHBOARD_VIEW",
      "PAYROLL_VIEW",
      "PAYROLL_MANAGE",
      "REPORT_VIEW",
    ],
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum di-set. Lihat .env.example.");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // 1. Permissions (idempotent via code).
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description, module: p.module },
      create: p,
    });
  }

  // 2. Roles + pemetaan permission.
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { code: r.code, name: r.name, description: r.description },
    });

    const codes = r.permissions === "ALL" ? PERMISSIONS.map((p) => p.code) : r.permissions;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const code of codes) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code },
      });
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // 3. User development "admin".
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD belum di-set. Lihat .env.example (HANYA untuk development).",
    );
  }
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@konveksi.local",
      passwordHash: await hash(password, 10),
      roles: { create: [{ roleId: adminRole.id }] },
    },
  });

  console.log("Seed selesai: roles, permissions, dan user 'admin' siap.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
