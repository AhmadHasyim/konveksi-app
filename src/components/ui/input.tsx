import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input modern: h-10, rounded-lg, border slate-200.
 * Focus: ring indigo-100 + border indigo-400.
 */
export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 aria-invalid:border-red-400 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/15",
        className,
      )}
      {...props}
    />
  );
}
