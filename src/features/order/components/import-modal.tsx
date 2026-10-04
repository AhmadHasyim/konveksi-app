"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/export";
import { CSV_HEADERS, CSV_CHANNEL } from "@/features/order/csv";
import { previewImportOrder, previewImportExcel, confirmImportOrder } from "@/features/order/import-order";
import type { ImportPreviewRow } from "@/features/order/csv";

/**
 * Impor order dari CSV (spec §37): pilih file → preview baris valid/error
 * → konfirmasi. Template bisa diunduh dari modal.
 */
export function ImportOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"form" | "preview">("form");
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [pending, start] = useTransition();

  function reset() {
    setPhase("form");
    setRows([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    const lower = file.name.toLowerCase();
    const isXlsx = lower.endsWith(".xlsx");
    if (!isXlsx && !lower.endsWith(".csv")) {
      toast.error("Format harus .csv atau .xlsx");
      return;
    }
    setFileName(file.name);
    const text = isXlsx ? "" : await file.text();
    start(async () => {
      let res;
      if (isXlsx) {
        const fd = new FormData();
        fd.append("file", file, file.name);
        res = await previewImportExcel(fd);
      } else {
        res = await previewImportOrder(text);
      }
      if (!res.success || res.data.rows.length === 0) {
        toast.error(res.message ?? "File tidak bisa dibaca.");
        return;
      }
      setRows(res.data.rows);
      setValidCount(res.data.validCount);
      setErrorCount(res.data.errorCount);
      setPhase("preview");
      if (res.data.errorCount > 0)
        toast.warning(`${res.data.errorCount} baris bermasalah — baris valid tetap bisa diimpor.`);
    });
  }

  function downloadTemplate() {
    downloadCsv(
      "template-import-order",
      [...CSV_HEADERS],
      [
        ["2026-10-03", "SHOPEE", "Siti Aminah", "08123456789", "SPX123456789", "PJ01", "2", "85000", ""],
        ["2026-10-03", "TIKTOK", "Budi", "08987654321", "", "G01", "1", "58500", "tanpa resi"],
      ],
    );
  }

  function submit() {
    const validRows = rows.filter((r) => r.valid);
    start(async () => {
      const res = await confirmImportOrder(validRows);
      if (res.success) {
        const { created, failed, issues } = res.data;
        toast.success(`${created} order diimpor${failed ? `, ${failed} masalah` : ""}.`);
        for (const i of issues.slice(0, 3)) toast.error(`Baris ${i.line}: ${i.message}`);
        router.refresh();
        close();
      } else {
        toast.error(res.message ?? "Impor gagal.");
      }
    });
  }

  const channelList = [...CSV_CHANNEL].join(" / ");

  return (
    <Modal
      open={open}
      onClose={close}
      title="Impor Order (CSV / Excel)"
      description={
        phase === "form"
          ? "Satu baris = satu order (satu produk). Kolom wajib: tanggal, channel, kode_produk, qty, harga_satuan."
          : `Pratinjau ${fileName} — baris hijau siap diimpor.`
      }
      className="max-w-3xl"
      footer={
        phase === "form" ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="size-3.5" /> Template CSV
              </Button>
              <a
                href="/api/export/template-order"
                className="inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              >
                <Download className="size-3.5" /> Template Excel
              </a>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>Batal</Button>
              <Button onClick={() => inputRef.current?.click()} disabled={pending}>
                <FileUp className="size-4" /> Pilih file CSV / Excel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>← Pilih file lain</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close} disabled={pending}>Batal</Button>
              <Button onClick={submit} disabled={pending || validCount === 0}>
                <Upload className="size-4" />
                {pending ? "Mengimpor..." : `Impor ${validCount} order`}
              </Button>
            </div>
          </div>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {phase === "form" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-sm text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <FileUp className="size-7" />
          <span className="font-medium">Klik untuk memilih file .csv atau .xlsx</span>
          <span className="text-xs">
            Channel yang dikenal: {channelList}. Maks 1000 baris / 2 MB (CSV) atau 5 MB (Excel).
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" /> {validCount} valid
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="size-3.5" /> {errorCount} bermasalah
            </span>
            <span className="text-xs text-slate-500">Baris bermasalah dilewati saat impor.</span>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Baris</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Tanggal</th>
                  <th className="px-2 py-2 font-medium">Channel</th>
                  <th className="px-2 py-2 font-medium">Pelanggan</th>
                  <th className="px-2 py-2 font-medium">Produk</th>
                  <th className="px-2 py-2 text-right font-medium">Qty</th>
                  <th className="px-2 py-2 text-right font-medium">Harga</th>
                  <th className="px-2 py-2 font-medium">Resi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={cn("border-t border-slate-100", r.valid ? "" : "bg-amber-50/60")}>
                    <td className="px-2 py-1.5 tabular-nums text-slate-500">{r.line}</td>
                    <td className="px-2 py-1.5">
                      {r.valid ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <span title={r.error} className="text-amber-600">⚠ {r.error?.slice(0, 40)}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">{r.tanggal || "—"}</td>
                    <td className="px-2 py-1.5">{r.channel}</td>
                    <td className="px-2 py-1.5">{r.pelanggan || "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{r.kodeProduk}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.qty}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.unitPrice.toLocaleString("id-ID")}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-500">{r.resi || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
