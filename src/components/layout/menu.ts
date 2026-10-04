import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackageMinus,
  Percent,
  Radio,
  Receipt,
  ReceiptText,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  Shirt,
  Target,
  TrendingUp,
  Truck,
  UserSquare2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { PermissionCode } from "@/lib/constants/permissions";
import { PERMISSION_CODES } from "@/lib/constants/permissions";

/**
 * Konfigurasi menu sidebar terpusat dengan grouping SaaS.
 * Menu difilter berdasarkan permission user (lihat filterMenu).
 * Label path dipakai juga untuk breadcrumb header.
 */
export type MenuGroup =
  | "OVERVIEW"
  | "OPERASIONAL"
  | "PRODUK_STOK"
  | "PRODUKSI"
  | "ANALYTICS"
  | "KARYAWAN"
  | "FINANCIAL"
  | "SYSTEM";

export interface MenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission yang dibutuhkan untuk melihat menu. Kosong = selalu tampil. */
  permission?: PermissionCode;
  group?: MenuGroup;
  children?: MenuItem[];
}

export const MENU_GROUPS: { key: MenuGroup; label: string }[] = [
  { key: "OVERVIEW", label: "Dashboard" },
  { key: "OPERASIONAL", label: "Operasional" },
  { key: "PRODUK_STOK", label: "Produk & Stok" },
  { key: "PRODUKSI", label: "Produksi" },
  { key: "ANALYTICS", label: "Analytics" },
  { key: "KARYAWAN", label: "Karyawan" },
  { key: "FINANCIAL", label: "Owner / Financial" },
  { key: "SYSTEM", label: "Administrasi" },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSION_CODES.DASHBOARD_VIEW,
    group: "OVERVIEW",
  },
  // ── OPERASIONAL: Order → Picking → Kirim → Retur ──
  {
    title: "Order & Resi",
    href: "/order",
    icon: ClipboardList,
    permission: PERMISSION_CODES.SALES_VIEW,
    group: "OPERASIONAL",
  },
  {
    title: "Picking",
    href: "/picking",
    icon: ClipboardCheck,
    permission: PERMISSION_CODES.INVENTORY_VIEW,
    group: "OPERASIONAL",
  },
  {
    title: "Pengiriman",
    href: "/pengiriman",
    icon: Truck,
    permission: PERMISSION_CODES.SALES_VIEW,
    group: "OPERASIONAL",
  },
  {
    title: "Retur",
    href: "/retur",
    icon: RotateCcw,
    permission: PERMISSION_CODES.SALES_VIEW,
    group: "OPERASIONAL",
  },
  // ── PRODUK & STOK ──
  {
    title: "Produk",
    href: "/master/produk",
    icon: Shirt,
    permission: PERMISSION_CODES.PRODUCT_VIEW,
    group: "PRODUK_STOK",
  },
  {
    title: "Barang Jadi",
    href: "/stok/barang-jadi",
    icon: PackageCheck,
    permission: PERMISSION_CODES.INVENTORY_VIEW,
    group: "PRODUK_STOK",
  },
  {
    title: "Bahan Baku",
    href: "/master/bahan-baku",
    icon: Boxes,
    permission: PERMISSION_CODES.INVENTORY_VIEW,
    group: "PRODUK_STOK",
  },
  {
    title: "Mutasi Stok",
    href: "/stok/mutasi",
    icon: PackageMinus,
    permission: PERMISSION_CODES.INVENTORY_VIEW,
    group: "PRODUK_STOK",
  },
  {
    title: "Supplier",
    href: "/master/supplier",
    icon: Truck,
    permission: PERMISSION_CODES.INVENTORY_VIEW,
    group: "PRODUK_STOK",
  },
  // ── PRODUKSI ──
  {
    title: "Produksi",
    href: "/produksi",
    icon: Factory,
    permission: PERMISSION_CODES.PRODUCTION_VIEW,
    group: "PRODUKSI",
  },
  {
    title: "Pengeluaran Bahan",
    href: "/produksi/pengeluaran-bahan",
    icon: PackageMinus,
    permission: PERMISSION_CODES.PRODUCTION_VIEW,
    group: "PRODUKSI",
  },
  {
    title: "Hasil Produksi",
    href: "/produksi/hasil",
    icon: PackageCheck,
    permission: PERMISSION_CODES.PRODUCTION_VIEW,
    group: "PRODUKSI",
  },
  // ── ANALYTICS ──
  {
    title: "Penjualan",
    href: "/penjualan",
    icon: BarChart3,
    permission: PERMISSION_CODES.SALES_VIEW,
    group: "ANALYTICS",
  },
  {
    title: "Produk Terlaris",
    href: "/laporan/produk-terlaris",
    icon: TrendingUp,
    permission: PERMISSION_CODES.REPORT_VIEW,
    group: "ANALYTICS",
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: FileText,
    permission: PERMISSION_CODES.REPORT_VIEW,
    group: "ANALYTICS",
  },
  // ── KARYAWAN ──
  {
    title: "Karyawan",
    href: "/master/karyawan",
    icon: UserSquare2,
    permission: PERMISSION_CODES.PAYROLL_VIEW,
    group: "KARYAWAN",
  },
  {
    title: "Live Seller",
    href: "/hr/live-seller",
    icon: Radio,
    permission: PERMISSION_CODES.SALES_VIEW,
    group: "KARYAWAN",
  },
  {
    title: "Target & Bonus",
    href: "/hr/target",
    icon: Target,
    permission: PERMISSION_CODES.PAYROLL_VIEW,
    group: "KARYAWAN",
  },
  {
    title: "Payroll",
    href: "/hr/payroll",
    icon: Wallet,
    permission: PERMISSION_CODES.PAYROLL_VIEW,
    group: "KARYAWAN",
  },
  // ── OWNER / FINANCIAL (hanya user dgn permission finansial — OWNER) ──
  {
    title: "HPP",
    href: "/owner/hpp",
    icon: ReceiptText,
    permission: PERMISSION_CODES.HPP_VIEW,
    group: "FINANCIAL",
  },
  {
    title: "Keuntungan",
    href: "/owner/keuntungan",
    icon: Coins,
    permission: PERMISSION_CODES.PROFIT_VIEW,
    group: "FINANCIAL",
  },
  {
    title: "Margin",
    href: "/owner/margin",
    icon: Percent,
    permission: PERMISSION_CODES.MARGIN_VIEW,
    group: "FINANCIAL",
  },
  {
    title: "Laporan Keuangan",
    href: "/owner/laporan-keuangan",
    icon: Receipt,
    permission: PERMISSION_CODES.FINANCIAL_REPORT_VIEW,
    group: "FINANCIAL",
  },
  // ── ADMINISTRASI ──
  {
    title: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    group: "SYSTEM",
    children: [
      {
        title: "User",
        href: "/pengaturan/user",
        icon: Users,
        permission: PERMISSION_CODES.USER_VIEW,
      },
      {
        title: "Role & Permission",
        href: "/pengaturan/role",
        icon: ShieldCheck,
        permission: PERMISSION_CODES.ROLE_VIEW,
      },
      {
        title: "Audit Log",
        href: "/pengaturan/audit-log",
        icon: ScrollText,
        permission: PERMISSION_CODES.AUDIT_LOG_VIEW,
      },
    ],
  },
];

/** Label untuk breadcrumb berdasarkan path. Dibangun dari MENU_ITEMS. */
export const PATH_LABELS: Record<string, string> = (() => {
  const map: Record<string, string> = { "/dashboard": "Dashboard" };
  for (const item of MENU_ITEMS) {
    map[item.href] = item.title;
    for (const child of item.children ?? []) {
      map[child.href] = child.title;
      map[item.href] = item.title;
    }
  }
  return map;
})();

/**
 * Filter menu berdasarkan permission user.
 * Grup tanpa satupun anak yang visible ikut disembunyikan.
 */
export function filterMenu(
  items: MenuItem[],
  permissions: PermissionCode[],
): MenuItem[] {
  const allowed = new Set<PermissionCode>(permissions);
  const result: MenuItem[] = [];

  for (const item of items) {
    if (item.children) {
      const children = item.children.filter(
        (c) => !c.permission || allowed.has(c.permission),
      );
      if (children.length > 0) result.push({ ...item, children });
    } else if (!item.permission || allowed.has(item.permission)) {
      result.push(item);
    }
  }

  return result;
}

/** Kelompokkan item flat menjadi section berdasarkan `group`. */
export function groupMenu(items: MenuItem[]): { key: MenuGroup; label: string; items: MenuItem[] }[] {
  return MENU_GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => (i.group ?? "OPERASIONAL") === g.key),
  })).filter((g) => g.items.length > 0);
}
