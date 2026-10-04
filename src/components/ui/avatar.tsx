import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "default" | "lg";

const SIZES: Record<AvatarSize, string> = {
  sm: "size-6 text-[10px]",
  default: "size-8 text-xs",
  lg: "size-10 text-sm",
};

/** Avatar inisial — lingkaran indigo-100, tanpa library eksternal. */
export function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: AvatarSize }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 font-semibold text-teal-700 select-none",
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  alt = "",
  ...props
}: React.ComponentProps<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("flex size-full items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700", className)}
      {...props}
    />
  );
}
