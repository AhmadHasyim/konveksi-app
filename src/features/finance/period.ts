/** Konstanta periode laporan — aman dipakai client & server (tanpa prisma). */
export type PeriodKey = "today" | "7d" | "30d" | "month" | "all";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "all", label: "Semua" },
];

export function parsePeriod(v: unknown): PeriodKey {
  const s = typeof v === "string" ? v : "";
  return PERIOD_OPTIONS.some((o) => o.key === s) ? (s as PeriodKey) : "month";
}
