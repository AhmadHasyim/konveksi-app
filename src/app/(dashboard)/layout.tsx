import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/permissions";

/**
 * Layout area dashboard: shell custom (sidebar + drawer + header + konten).
 * Defense in depth: selain proxy, layout memastikan user login.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
