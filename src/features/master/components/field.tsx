"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Label + kontrol + pesan error/tooltip — bangunan dasar semua form master. */
export function FormField({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-[13px] font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Input rupiah: tampil Rp 58.500, nilai number bulat. */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  id,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <span className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-sm text-slate-400">Rp</span>
      <Input
        id={id}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={value ? new Intl.NumberFormat("id-ID").format(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits ? Math.min(Number(digits), 2_000_000_000) : 0);
        }}
        className="pl-9 text-right tabular-nums"
      />
    </span>
  );
}

/** Pilihan tunggal berbentuk chip (tipe produk, satuan bahan, dst). */
export function SegmentedChips<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-stretch gap-2", className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-14 min-w-32 flex-1 flex-col items-start justify-center gap-0.5 rounded-xl border px-3.5 py-2 text-left transition-all",
              active
                ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                : "border-slate-200 bg-card hover:border-teal-300 hover:bg-teal-50/40",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              {active ? <Check className="size-3.5 text-teal-600" aria-hidden /> : null}
              {o.label}
            </span>
            {o.description ? (
              <span className="text-xs whitespace-nowrap text-slate-500">{o.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select berbentuk chip grid (ukuran per produk). */
export function ChipMultiSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "border-teal-500 bg-teal-600 text-white shadow-sm"
                : "border-slate-200 bg-card text-slate-600 hover:border-teal-300 hover:text-teal-700",
            )}
          >
            {active ? <Check className="size-3.5" aria-hidden /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Toggle status aktif/nonaktif. */
export function ActiveToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        value
          ? "border-teal-300 bg-teal-50 text-teal-700"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          value ? "bg-teal-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white shadow transition-all",
            value ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {value ? "Aktif" : "Nonaktif"}
    </button>
  );
}
