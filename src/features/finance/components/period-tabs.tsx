"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type PeriodKey } from "@/features/finance/period";

/** Tab periode laporan — link GET biasa (server refetch, tanpa state client). */
export function PeriodTabs({ current, basePath }: { current: PeriodKey; basePath: string }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {PERIOD_OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={`${basePath}?period=${o.key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === o.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
