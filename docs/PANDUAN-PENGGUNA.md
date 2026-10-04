# PANDUAN PENGGUNA — KonveksiApp

**Sistem Manajemen Konveksi & Penjualan**

Versi Dokumen: Oktober 2026 · Berlaku untuk seluruh modul yang aktif

---

## 1. Tentang Aplikasi

KonveksiApp adalah sistem informasi internal untuk mengelola seluruh proses bisnis konveksi dan penjualan online dalam **satu aplikasi**: mulai dari order masuk, pemilihan barang (picking), pengiriman, stok, produksi, laporan penjualan, payroll karyawan, sampai laporan keuangan owner.

Prinsip kerja aplikasi:

- **Semua angka dihitung otomatis dari data** — tidak ada angka dummy. Selama belum ada transaksi, laporan menampilkan nol (bukan error).
- **Hak akses berbasis peran (role)** — menu yang tidak berhak Anda akses tidak akan tampil, dan setiap aksi juga diperiksa di server.
- **Setiap perubahan penting tercatat** di Audit Log (siapa, apa, kapan).

---

## 2. Login

1. Buka alamat aplikasi di browser (Chrome/Edge terbaru).
2. Masukkan **username** dan **password** → klik **Masuk**.
3. Anda akan masuk ke halaman **Dashboard**.

**Akun bawaan (akun awal, silakan ganti/atur ulang oleh Admin lewat menu Pengaturan → User):**

| Username | Password | Role |
|---|---|---|
| `admin` | sesuai konfigurasi awal | Administrator |
| `owner` | sesuai konfigurasi awal | Owner |
| `sales` | sesuai konfigurasi awal | Live Sales |
| `produksi` | sesuai konfigurasi awal | Produksi |
| `hr` | sesuai konfigurasi awal | HR |

> **Penting:** Sesudah Admin mengubah role/permission suatu user, user tersebut harus **login ulang** agar menu terbaru sesuai hak aksesnya.

---

## 3. Mengenal Tampilan

- **Sidebar kiri** — daftar menu, dikelompokkan menjadi 8 bagian (lihat §5). Menu otomatis difilter sesuai hak akses Anda.
- **Header halaman** — judul halaman (breadcrumb), filter periode, dan tombol aksi (Tambah, Ekspor, dll) di sisi kanan.
- **Notifikasi (toast)** — muncul di pojok sebagai balasan aksi: hijau = berhasil, merah = gagal, kuning = peringatan.
- **Tabel data** — pencarian, filter tab status, urutan naik, tombol aksi per baris (lihat/edit/hapus).
- **Modal (jendela dialog)** — dipakai untuk form tambah/ubah. Tekan **Esc** atau tombol **×** untuk menutup.

---

## 4. Alur Kerja Inti

Alur utama satu order, dari masuk sampai selesai:

```
Order Masuk (Pending)
      │  input nomor resi
      ▼
   Picking  ──►  Dipicked  ──►  Siap Kirim
      │                              │
      │                    konfirmasi Kirim
      │                              ▼
      │                        Terkirim ──► Selesai
      │
      └── (batal / retur sebagai pengecualian)
```

**Status order (8 status):**

| Status | Arti |
|---|---|
| Pending | Order baru masuk, belum diproses |
| Picking | Sedang diambil/diambilkan barangnya |
| Dipicked | Barang sudah diambil, menunggu pengecekan |
| Siap Kirim | Sudah dikemas, menunggu dikirim |
| Terkirim | Sudah diserahkan ke kurir (stok otomatis berkurang) |
| Selesai | Order ditutup |
| Dibatalkan | Order dibatalkan |
| Retur | Barang dikembalikan pembeli |

**Aturan penting:**

- **Stok barang jadi berkurang otomatis** saat Anda konfirmasi kirim, dengan jumlah aktual yang benar-benar dikirim — bukan saat order dibuat.
- **Retur** bisa menambah kembali stok, hanya jika dicentang *restock* (barang layak jual).
- **Resi wajib unik** — nomor resi tidak boleh dipakai dua order.

---

## 5. Panduan Tiap Menu

### 5.1 Dashboard

Menu pertama, selalu tampil. Berisi ringkasan langsung: **Order Masuk, Omzet, Laba Kotor, Item Terjual**, grafik penjualan, order terbaru, dan status order yang sedang berjalan. Gunakan **filter periode** (7 hari / 30 hari / bulan ini) di atas untuk mengubah rentang.

### 5.2 Operasional

#### Order & Resi (`/order`)

**Menambah order baru:**
1. Buka **Order & Resi** → klik **Tambah Order**.
2. Isi: tanggal, marketplace (Shopee, TikTok Shop, Live, Dropship, Reseller, Offline), nama & telepon pelanggan.
3. Tambahkan item: pilih produk, jumlah (qty), harga satuan — bisa lebih dari satu item.
4. Simpan. Order masuk dengan status **Pending**.

**Melanjutkan order:**
1. Klik order → panel detail terbuka.
2. **Input Resi** — masukkan nomor resi (wajib unik) untuk memindahkan ke tahap diproses.
3. Gunakan tombol aksi per baris untuk mengubah status mengikuti alur §4 (Picking → Dipicked → Siap Kirim → Terkirim → Selesai).
4. Tab status di atas tabel (**Semua / Menunggu / Diproses / Terkirim / Selesai / Batal-Retur**) untuk menyaring; kotak pencarian mencari nomor order, resi, atau pelanggan.
5. **Hapus** hanya bisa untuk order tertentu (sistem menolak order yang sudah jalan prosesnya).

#### Picking (`/picking`)

Daftar order yang sedang diproses. Klik satu order → daftar barang yang harus diambil (per produk, warna, ukuran, jumlah) → centang selesai. Selesai picking memindahkan status ke **Dipicked**.

#### Pengiriman (`/pengiriman`)

Order yang sudah **Siap Kirim**. Klik → pastikan resi dan jumlah kirim benar → **Konfirmasi Kirim**. Di sinilah stok berkurang otomatis, status menjadi **Terkirim**, dan dashboard langsung terupdate.

#### Retur (`/retur`)

1. Klik **Tambah Retur** → pilih order asal → isi jumlah per produk.
2. Centang **restock** bila barang layak jual (stok otomatis bertambah lewat mutasi `RETURN_IN`); biarkan kosong bila tidak.
3. Status order asal menjadi **Retur**.

### 5.3 Produk & Stok

#### Produk (`/master/produk`)

Tiga tab: **Produk** (data produk + SKU + harga + HPP), **Warna**, **Ukuran** — semuanya CRUD (Tambah/Ubah/Hapus). Produk yang sudah terpakai di order tidak bisa dihapus (ditandai terpakai), agar data lama tetap aman.

#### Bahan Baku (`/master/bahan-baku`) & Supplier (`/master/supplier`)

CRUD biasa untuk daftar bahan (kain, benang, kancing… beserta stok dan satuan) dan supplier.

#### Barang Jadi (`/stok/barang-jadi`)

Saldo stok per produk + warna + ukuran. **Stok naik/turun otomatis** dari produksi, pengiriman, retur, dan koreksi.

#### Mutasi Stok (`/stok/mutasi`)

Riwayat seluruh pergerakan stok dengan 6 tipe:

| Tipe | Kapan terjadi |
|---|---|
| PRODUCTION_IN | Hasil produksi masuk gudang |
| PRODUCTION_OUT | Bahan dikeluarkan untuk produksi |
| SALE_SHIPMENT | Stok berkurang saat pengiriman |
| RETURN_IN | Retur masuk (restock) |
| ADJUSTMENT_IN / OUT | Koreksi manual bertambah/berkurang |

### 5.4 Produksi

- **Produksi (`/produksi`)** — halaman muka: ringkasan bulan ini (pengeluaran bahan, batch cutting, jahit masuk, disetor) + jalan cepat ke dua menu di bawah.
- **Pengeluaran Bahan (`/produksi/pengeluaran-bahan`)** — catat bahan yang dikeluarkan per batch (menyimpan stok bahan dan menjadi mutasi PRODUCTION_OUT).
- **Hasil Produksi (`/produksi/hasil`)** — catat hasil cutting & jahit per batch (pcs masuk, ditolak, diterima) → barang jadi bertambah otomatis (PRODUCTION_IN).

### 5.5 Analytics

- **Penjualan (`/penjualan`)** — tren omzet, jumlah order, dan produk terjual per periode.
- **Produk Terlaris (`/laporan/produk-terlaris`)** — peringkat produk berdasarkan qty & omzet terjual.
- **Laporan (`/laporan`)** — rekap harian penjualan terealisasi (status Terkirim/Selesai): jumlah order, qty, omzet per tanggal + TOTAL. Filter rentang 7 hari / 30 hari / bulan ini / semua. Tombol ekspor ada di kanan atas (lihat §7).

### 5.6 Karyawan

- **Karyawan (`/master/karyawan`)** — data karyawan + tim.
- **Live Seller (`/hr/live-seller`)** — penjualan per seller (live/online) untuk evaluasi kinerja.
- **Target & Bonus (`/hr/target`)** — target penjualan periodik beserta capaiannya.
- **Payroll (`/hr/payroll`)** — rekap gaji + bonus karyawan (hanya role dengan akses payroll).

### 5.7 Owner / Financial

> Hanya tampil untuk user dengan permission finansial (**Owner**). Angka bersifat rahasia perusahaan.

- **HPP (`/owner/hpp`)** — harga pokok penjualan per produk.
- **Keuntungan (`/owner/keuntungan`)** — pendapatan, HPP, laba kotor per periode.
- **Margin (`/owner/margin`)** — margin per channel/marketplace.
- **Laporan Keuangan (`/owner/laporan-keuangan`)** — KPI utama (Pendapatan, HPP, Laba Kotor, Margin %, Kas Masuk/Keluar, Saldo) + komposisi omzet per marketplace + arus kas. Bisa diekspor (lihat §7).

### 5.8 Pengaturan (Administrasi)

- **User (`/pengaturan/user`)** — tambah/ubah/hapus user, tentukan role (bisa lebih dari satu). Password di-hash. User yang terhapus otomatis tidak bisa login.
- **Role & Permission (`/pengaturan/role`)** — 7 role bawaan (Owner, Administrator, Live Sales, Produksi, Penjahit, Kancing, HR). Ubah role → centang permission per modul di grid yang tersedia. Role yang sedang dipakai user tidak bisa dihapus.
- **Audit Log (`/pengaturan/audit-log`)** — jejak semua aksi penting (login, CRUD, verifikasi, impor) — filter per modul/aksi.

---

## 6. Impor Data Order (CSV / Excel)

Untuk input massal (misal rekap harian marketplace), gunakan **Impor CSV** di halaman **Order & Resi**.

**Langkah:**
1. Buka **Order & Resi** → klik **Impor CSV**.
2. Klik **Template CSV** atau **Template Excel** untuk mengunduh format baku.
3. Isi data sesuai kolom (satu baris = satu order, satu produk).
4. Klik area file → pilih berkas `.csv` atau `.xlsx` (maks 1000 baris; CSV 2 MB, Excel 5 MB).
5. **Pratinjau** muncul: baris hijau = siap diimpor, baris kuning = bermasalah (ada keterangannya — baris ini dilewati).
6. Klik **Impor N order** untuk menyelesaikan.

**Kolom wajib dan formatnya:**

| Kolom | Syarat |
|---|---|
| `tanggal` | `2026-10-03` atau `03/10/2026` |
| `channel` | Shopee, TikTok, Live, Dropship, Reseller, Offline |
| `pelanggan`, `telepon` | teks bebas |
| `resi` | opsional; bila terisi wajib unik |
| `kode_produk` | harus sesuai kode produk aktif di menu Produk |
| `qty` | bilangan bulat ≥ 1 |
| `harga_satuan` | bilangan bulat ≥ 0 (rupiah) |
| `catatan` | opsional |

Baris yang gagal (produk tidak ditemukan, resi duplikat, format salah) **tidak menggagalkan seluruh impor** — hanya baris itu yang dilewati dan dilaporkan per nomor baris.

---

## 7. Ekspor & Cetak Laporan

Tiga tombol ekspor tersedia di halaman **Laporan** dan **Laporan Keuangan** (kanan atas):

| Tombol | Hasil |
|---|---|
| **Unduh Excel** | Berkas `.xlsx` terformat — langsung terbuka & terhitung di Excel |
| **Unduh CSV** | Berkas `.csv` (UTF-8) — double-click langsung terbuka di Excel |
| **Cetak / PDF** | Dialog print browser → pilih **Save as PDF** untuk menyimpan PDF |

Langkah menyimpan PDF: klik **Cetak / PDF** → pada dialog print pilih tujuan **Save as PDF** → Simpan. Sidebar dan tombol otomatis tidak ikut tercetak.

Impor/ekspor juga mengikuti hak akses: impor butuh hak buat order; laporan keuangan hanya untuk yang berhak.

---

## 8. Hak Akses per Role

| Role | Akses utama |
|---|---|
| **Owner** | Semua, termasuk HPP, Keuntungan, Margin, Laporan Keuangan |
| **Administrator** | Semua modul operasional, master, produksi, laporan, pengaturan (tanpa angka finansial owner) |
| **Live Sales** | Order, Resi, Pengiriman, Retur, Penjualan, Live Seller |
| **Produksi** | Modul produksi, stok, bahan baku |
| **Penjahit** | Tugas jahit / hasil produksi |
| **Kancing** | Tugas kancing / hasil produksi |
| **HR** | Karyawan, Target & Bonus, Payroll |

Menu yang tidak berhak tidak tampil; mengakses URL pun ditolak (403). Detail perubahan hak akses dilakukan di **Pengaturan → Role & Permission**.

---

## 9. Masalah Umum (FAQ)

**Menu/fitur saya tidak muncul?**
Hak akses Anda belum mencakupnya. Hubungi Admin/Owner agar memberi permission lewat Pengaturan → Role & Permission, lalu **login ulang**.

**Muncul "403" / "Akses ditolak"?**
Anda login, tetapi tidak berhak pada halaman itu. Hal yang sama dengan poin di atas.

**Angka di laporan nol semua?**
Normal bila memang belum ada transaksi pada rentang yang dipilih. Ubah filter rentang, atau pastikan order sudah berstatus **Terkirim/Selesai** (laporan hanya menghitung order terealisasi).

**Impor ditolak, kenapa?**
Baca keterangan pada pratinjau: biasanya kolom wajib hilang, format tanggal salah, channel tidak dikenal, kode produk tidak ada, atau resi duplikat. Perbaiki baris itu lalu impor ulang.

**Perubahan role tidak berefek?**
Login ulang — hak akses disimpan saat login.

**Halaman terlihat aneh/kosong setelah lama terbuka?**
Muat ulang halaman (F5 / tombol refresh).

**Lupa password?**
Hubungi Admin — reset/ganti password lewat Pengaturan → User.

**Data penting terhapus?**
Sebagian data terlindungi (tidak bisa dihapus bila sudah dipakai). Jejak semua aksi dapat ditelusuri di **Pengaturan → Audit Log**.

---

*Panduan ini mengikuti kondisi aplikasi per Oktober 2026. Bila ada perubahan modul, dokumen akan diperbarui.*
