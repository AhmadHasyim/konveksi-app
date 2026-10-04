import type { Metadata } from "next";
import { requirePermission } from "@/lib/permissions";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { AuditView, type AuditRow } from "@/features/admin/components/audit-view";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  await requirePermission(PERMISSION_CODES.AUDIT_LOG_VIEW);

  const [logs, modules] = await Promise.all([
    prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        module: true,
        recordId: true,
        before: true,
        after: true,
        createdAt: true,
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300, // ponytail:300 entri terakhir; pakai pagination bila log sudah besar
    }),
    prisma.auditLog.findMany({
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    }),
  ]);

  const rows: AuditRow[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    module: l.module,
    recordId: l.recordId,
    before: l.before,
    after: l.after,
    createdAt: l.createdAt.toISOString(),
    user: l.user,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description={`${rows.length} aktivitas terakhir — append-only, tidak bisa diubah/dihapus.`}
      />
      <AuditView logs={rows} modules={modules.map((m) => m.module)} />
    </div>
  );
}
