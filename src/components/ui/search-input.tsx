"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Search field dengan ikon Lucide — varian toolbar & header. */
export function SearchInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <span className={cn("relative inline-flex w-full items-center", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 size-4 shrink-0 text-slate-400"
      />
      <input
        type="search"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-400 focus:bg-card focus:ring-2 focus:ring-teal-100"
        {...props}
      />
    </span>
  );
}
