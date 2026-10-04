# KonveksiApp — Sistem Manajemen Konveksi & Penjualan

Aplikasi internal perusahaan untuk manajemen konveksi, penjualan, produksi,
stok, target sales, bonus, payroll, dan reporting.

> **Status: PHASE 1 — Project Foundation.**
> Authentication + RBAC berjalan dengan **data dummy** (tanpa database).
> PostgreSQL + Prisma migration/seed dijalankan pada Phase 2 saat database
> sudah disiapkan. Schema Prisma (`prisma/schema.prisma`) dan seed
> (`prisma/seed.ts`) sudah siap sebagai fondasi.

## 1. Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (dibutuhkan mulai Phase 2; Phase 1 tidak wajib)

## 2. Installation

```bash
cd konveksi-app
npm install
Copy-Item .env.example .env.local
# Isi AUTH_SECRET di .env.local dengan string acak:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. Environment variables

Lihat `.env.example`. Ringkasan:

| Variable              | Dipakai Phase 1 | Keterangan                                      |
| --------------------- | --------------- | ----------------------------------------------- |
| `DATABASE_URL`        | Tidak           | Koneksi PostgreSQL (wajib mulai Phase 2)        |
| `AUTH_SECRET`         | Ya              | Secret session Auth.js (wajib)                  |
| `SEED_ADMIN_PASSWORD` | Nanti           | Password user `admin` saat `prisma db seed`     |
| `NEXT_PUBLIC_APP_NAME`| Ya              | Nama aplikasi untuk browser                     |

File `.env*` tidak di-commit (lihat `.gitignore`).

## 4. Database setup (Phase 2)

```bash
# 1. Siapkan database PostgreSQL, lalu isi DATABASE_URL di .env.local
# 2. Generate client + migrasi + seed:
npm run db:generate
npm run db:migrate
npm run db:seed
```

Skema fondasi: `User`, `Role`, `Permission`, `UserRole`,
`RolePermission`, `AuditLog` (generik, append-only).
ID memakai CUID string; semua tabel utama punya `createdAt`/`updatedAt`.

## 5. Development

```bash
npm run dev
```

Buka http://localhost:3000 — user belum login diarahkan ke `/login`.

Kredensial dummy (development saja, password `Admin123!`):

| Username   | Role       |
| ---------- | ---------- |
| `admin`    | ADMIN      |
| `owner`    | OWNER      |
| `sales`    | LIVE_SALES |
| `produksi` | PRODUKSI   |
| `hr`       | HR         |

## 6. Build & production

```bash
npm run build
npm run start
```

## 7. Verifikasi fondasi

```bash
npm run lint        # ESLint — harus bersih
npx tsc --noEmit    # Type check — harus bersih
npm run build       # Build production — harus sukses
```

## 8. Struktur penting

```text
src/
├── app/
│   ├── (auth)/login/        # halaman login
│   ├── (dashboard)/         # dashboard + placeholder modul
│   └── api/auth/[...nextauth]/
├── auth.ts                  # konfigurasi Auth.js v5
├── proxy.ts                 # proteksi route (pengganti middleware di Next 16)
├── components/{ui,layout,shared}/
├── features/auth/           # login form + server actions
├── lib/{constants,mock,permissions,validation,utils,db}/
├── config/app.ts            # konfigurasi aplikasi terpusat
└── types/                   # SessionUser, ActionResponse
prisma/
├── schema.prisma            # schema foundation (Phase 2: migrate)
└── seed.ts                  # seed role/permission/admin (Phase 2: db seed)
```

Otorisasi: `requirePermission("PRODUCT_CREATE")` di server component/action.
Jangan hanya menyembunyikan tombol di UI.
