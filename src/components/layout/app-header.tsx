"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, LogOut, Menu, PanelLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logoutAction } from "@/features/auth/actions";
import { PATH_LABELS } from "@/components/layout/menu";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { SessionUser } from "@/types/auth";

interface AppHeaderProps {
  user: SessionUser;
  onToggleCollapse: () => void;
  onOpenDrawer: () => void;
}

function initials(name: string): string {
  return name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Header ringan: trigger, breadcrumb, search, notifikasi, profil. */
export function AppHeader({ user, onToggleCollapse, onOpenDrawer }: AppHeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    return { href, label: PATH_LABELS[href] ?? seg, last: i === segments.length - 1 };
  });

  const roleLabels = user.roles.map((r) => ROLE_LABELS[r.code] ?? r.name).join(", ");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 bg-background/85 px-3 backdrop-blur-md md:gap-3 md:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Buka menu navigasi"
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none md:hidden"
      >
        <Menu className="size-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label="Ciutkan/lebarkan sidebar"
        className="hidden size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none md:flex"
      >
        <PanelLeft className="size-[18px]" aria-hidden />
      </button>
      <span aria-hidden className="hidden h-5 w-px bg-slate-200 sm:block" />

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((c) => (
            <li key={c.href} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0 text-slate-600" aria-hidden />
              {c.last ? (
                <span aria-current="page" className="truncate font-semibold text-slate-900">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-slate-600 transition-colors hover:text-teal-600"
                >
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <SearchInput
        placeholder="Cari produk, transaksi…"
        aria-label="Pencarian global"
        className="hidden w-64 lg:inline-flex"
      />

      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            aria-label="Notifikasi (segera hadir)"
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none"
          >
            <Bell className="size-[18px]" aria-hidden />
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>Notifikasi akan tersedia pada phase berikutnya.</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Menu profil ${user.username}`}
          className="flex h-10 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold">
              {initials(user.username)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-28 truncate text-sm font-medium text-slate-900">
              {user.username}
            </span>
            <span className="block max-w-28 truncate text-xs text-slate-600">
              {roleLabels}
            </span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <span className="flex items-center gap-2.5">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs font-semibold">
                  {initials(user.username)}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {user.username}
                </span>
                <span className="truncate text-xs font-normal text-slate-600">
                  {roleLabels}
                </span>
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void logoutAction()} className="text-red-600 hover:bg-red-50 [&_svg]:text-red-600">
            <LogOut className="size-4" aria-hidden />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
