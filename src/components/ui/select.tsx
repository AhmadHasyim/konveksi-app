"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.ComponentProps<"select">, "children"> {
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Select modern berbasis <select> native (keyboard accessible penuh)
 * dengan chevron Lucide. Untuk dropdown menu aksi, pakai DropdownMenu.
 */
export function Select({ className, options, placeholder, ...props }: SelectProps) {
  return (
    <span className={cn("relative inline-flex w-full items-center")}>
      <select
        className={cn(
          "h-10 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-card pr-9 pl-3 text-sm text-slate-900 transition-colors outline-none hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 size-4 shrink-0 text-slate-400"
      />
    </span>
  );
}
