"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Scissors } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logoutAction } from "@/features/auth/actions";
import { appConfig } from "@/config/app";
import { filterMenu, groupMenu, MENU_ITEMS } from "@/components/layout/menu";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { PermissionCode } from "@/lib/constants/permissions";
import type { SessionUser } from "@/types/auth";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  permissions: PermissionCode[];
  user?: SessionUser | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function initials(name: string): string {
  return name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

const LINK_BASE =
  "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none";
const LINK_ACTIVE =
  "bg-teal-50 font-medium text-teal-700 before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-teal-600";
const LINK_IDLE = "font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900";

/**
 * Isi navigasi sidebar — dipakai ulang di sidebar desktop & drawer mobile.
 */
export function SidebarNav({ permissions, user, collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = groupMenu(filterMenu(MENU_ITEMS, permissions));

  const roleLabel = user
    ? user.roles.map((r) => ROLE_LABELS[r.code] ?? r.name).join(", ")
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4 pb-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label={`${appConfig.shortName} — ke dashboard`}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-1 py-1 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-600 text-white shadow-[0_1px_2px_0_rgb(13_148_136/0.4)] transition-transform group-hover:scale-[1.03]">
            <Scissors className="size-[18px]" aria-hidden />
          </span>
          {!collapsed && (
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                {appConfig.brandName}
              </span>
              <span className="truncate text-xs font-normal text-slate-600">
                {appConfig.brandSubtitle}
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.key} className="py-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) =>
                item.children ? (
                  <li key={item.href}>
                    {!collapsed && (
                      <p className="flex items-center gap-2 px-2 pt-1 pb-0.5 text-[13px] font-medium text-slate-600">
                        <item.icon className="size-3.5" aria-hidden />
                        {item.title}
                      </p>
                    )}
                    <ul className={cn("space-y-0.5", !collapsed && "py-0.5")}>
                      {item.children.map((child) => {
                        const active = isActive(pathname, child.href);
                        const link = (
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            aria-label={collapsed ? child.title : undefined}
                            title={collapsed ? child.title : undefined}
                            className={cn(
                              LINK_BASE,
                              active ? LINK_ACTIVE : LINK_IDLE,
                              collapsed && "justify-center px-0",
                            )}
                          >
                            <child.icon
                              className={cn(
                                "size-4 shrink-0",
                                active ? "text-teal-600" : "text-slate-400",
                              )}
                              aria-hidden
                            />
                            {!collapsed && <span className="truncate">{child.title}</span>}
                          </Link>
                        );
                        return (
                          <li key={child.href}>
                            {collapsed ? (
                              <Tooltip>
                                <TooltipTrigger className="block w-full">{link}</TooltipTrigger>
                                <TooltipContent>{child.title}</TooltipContent>
                              </Tooltip>
                            ) : (
                              link
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ) : (
                  <li key={item.href}>
                    {(() => {
                      const active = isActive(pathname, item.href);
                      const link = (
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          aria-label={collapsed ? item.title : undefined}
                          title={collapsed ? item.title : undefined}
                          className={cn(
                            LINK_BASE,
                            active ? LINK_ACTIVE : LINK_IDLE,
                            collapsed && "justify-center px-0",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-teal-600" : "text-slate-400",
                            )}
                            aria-hidden
                          />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                      );
                      return collapsed ? (
                        <Tooltip>
                          <TooltipTrigger className="block w-full">{link}</TooltipTrigger>
                          <TooltipContent>{item.title}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      );
                    })()}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3">
        {user ? (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5",
              collapsed && "justify-center border-0 bg-transparent p-0",
            )}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs font-semibold">
                {initials(user.username)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {user.username}
                  </span>
                  <span className="truncate text-xs text-slate-600">
                    {roleLabel ?? "Pengguna"}
                  </span>
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    aria-label="Keluar dari aplikasi"
                    title="Keluar"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:outline-none"
                  >
                    <LogOut className="size-4" aria-hidden />
                  </button>
                </form>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Sidebar desktop: fixed, mendukung expanded & collapsed. */
export function AppSidebar({
  permissions,
  user,
  collapsed,
}: {
  permissions: PermissionCode[];
  user?: SessionUser | null;
  collapsed?: boolean;
}) {
  return (
    <aside
      aria-label="Sidebar navigasi"
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-slate-100 bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <SidebarNav permissions={permissions} user={user} collapsed={collapsed} />
    </aside>
  );
}
