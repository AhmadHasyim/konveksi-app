import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive"
  | "link"
  | "default";
export type ButtonSize = "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-lg";

const BASE_STYLES =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const VARIANTS: Record<Exclude<ButtonVariant, "default">, string> = {
  primary:
    "bg-teal-600 text-white shadow-[0_1px_2px_0_rgb(13_148_136/0.35)] hover:bg-teal-700",
  secondary: "bg-teal-50 text-teal-700 hover:bg-teal-100",
  outline:
    "border-slate-200 bg-card text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
  destructive: "bg-red-50 text-red-600 hover:bg-red-100",
  link: "text-teal-600 underline-offset-4 hover:underline",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
  default: "h-9 px-4",
  lg: "h-10 px-5 text-[15px]",
  icon: "size-9",
  "icon-sm": "size-7 rounded-md",
  "icon-lg": "size-10",
};

/**
 * Class string tombol — pakai untuk <Link>/<a> agar hierarchy
 * visual konsisten tanpa wrapper button yang invalid.
 */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "default",
  className?: string,
): string {
  const v = variant === "default" ? "primary" : variant;
  return cn(BASE_STYLES, VARIANTS[v], SIZES[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Tombol custom Tailwind-only: primary / secondary / outline / ghost / danger / link. */
export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, size, className)}
      {...props}
    />
  );
}

/** Kompat: UNKNOWN_PLACEHOLDER — gunakan buttonStyles() untuk <Link>. */
export const buttonVariants = (opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => buttonStyles(opts?.variant, opts?.size, opts?.className);
