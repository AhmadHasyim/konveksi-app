"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const MenuContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

function useMenu() {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("DropdownMenu.* harus di dalam <DropdownMenu>");
  return ctx;
}

/**
 * Dropdown custom: klik trigger → panel rounded-lg shadow-lg,
 * klik di luar / Escape menutup, keyboard accessible.
 */
export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { open, setOpen } = useMenu();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = "end",
}: React.ComponentProps<"div"> & { align?: "start" | "end" | "center" }) {
  const { open } = useMenu();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      ref.current?.querySelector<HTMLElement>("button, [href]")?.focus();
    }
  }, [open ]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "animate-popover-in absolute z-50 mt-1.5 w-60 origin-top overflow-hidden rounded-xl border border-slate-100 bg-card p-1.5 shadow-lg",
        align === "end" && "right-0",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-2 py-1.5 text-xs font-medium text-slate-600", className)} {...props} />
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div role="separator" className={cn("-mx-1.5 my-1.5 h-px bg-slate-100", className)} {...props} />
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors outline-none hover:bg-slate-100 focus-visible:bg-slate-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

// Kompat: tidak dipakai lagi, dipertahankan agar impor lama tidak pecah.
export const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuShortcut = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span className={cn("ml-auto text-xs text-slate-400", className)} {...props} />
);
