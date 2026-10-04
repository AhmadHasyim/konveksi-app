/**
 * Test parser impor CSV (spec §37) — murni tanpa DB.
 * Jalankan: npx tsx scripts/test-import-csv.ts
 */
import { parseCsv, parseImportCsv, parseTable, CSV_HEADERS } from "../src/features/order/csv";
import { xlsxToTable } from "../src/lib/server/excel";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
};

// 1) CSV dasar + CRLF
const basic = CSV_HEADERS.join(",") + "\r\n" + "2026-10-03,SHOPEE,Siti,0812,SPX1,PJ01,2,85000,catatan\r\n";
const p1 = parseImportCsv(basic);
ok("1 baris valid", p1.rows.length === 1 && !p1.rows[0]?.error, `err=${p1.rows[0]?.error ?? "-"}`);

// 2) quote: koma & kutip di dalam field
const quoted = parseCsv('a,b\n"x,y","he said ""hi"""');
ok("quote koma+kutip", quoted[1][0] === "x,y" && quoted[1][1] === 'he said "hi"');

// 3) tanggal dd/mm/yyyy
const dmy = CSV_HEADERS.join(",") + "\n03/10/2026,SHOPEE,S,, ,PJ01,1,85000,";
const p3 = parseImportCsv(dmy);
ok("dd/mm/yyyy → 2026-10-03", p3.rows[0]?.tanggal === "2026-10-03", p3.rows[0]?.tanggal);

// 4) header kolom wajib hilang
const badHeader = parseImportCsv("tanggal,channel\n2026-10-03,SHOPEE");
ok("header error bila kolom wajib hilang", !!badHeader.headerError, badHeader.headerError);

// 5) validasi baris: qty nol, channel aneh, tanggal rusak
const bad = CSV_HEADERS.join(",") + "\n" + [
  "2026-13-99,LAZADA,S,,,PJ01,0,-5,",
].join(",");
const p5 = parseImportCsv(bad);
ok("3+ error terdeteksi", !!p5.rows[0].error && p5.rows[0].error.split(";").length >= 3, p5.rows[0].error);

// 6) channel LIVE/DROPSHIP dikenal
const ch = CSV_HEADERS.join(",") + "\n2026-10-03,LIVE,S,,,PJ01,1,90000,";
ok("channel LIVE valid", !parseImportCsv(ch).rows[0].error, parseImportCsv(ch).rows[0].error);

// 7) file kosong
ok("file kosong → headerError", !!parseImportCsv("").headerError);

// 8) .xlsx → tabel → valid (jalur previewImportExcel, tanpa auth)
async function testXlsx() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Order");
  ws.columns = CSV_HEADERS.map((h) => ({ header: h, key: h })); // key = nama kolom, bukan nilai
  ws.addRow({ tanggal: new Date("2026-10-03"), channel: "SHOPEE", pelanggan: "Siti", telepon: "0812", resi: "SPX9", kode_produk: "PJ01", qty: 2, harga_satuan: 85000, catatan: "" });
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const px = parseTable(await xlsxToTable(buf));
  ok(
    "xlsx: 1 baris valid + tanggal Excel terbaca",
    px.rows.length === 1 && !px.rows[0].error &&
      px.rows[0].tanggal === "2026-10-03" && px.rows[0].qty === 2 && px.rows[0].unitPrice === 85000,
    `rows=${px.rows.length} err=${px.rows[0]?.error ?? "-"} tgl=${px.rows[0]?.tanggal} qty=${px.rows[0]?.qty} harga=${px.rows[0]?.unitPrice}`,
  );
}

testXlsx().then(() => {
  console.log(`\n${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
});
