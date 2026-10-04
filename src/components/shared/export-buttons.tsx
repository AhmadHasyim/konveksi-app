"use client";

import { Download, Printer } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCsv, printReport } from "@/lib/utils/export";

/**
 * Tombol ekspor laporan: Excel (.xlsx, via route /api/export/*),
 * CSV (langsung terbuka di Excel) + cetak PDF via dialog print browser.
 * Data sudah di-load halaman server.
 */
export function ExportButtons({
  filename,
  headers,
  rows,
  excelHref,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  excelHref?: string;
}) {
  return (
    <>
      {excelHref ? (
        <a
          href={rows.length > 0 ? excelHref : undefined}
          download
          aria-disabled={rows.length === 0}
          className={cn(
            buttonStyles("outline", "sm"),
            rows.length === 0 && "pointer-events-none opacity-50",
          )}
          title={
            rows.length === 0
              ? "Tidak ada data untuk diunduh"
              : "Unduh laporan .xlsx (terformat, siap Excel)"
          }
        >
          <Download aria-hidden />
          Unduh Excel
        </a>
      ) : null}
      <button
        type="button"
        className={buttonStyles("outline", "sm")}
        onClick={() => downloadCsv(filename, headers, rows)}
        disabled={rows.length === 0}
        title={rows.length === 0 ? "Tidak ada data untuk diunduh" : "Unduh CSV — buka langsung di Excel"}
      >
        <Download aria-hidden />
        Unduh CSV
      </button>
      <button
        type="button"
        className={buttonStyles("outline", "sm")}
        onClick={printReport}
        title="Cetak laporan — pilih Save as PDF pada dialog print"
      >
        <Printer aria-hidden />
        Cetak / PDF
      </button>
    </>
  );
}
