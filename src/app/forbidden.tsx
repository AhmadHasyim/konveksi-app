"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Halaman 403 — dirender saat requirePermission()/requireRole()
 * memanggil forbidden(). Tidak membocorkan detail permission.
 */
export default function Forbidden() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <CardHeader className="items-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert className="size-6" aria-hidden />
          </div>
          <CardTitle>Akses ditolak</CardTitle>
          <CardDescription>
            Akun Anda tidak memiliki izin untuk membuka halaman ini.
            Hubungi administrator bila Anda merasa ini keliru.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <Link className={buttonVariants()} href="/dashboard">
            Kembali ke Dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
