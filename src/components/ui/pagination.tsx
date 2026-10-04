"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Pagination ringan: prev / nomor / next dengan state aktif indigo. */
export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const btn =
    "flex size-8 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-teal-200 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Navigasi halaman" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btn, "text-slate-600 hover:bg-slate-100")}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-label={`Halaman ${p}`}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
          className={cn(
            btn,
            p === page
              ? "bg-teal-600 font-semibold text-white"
              : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        aria-label="Halaman berikutnya"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(btn, "text-slate-600 hover:bg-slate-100")}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
