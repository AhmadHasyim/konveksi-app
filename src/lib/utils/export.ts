/** Util ekspor laporan — CSV siap-Excel (BOM UTF-8) + cetak PDF via browser. */

/** Format sel CSV: kutip ganda bila mengandung koma/kutip/baris baru. */
function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Unduh tabel sebagai file CSV — double-click langsung terbuka di Excel. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const body = [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.csv$/i, "") + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Buka dialog print browser — "Save as PDF" jadi file PDF. */
export function printReport(): void {
  window.print();
}
