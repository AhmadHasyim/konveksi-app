/**
 * Parser CSV impor order (spec §37) — murni, tanpa DB, bisa ditest via tsx.
 * Format: 1 baris = 1 order dengan 1 item produk.
 */

export const CSV_HEADERS = [
  "tanggal",
  "channel",
  "pelanggan",
  "telepon",
  "resi",
  "kode_produk",
  "qty",
  "harga_satuan",
  "catatan",
] as const;

export const CSV_CHANNEL = ["SHOPEE", "TIKTOK", "LIVE", "DROPSHIP", "RESELLER", "OFFLINE"] as const;

export interface ImportRow {
  line: number;
  tanggal: string;
  channel: string;
  pelanggan: string;
  telepon: string;
  resi: string;
  kodeProduk: string;
  qty: number;
  unitPrice: number;
  catatan: string;
  /** Error validasi baris ini (tanpa DB). */
  error?: string;
}

/** Baris preview siap-konfirmasi (valid = akan diimpor). */
export interface ImportPreviewRow extends ImportRow {
  valid: boolean;
}

/** RFC4180-ish: dukung kutip ganda, koma di dalam kutip, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

function normDate(v: string): string | null {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy → yyyy-mm-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/**
 * Parse + validasi isi CSV. Header harus mengandung kolom wajib;
 * kolom opsional boleh hilang. Validasi produk (kode → id) dilakukan server.
 */
export function parseImportCsv(text: string): { rows: ImportRow[]; headerError?: string } {
  return parseTable(parseCsv(text.replace(/^\uFEFF/, "")));
}

/** Validasi tabel (array of array) — dipakai jalur CSV dan Excel (.xlsx). */
export function parseTable(table: string[][]): { rows: ImportRow[]; headerError?: string } {
  if (table.length < 2) return { rows: [], headerError: "File kosong — minimal baris header + 1 baris data." };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const need = ["tanggal", "channel", "kode_produk", "qty", "harga_satuan"];
  const missing = need.filter((n) => !header.includes(n));
  if (missing.length)
    return { rows: [], headerError: `Kolom wajib tidak ditemukan: ${missing.join(", ")}.` };
  const col = (name: string) => header.indexOf(name);

  const rows: ImportRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const line = r + 1;
    const tanggal = normDate(get("tanggal"));
    const channel = get("channel").toUpperCase();
    const qty = Number(get("qty"));
    const harga = Number(get("harga_satuan"));
    const row: ImportRow = {
      line,
      tanggal: tanggal ?? "",
      channel,
      pelanggan: get("pelanggan"),
      telepon: get("telepon"),
      resi: get("resi"),
      kodeProduk: get("kode_produk").toUpperCase(),
      qty,
      unitPrice: harga,
      catatan: get("catatan"),
    };

    const errors: string[] = [];
    if (!tanggal) errors.push("tanggal harus YYYY-MM-DD / DD/MM/YYYY");
    if (!CSV_CHANNEL.includes(channel as (typeof CSV_CHANNEL)[number])) errors.push(`channel '${channel || "-"}' tidak dikenal`);
    if (!row.kodeProduk) errors.push("kode_produk kosong");
    if (!Number.isInteger(qty) || qty < 1) errors.push("qty harus bilangan bulat ≥ 1");
    if (!Number.isInteger(harga) || harga < 0) errors.push("harga_satuan harus bilangan bulat ≥ 0");
    if (errors.length) row.error = errors.join("; ");
    rows.push(row);
  }
  return { rows };
}
