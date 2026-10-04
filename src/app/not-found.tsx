import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <CardHeader className="items-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <FileQuestion className="size-6" aria-hidden />
          </div>
          <CardTitle>Halaman tidak ditemukan</CardTitle>
          <CardDescription>
            Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} href="/dashboard">
            Kembali ke Dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
