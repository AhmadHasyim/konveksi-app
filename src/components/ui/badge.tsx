import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "outline";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "border-teal-200 bg-teal-50 text-teal-700",
  primary: "border-teal-200 bg-teal-50 text-teal-700",
  secondary: "border-slate-200 bg-slate-100 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-600",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  outline: "border-slate-200 bg-transparent text-slate-600",
};

/** Badge soft — background pastel, bukan solid mencolok. */
export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export const badgeVariants = (opts?: { variant?: BadgeVariant }) =>
  VARIANTS[opts?.variant ?? "default"];
