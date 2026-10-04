import { toast } from "@/components/ui/toast";

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const POSITION_LABEL: Record<string, string> = {
  CUTTING: "Potong",
  SEWIST: "Penjahit",
  HOST_LIVE: "Host Live",
  WAREHOUSE: "Gudang",
  SALES: "Penjualan",
  ADMIN: "Admin",
};

export const ATTENDANCE_LABEL: Record<string, string> = {
  WORK: "Masuk",
  LEAVE: "Izin",
  SICK: "Sakit",
  ABSENT: "Alfa",
  MENSTRUAL: "MERAH",
  OVERTIME: "Lembur",
};

/** "2026-01" → "Januari 2026". */
export function periodLabel(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? month} ${year}`;
}

/** ISO date string → key bulan "YYYY-MM". */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/**
 * Handle hasil ActionResponse: toast + simpan field errors.
 * Sukses → true (tutup modal).
 */
export function handle(
  result: { success: boolean; message?: string; fieldErrors?: Record<string, string[]> },
  setFieldErrors: (errors: Record<string, string[]>) => void,
): boolean {
  if (result.success) {
    setFieldErrors({});
    toast.success(result.message ?? "Tersimpan.");
    return true;
  }
  setFieldErrors(result.fieldErrors ?? {});
  toast.error(result.message ?? "Gagal menyimpan.");
  return false;
}
