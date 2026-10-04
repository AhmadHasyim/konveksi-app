import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Sistem Manajemen Konveksi & Penjualan.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      {/* Panel brand / visual */}
      <section
        aria-label="Identitas aplikasi"
        className="relative hidden overflow-hidden bg-teal-50 lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 320px at 20% 15%, rgba(13,148,136,0.16), transparent 60%), radial-gradient(500px 300px at 85% 80%, rgba(16,185,129,0.14), transparent 60%), linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Scissors className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-slate-800">
              {appConfig.brandName}
            </span>
            <span className="block text-xs text-slate-600">
              {appConfig.brandSubtitle}
            </span>
          </span>
        </div>

        <div className="relative max-w-md space-y-5">
          <p className="inline-flex items-center rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-medium text-teal-700">
            Sistem internal konveksi & penjualan
          </p>
          <h1 className="text-4xl leading-[1.15] font-semibold tracking-tight text-slate-800">
            Kelola produksi, penjualan, dan tim dalam satu tempat.
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-600">
            Pantau target sales, stok bahan, progres produksi, dan payroll —
            dirancang untuk kecepatan kerja pegawai kantor.
          </p>
          <dl className="grid grid-cols-3 gap-4 pt-2">
            {[
              ["Produksi", "Terpantau"],
              ["Penjualan", "Terpusat"],
              ["Payroll", "Akurat"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white bg-white/70 p-3">
                <dt className="text-xs text-slate-600">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-slate-400">
          © 2026 {appConfig.brandName} · Data internal perusahaan
        </p>
      </section>

      {/* Panel form */}
      <section aria-label="Formulir masuk" className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              {appConfig.brandName}
            </p>
            <p className="text-sm text-slate-600">{appConfig.brandSubtitle}</p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Akses terbatas untuk pegawai berwenang.
            <br />
            Hubungi administrator jika Anda terkunci.
          </p>
        </div>
      </section>
    </main>
  );
}