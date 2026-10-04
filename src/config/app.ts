export const appConfig = {
  name: "Sistem Manajemen Konveksi & Penjualan",
  shortName: "KonveksiApp",
  brandName: "DETI FASHION",
  brandSubtitle: "Management System",
  description:
    "Aplikasi internal untuk manajemen konveksi, penjualan, produksi, stok, target sales, bonus, payroll, dan reporting.",
  version: "0.1.0",
  footerNote: "DETI Fashion Management System · Data internal perusahaan",
} as const;

export type AppConfig = typeof appConfig;
