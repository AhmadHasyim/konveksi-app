# Report Analisis Dokumen Pengantar
## Aplikasi Manajemen Konveksi — ARKA FASHION (KonveksiApp)

**Tanggal:** 2 Oktober 2026
**Sumber:** 8 file Excel dari client (`public/dokumen/`)
**Cakupan:** 38 sheet · ±4.200 baris data · 11.061 formula manual

---

## 1. Ringkasan File

| # | File Excel | Sheet | Baris Data | Formula | Proses Bisnis |
|---|------------|-------|-----------|---------|---------------|
| 1 | STOCK.xlsx | 5 | ±400 | 852 | Master data + matriks stok barang jadi |
| 2 | Scan Barang.xlsx | 2 | 200 | 200 | Input scanner penghitungan barang |
| 3 | PRODUKSI (CUTTING,JAHIT).xlsx | 9 | ±1.600 | 3.758 | Bahan → cutting → jahit → setoran |
| 4 | DROPSHIP.xlsx | 2 | 32 | 61 | Katalog 9 produk + order dropship |
| 5 | HITUNGAN RESELLER.xlsx | 6 | 270 | 805 | Penjualan kredit 5 reseller + piutang |
| 6 | HITUNGAN GAJIH.xlsx | 12 | ±1.400 | 5.187 | Presensi harian → gaji → bonus |
| 7 | cash Flow Kebaya Authentik.xlsx | 1 | 101 | 99 | Kas masuk/keluar, saldo berjalan |
| 8 | cash Flow Glamore Kebaya.xlsx | 1 | 101 | 99 | Sama persis (template kembar) |

**Total 11.061 formula manual** — beban kerja utama yang akan dihapus oleh aplikasi.

---

## 2. Analisis Per File

### 2.1 STOCK.xlsx
- Sheet **DATA**: 4 daftar referensi —
  - Warna (14): MAHOGANY, BURGUNDY, DENIM, COKSU, NAVY, HITAM, DUSTY, BABYBLUE, MAROON, GOLD, SAGE, EMERALD GREEN, FUCIA, SILVER
  - Model: GOTIK, SLAYER, KUTUBARU, JANGGAN PENDEK, JANGGAN PANJANG, ROK DUYUNG, ROK PLISKET
  - Tim cutting (pasangan): JIMAT/FERRY, JIMAT/EKI, RANGGA/GILANG, dll.
  - Nama penjahit: ACIL, KANE, MIMIH, BU NANANG, dll.
- Sheet **SO** & **STOK**: matriks **model × warna × ukuran** dengan jumlah total baris/kolom.
- Sheet **MASUK** & **KELUAR**: mutasi stok — Tanggal, Model, Varian, Ukuran, Jumlah.

### 2.2 Scan Barang.xlsx
Sheet `Scan` 200 baris kolom scanner + kolom Total — input hitung cepat barang (barcode/label).

### 2.3 PRODUKSI (CUTTING,JAHIT).xlsx — inti operasional
5 alur utama:

1. **BAHAN** (369 baris): konsumsi kain per **roll** oleh tim cutting, per varian warna; termasuk matriks stok bahan (warna × jenis kain: BROKAT, TILLE, FUKORO, PURING, ROK BATIK).
2. **CUTTING NEW / CUTTING**: output cutting per size + kolom **No Surat Jalan → Penjahit → Tgl Setor → selisih −/+ → Total** (kontrol setoran piece-rate).
3. **PENJAHIT** (370 baris): model, varian warna, qty per ukuran, nama penjahit, tanggal setoran, jumlah setoran, selisih.
4. **SO / STOK / MASUK / KELUAR**: kebutuhan order dan stok barang jadi.
5. **Dua sistem ukuran** mengikuti model:
   - Apparel: S / M / L / XL (contoh: KUTUBARU)
   - Numerik: 4 / 6 / 8 / 10 / 12 / 14 (contoh: GOTIK)

### 2.4 DROPSHIP.xlsx
- **NAMA PRODUK**: katalog 9 SKU dengan kode pendek (G, E, GS, IDH, KIM, PE, PG, PS, KB) dan harga Rp58.500 – Rp85.500.
- **ORDER**: No, Kode Produk, Nama (VLOOKUP), Jumlah, Tanggal, Harga, Total — order dropship marketplace.

### 2.5 HITUNGAN RESELLER.xlsx
Satu sheet per reseller: **JOING, PAJIM, RAJIL, RANGGA, REZA**.
- Baris harian: DAY / WEEK / MONTH → qty per produk → TOTAL.
- Kolom **BAYAR / PIUTANG / KETERANGAN** + ringkasan **SISA PIUTANG** = buku piutang (AR) manual.
- Harga berbeda per reseller (REZA lebih murah ±Rp1.000–3.000) → harus jadi *price list per reseller*.
- Termasuk item non-produk: PLASTIK PACKING.

### 2.6 HITUNGAN GAJIH.xlsx
Tiga lapis perhitungan:

1. **Presensi harian per karyawan** (sheet per nama):
   - EGA & GEFIRA = **HOST LIVE**, EKI & RADIT = **GUDANG**
   - Kode keterangan: **J1** hari kerja · **J2** ijin/sakit/alfa · **J3** MERAH · **J4** LEMBUR
   - Kolom SESI 1–3 (sesi live) — nilai inilah yang diakumulasi.
2. **Gaji**: pokok Rp1.500.000 + tunjangan transport Rp100.000, dasar 25 hari kerja (sheet `rumus`).
3. **Bonus**: target **2.000 pcs/bulan** dan **Rp6.875.000/bulan**, komisi 2%, up-target 3%, bonus tunai per triwulan (sheet BONUS ×4).
4. **RULES**: biaya operasional bulanan — listrik Rp200.000, air+keamanan Rp150.000, makan Rp375.000, gaji Rp3.200.000, sample Rp1.000.000.

### 2.7 cash Flow (2 file, struktur identik)
Kas berjalan harian: No, Tanggal, Keterangan, No Kwitansi, Kas Masuk, Kas Keluar, Saldo (running). Isi Agustus ±100 baris: tarik saldo **Shopee** & **TikTok**, beli bahan, laundry, listrik token.
**Temuan: dua file isi-nya identik baris-per-baris** — kemungkinan satu template belum dipisah per entitas.

---

## 3. Alur Bisnis Terhubung

```
Order masuk: Dropship · Reseller · SO marketplace · Live streaming
        │
        ▼
Produksi: BAHAN (potong kain) → CUTTING (per size + Surat Jalan)
        → PENJAHIT (jahit, setor, cek selisih −/+) → STOK jadi
        │
        ▼
Penjualan: Reseller (piutang) · Dropship · Kas masuk per channel
        │
        ▼
Kas: cash flow per brand (Kebaya Authentik & Glamore Kebaya)
        │
        ▼
HR: presensi J1–J4 → gaji + bonus target live
```

**Channel penjualan:** Shopee, TikTok, Live streaming (host live), Reseller, Dropship.
**Entitas/brand:** Kebaya Authentik & Glamore Kebaya.

---

## 4. Temuan & Risiko Data

| # | Temuan | Dampak | Solusi di aplikasi |
|---|--------|--------|--------------------|
| 1 | Nama varian tidak konsisten (BURGUNDI/BERGUNDI, MAROON/MARON, EMERALD GREEN/EMERALD BLUE) | Lookup manual salah | Daftar referensi tunggal (enum) |
| 2 | 11.061 formula di template ±969 baris (data ±369) | Rapuh, satu sel salah edit merusak total | Kalkulasi di server, bukan sel |
| 3 | Ukuran mengikuti model (2 sistem) | Stok salah hitung jika ukuran global | Skema stok: (model, warna, ukuran) |
| 4 | Harga beda per reseller | Salah tagih | Price list per reseller |
| 5 | Dua file cash flow identik | Data entitas tidak jelas | Konfirmasi client |
| 6 | Presensi & bonus dikunci per nama sheet | Karyawan baru = sheet baru | Tabel karyawan + presensi |

---

## 5. Pemetaan ke Menu Aplikasi (Sudah Ada)

| Menu | Sumber Dokumen | Status |
|------|----------------|--------|
| Master Produk | sheet DATA + katalog DROPSHIP | siap |
| Master Bahan Baku | sheet BAHAN + stok kain | siap |
| Master Karyawan | sheet DATA + presensi | siap |
| Produksi | CUTTING / PENJAHIT / Surat Jalan | siap (fase berikutnya) |
| Persediaan | STOCK SO/STOK/MASUK/KELUAR + Scan Barang | siap (fase berikutnya) |
| Penjualan | DROPSHIP ORDER + RESELLER + SO | siap, **tambah: channel & piutang reseller** |
| HR & Payroll | HITUNGAN GAJIH | siap, **tambah: kode J1–J4, target live, komisi** |
| Laporan | agregasi semua file | siap |
| **Keuangan/Kas** | cash Flow ×2 | **GAP — menu baru** |
| **Marketplace (Shopee/TikTok)** | cash Flow + SO | **GAP — entitas channel penjualan** |

---

## 6. Rekomendasi Fase Pengembangan

| Fase | Isi | Nilai |
|------|-----|-------|
| **P2 — Database + Import Master** | Skema database (produk, varian, ukuran, bahan, karyawan, reseller, channel) + seed dari sheet DATA | Fondasi, data kecil & cepat |
| **P3 — Persediaan + Produksi** | Mutasi stok, cutting → jahit → setor dengan Surat Jalan & kontrol selisih | Menghapus 3.758 formula |
| **P4 — Penjualan** | Order dropship (kode SKU), buku piutang reseller, kas masuk per channel | Menghapus 805 + 61 formula |
| **P5 — Payroll + Kas** | Presensi J1–J4 + sesi live, gaji/bonus; modul cash flow per entitas | Menghapus 5.187 formula |
| **P6 — Laporan** | Target vs realisasi, margin per brand, piutang berjalan | Insight owner |

---

## 7. Pertanyaan untuk Client

1. Dua file cash flow — masing-masing untuk entitas berbeda (Kebaya Authentik vs Glamore), atau satu template?
2. **SO** = "Surat Order" (permintaan/order masuk) atau "Stok Opname"? Total selalu 0.
3. SESI 1–3 di presensi host live — satuan apa (pcs terjual / jumlah sesi / jam)?
4. Reseller & dropship: ada komisi/fee, atau hanya pencatatan piutang?
5. PLASTIK PACKING (item reseller) — dicatat sebagai stok bahan atau biaya HPP?
6. Target bonus 2.000 pcs/bulan dihitung per orang, per tim live, atau gabungan?

---

*Laporan ini menjadi dasar perancangan skema database & modul aplikasi KonveksiApp.*
