import ExcelJS from "exceljs";
import { CSV_HEADERS } from "@/features/order/csv";
import type { LaporanDailyRow } from "@/features/analytics/laporan";

/** Builder file .xlsx (server-only) — dipakai route /api/export/* */

const MONEY = "#,##0";
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0D9488" }, // teal-600 — ikut tema aplikasi
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const result = (v as { result?: unknown }).result;
    return result === null || result === undefined ? "" : String(result);
  }
  return String(v);
}

/** Baca .xlsx → tabel string (jalur impor §37 + test unit tanpa DB). */
export async function xlsxToTable(buf: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const table: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    table.push(values.slice(1).map(cellToString)); // exceljs 1-based
  });
  return table;
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** Laporan penjualan harian (§26). */
export async function laporanHarianXlsx(
  rows: LaporanDailyRow[],
  totals: { totalAmount: number; totalQty: number; orderCount: number },
  range: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KonveksiApp";
  const ws = wb.addWorksheet(`Laporan ${range}`);
  ws.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Jumlah order", key: "orders", width: 14 },
    { header: "Total qty", key: "qty", width: 12 },
    { header: "Total omzet", key: "amount", width: 18 },
  ];
  styleHeader(ws.getRow(1));
  for (const r of rows) {
    ws.addRow({ date: r.date, orders: r.orders, qty: r.qty, amount: r.amount });
  }
  ws.getColumn("amount").numFmt = MONEY;
  const tr = ws.addRow({ date: "TOTAL", orders: totals.orderCount, qty: totals.totalQty, amount: totals.totalAmount });
  tr.font = { bold: true };
  tr.getCell("amount").numFmt = MONEY;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return toBuffer(wb);
}

/** Laporan keuangan owner — KPI + komposisi per marketplace (SENSITIF: route sudah gate FINANCIAL_REPORT_VIEW). */
export async function laporanKeuanganXlsx(
  agg: {
    revenue: number;
    hpp: number;
    margin: number;
    marginPct: number;
    orderCount: number;
    qty: number;
    perChannel: { channel: string; revenue: number }[];
  },
  cash: { in: number; out: number; balance: number; count: number },
  period: string,
  channelLabel: (c: string) => string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Keuangan ${period}`);
  ws.columns = [
    { header: "Metrik", key: "metric", width: 34 },
    { header: "Nilai", key: "value", width: 20 },
  ];
  styleHeader(ws.getRow(1));
  ws.addRow({ metric: "Pendapatan" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = agg.revenue;
  ws.addRow({ metric: "HPP" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = agg.hpp;
  ws.addRow({ metric: "Laba Kotor" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = agg.margin;
  ws.addRow({ metric: "Margin (%)", value: agg.marginPct });
  ws.addRow({ metric: "Order", value: agg.orderCount });
  ws.addRow({ metric: "Qty terjual", value: agg.qty });
  ws.addRow({ metric: "Kas Masuk" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = cash.in;
  ws.addRow({ metric: "Kas Keluar" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = cash.out;
  ws.addRow({ metric: "Saldo Periode" }).getCell(2).numFmt = MONEY;
  ws.getCell(ws.rowCount, 2).value = cash.balance;

  if (agg.perChannel.length) {
    ws.addRow({});
    const head = ws.addRow({ metric: "Marketplace", value: "Omzet" });
    styleHeader(head);
    for (const c of agg.perChannel) {
      const r = ws.addRow({ metric: channelLabel(c.channel), value: c.revenue });
      r.getCell(2).numFmt = MONEY;
    }
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return toBuffer(wb);
}

/** Template impor order (.xlsx) — baris header + contoh. */
export async function templateOrderXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Order");
  ws.columns = [
    ...CSV_HEADERS.map((h) => ({ header: h, key: h, width: h === "pelanggan" || h === "catatan" ? 20 : 15 })),
  ];
  styleHeader(ws.getRow(1));
  ws.addRow({
    tanggal: "2026-10-03", channel: "SHOPEE", pelanggan: "Siti Aminah", telepon: "08123456789",
    resi: "SPX123456789", kode_produk: "PJ01", qty: 2, harga_satuan: 85000, catatan: "",
  });
  ws.addRow({
    tanggal: "03/10/2026", channel: "TIKTOK", pelanggan: "Budi", telepon: "08987654321",
    resi: "", kode_produk: "G01", qty: 1, harga_satuan: 58500, catatan: "tanpa resi",
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return toBuffer(wb);
}
