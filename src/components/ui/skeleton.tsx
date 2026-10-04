import * as React from "react";
import { cn } from "@/lib/utils";

/** Skeleton loading: animate-pulse dengan warna slate lembut. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
}
