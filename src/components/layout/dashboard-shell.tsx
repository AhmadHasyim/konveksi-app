"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar, SidebarNav } from "@/components/layout/app-sidebar";
import { appConfig } from "@/config/app";
import type { SessionUser } from "@/types/auth";
import type { PermissionCode } from "@/lib/constants/permissions";

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

/**
 * Shell dashboard custom: sidebar desktop (expanded/collapsed) +
 * drawer mobile + header + konten. Tanpa provider sidebar eksternal.
 */
export function DashboardShell({ user, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar permissions={user.permissions as PermissionCode[]} user={user} collapsed={collapsed} />

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} label="Menu navigasi">
        <SidebarNav
          permissions={user.permissions as PermissionCode[]}
          user={user}
          onNavigate={() => setMobileOpen(false)}
        />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onOpenDrawer={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-100 px-6 py-3">
          <p className="mx-auto max-w-[1280px] text-xs text-slate-400">
            {appConfig.footerNote}
          </p>
        </footer>
      </div>
    </div>
  );
}
