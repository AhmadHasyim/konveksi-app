"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary global. Pesan untuk user selalu generik;
 * detail error hanya dicatat ke console server/devtools.
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <CardHeader className="items-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <TriangleAlert className="size-6" aria-hidden />
          </div>
          <CardTitle>Data gagal dimuat</CardTitle>
          <CardDescription>
            Terjadi kesalahan. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 flex justify-center gap-2">
          <Button onClick={reset}>Coba lagi</Button>
        </CardContent>
      </Card>
    </main>
  );
}
