import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import type { StatusTone } from "@/components/shared/status-badge";

/**
 * Helper rentang tanggal + komponen presentasional utk modul analytics.
 * Semua server-safe (tanpa "use client") — filter dikirim lewat query param.
 */

export type RangeKey = "7d" | "30d" | "month" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 hari",
  "30d": "30 hari",
  month: "Bulan berjalan",
  all: "Semua waktu",
};

/** Validasi query param rentang — nilai tak dikenal jatuh ke fallback. */
export function pickRange(
  raw: string | string[] | undefined,
  allowed: readonly RangeKey[],
  fallback: RangeKey,
): RangeKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return allowed.includes(v as RangeKey) ? (v as RangeKey) : fallback;
}

/** Awal rentang (presisi hari, agar hari pertama ikut penuh). null = tanpa batas. */
export function rangeStart(key: RangeKey): Date | null {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "7d":
      return new Date(day.getTime() - 7 * 86_400_000);
    case "30d":
      return new Date(day.getTime() - 30 * 86_400_000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Kunci hari lokal YYYY-MM-DD (bukan UTC — data order dgn jam 00:00 lokal). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "2026-10-03" → "3 Okt 2026" */
export function formatDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** "2026-10" → "Okt 2026" */
export function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

/** Label sumbu chart: "3/10" (hari) atau "10/26" (bulan). */
export function axisLabel(key: string): string {
  const parts = key.split("-").map(Number);
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : `${parts[1]}/${String(parts[0]).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Komponen presentasional (server-safe)
// ---------------------------------------------------------------------------

/** Chip filter rentang → link query param (tanpa client state). */
export function RangeTabs({
  current,
  allowed,
  basePath,
  param = "range",
}: {
  current: RangeKey;
  allowed: readonly RangeKey[];
  basePath: string;
  param?: string;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-card p-1">
      {allowed.map((key) => (
        <Link
          key={key}
          href={`${basePath}?${param}=${key}`}
          prefetch={false}
          aria-current={key === current ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            key === current
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          {RANGE_LABELS[key]}
        </Link>
      ))}
    </div>
  );
}

export interface TrendPoint {
  label: string;
  value: number;
}

/** Bar chart CSS murni — tinggi bar proporsional thd max, hover via title. */
export function BarChart({ points, emptyLabel }: { points: TrendPoint[]; emptyLabel?: string }) {
  if (points.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        {emptyLabel ?? "Belum ada data pada rentang ini."}
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const showLabels = points.length <= 14;
  return (
    <div className="space-y-2">
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Tren omzet">
        {points.map((p, i) => (
          <div
            key={`${p.label}-${i}`}
            title={`${p.label}: ${formatCurrency(p.value)}`}
            className={cn(
              "min-h-[3px] flex-1 rounded-t bg-teal-500 transition-colors hover:bg-teal-600",
              p.value === 0 && "bg-slate-200 hover:bg-slate-300",
            )}
            style={{ height: `${Math.max(3, (p.value / max) * 100)}%` }}
          />
        ))}
      </div>
      {showLabels ? (
        <div className="flex gap-1 text-[10px] text-slate-400">
          {points.map((p, i) => (
            <span key={`${p.label}-${i}`} className="flex-1 truncate text-center">
              {p.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Progress bar baris (pct vs max). */
export function ProgressBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${safe}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500">{safe.toFixed(1)}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Label enum
// ---------------------------------------------------------------------------

export const CHANNEL_LABELS: Record<string, string> = {
  SHOPEE: "Shopee",
  TIKTOK: "TikTok",
  LIVE: "Live",
  DROPSHIP: "Dropship",
  RESELLER: "Reseller",
  OFFLINE: "Offline",
};

export const STATUS_TONES: Record<string, StatusTone> = {
  PENDING: "warning",
  PICKING: "info",
  PICKED: "info",
  READY_TO_SHIP: "info",
  SHIPPED: "primary",
  COMPLETED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
};

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
