import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "default" | "destructive" | "success" | "warning" | "info";

const VARIANTS: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-card text-slate-700",
  destructive: "border-red-200 bg-red-50/60 text-red-700",
  success: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
  warning: "border-amber-200 bg-amber-50/60 text-amber-700",
  info: "border-blue-200 bg-blue-50/60 text-blue-700",
};

export function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      role="alert"
      className={cn(
        "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-2 rounded-lg border px-3 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-start-2 font-medium", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("col-start-2 text-sm leading-relaxed", className)} {...props} />
  );
}
