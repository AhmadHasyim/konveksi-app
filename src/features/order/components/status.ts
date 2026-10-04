import type { StatusTone } from "@/components/shared/status-badge";

/** Label + warna status order (spec §5 — 8 status, tidak lebih). */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PICKING: "Picking",
  PICKED: "Dipicked",
  READY_TO_SHIP: "Siap Kirim",
  SHIPPED: "Terkirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  RETURNED: "Retur",
};

export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "neutral",
  PICKING: "warning",
  PICKED: "info",
  READY_TO_SHIP: "info",
  SHIPPED: "primary",
  COMPLETED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
};

/** Tab filter status: grup kecil, bukan 8 tab terpisah. */
export const STATUS_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "all", label: "Semua", statuses: [] },
  { key: "menunggu", label: "Menunggu", statuses: ["PENDING"] },
  { key: "diproses", label: "Diproses", statuses: ["PICKING", "PICKED", "READY_TO_SHIP"] },
  { key: "terkirim", label: "Terkirim", statuses: ["SHIPPED"] },
  { key: "selesai", label: "Selesai", statuses: ["COMPLETED"] },
  { key: "batal", label: "Batal / Retur", statuses: ["CANCELLED", "RETURNED"] },
];

/** Stepper alur utama (tanpa cabang batal/retur). */
export const STATUS_FLOW = ["PENDING", "PICKING", "PICKED", "READY_TO_SHIP", "SHIPPED", "COMPLETED"];

export const CHANNEL_LABEL: Record<string, string> = {
  SHOPEE: "Shopee",
  TIKTOK: "TikTok Shop",
  LIVE: "Live",
  DROPSHIP: "Dropship",
  RESELLER: "Reseller",
  OFFLINE: "Offline",
};

export const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABEL).map(([value, label]) => ({
  value,
  label,
}));
