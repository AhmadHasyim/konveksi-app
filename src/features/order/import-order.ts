"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";
import { parseCsv, parseTable, type ImportRow, type ImportPreviewRow } from "./csv";
import { createOrder, setShippingNumber } from "./actions";
import { xlsxToTable } from "@/lib/server/excel";

// Impor order dari CSV / Excel (spec §37): preview → konfirmasi.
// Arsitektur siap dikembang utk API marketplace (parser diganti, kontrak sama).

type PreviewData = { rows: ImportPreviewRow[]; validCount: number; errorCount: number };

async function checkProducts(rows: ImportRow[]): Promise<Map<string, string>> {
  const codes = [...new Set(rows.filter((r) => !r.error).map((r) => r.kodeProduk))];
  const found = codes.length
    ? await prisma.product.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } })
    : [];
  return new Map(found.map((p) => [p.code, p.id]));
}

/** Validasi tabel apa pun (CSV maupun Excel) → baris preview. */
async function previewTable(table: string[][]): Promise<ActionResponse<PreviewData>> {
  const parsed = parseTable(table);
  if (parsed.headerError) return fail("INVALID_HEADER", parsed.headerError);
  if (parsed.rows.length === 0) return fail("EMPTY", "Tidak ada baris data.");
  if (parsed.rows.length > 1000) return fail("TOO_MANY", "Maks 1000 baris per impor.");

  const products = await checkProducts(parsed.rows);
  const rows: ImportPreviewRow[] = parsed.rows.map((r) => {
    const error =
      r.error ?? (products.has(r.kodeProduk) ? undefined : `produk '${r.kodeProduk}' tidak ditemukan`);
    return { ...r, error, valid: !error };
  });
  const validCount = rows.filter((r) => r.valid).length;
  return ok({ rows, validCount, errorCount: rows.length - validCount }, "File terbaca.");
}

/** Tahap 1 (CSV) — parse & validasi teks CSV tanpa menulis apa pun. */
export async function previewImportOrder(csvText: string): Promise<ActionResponse<PreviewData>> {
  try {
    await requirePermission(P.SALES_CREATE);
    if (csvText.length > 2_000_000) return fail("TOO_LARGE", "File terlalu besar (maks 2 MB).");
    return previewTable(parseCsv(csvText.replace(/^\uFEFF/, "")));
  } catch (err) {
    console.error("[order:import:preview]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Tahap 1 (Excel) — baca .xlsx dari upload (FormData) lalu validasi. */
export async function previewImportExcel(fd: FormData): Promise<ActionResponse<PreviewData>> {
  try {
    await requirePermission(P.SALES_CREATE);
    const file = fd.get("file");
    if (!(file instanceof File)) return fail("NO_FILE", "File tidak ditemukan.");
    if (file.size > 5_000_000) return fail("TOO_LARGE", "File terlalu besar (maks 5 MB).");

    const table = await xlsxToTable((await file.arrayBuffer()) as ArrayBuffer);
    if (table.length < 2)
      return fail("EMPTY", "Sheet kosong — minimal baris header + 1 baris data.");
    return previewTable(table);
  } catch (err) {
    console.error("[order:import:excel]", err);
    return fail("GENERIC", "Gagal membaca file Excel — pastikan format .xlsx, baris pertama = header.");
  }
}

/** Tahap 2 — buat order dari baris valid. Baris gagal dilaporkan per baris. */
export async function confirmImportOrder(
  rows: ImportPreviewRow[],
): Promise<ActionResponse<{ created: number; failed: number; issues: { line: number; message: string }[] }>> {
  try {
    const user = await requirePermission(P.SALES_CREATE);
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return fail("EMPTY", "Tidak ada baris valid untuk diimpor.");

    const products = await checkProducts(validRows);
    const issues: { line: number; message: string }[] = [];
    let created = 0;

    for (const r of validRows) {
      const productId = products.get(r.kodeProduk);
      if (!productId) {
        issues.push({ line: r.line, message: `produk '${r.kodeProduk}' tidak ditemukan` });
        continue;
      }
      const res = await createOrder({
        channel: r.channel as never,
        date: r.tanggal,
        customerName: r.pelanggan,
        customerPhone: r.telepon,
        note: r.catatan,
        items: [{ productId, orderedQty: r.qty, unitPrice: r.unitPrice }],
      });
      if (!res.success) {
        issues.push({ line: r.line, message: res.message });
        continue;
      }
      created++;
      if (r.resi) {
        const resiRes = await setShippingNumber(res.data.id, r.resi);
        if (!resiRes.success)
          issues.push({ line: r.line, message: `order ${res.data.orderNumber} dibuat TANPA resi — ${resiRes.message}` });
      }
    }

    if (created > 0) {
      await logAudit({
        userId: user.id,
        action: "IMPORT",
        module: "order",
        after: { created, failed: issues.length },
      });
      revalidatePath("/order");
    }
    return ok({ created, failed: issues.length, issues },
      created > 0 ? `${created} order diimpor.` : "Tidak ada order yang diimpor.");
  } catch (err) {
    console.error("[order:import:confirm]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
