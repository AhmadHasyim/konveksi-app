import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  LiveSellerView,
  type AttendanceRow,
  type EmployeeOption,
  type LiveSummary,
} from "@/features/hr/components/live-seller-view";

export const metadata: Metadata = { title: "Live Seller" };

export default async function LiveSellerPage() {
  await requirePermission(PERMISSION_CODES.PAYROLL_VIEW);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = new Date(year, now.getMonth(), 1);
  const from = new Date(year - 1, now.getMonth(), 1); // 12 bulan terakhir

  const [attendances, live, target, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: from } },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
      include: { employee: { select: { id: true, name: true, code: true, position: true } } },
    }),
    prisma.salesOrder.aggregate({
      where: { channel: "LIVE", status: { not: "CANCELLED" }, date: { gte: monthStart } },
      _count: { _all: true },
      _sum: { totalQty: true, totalAmount: true },
    }),
    prisma.salesTarget.findUnique({ where: { year_month: { year, month } } }),
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, position: true, isActive: true },
    }),
  ]);

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthRows = attendances.filter((a) => a.date.toISOString().slice(0, 7) === monthPrefix);

  const summary: LiveSummary = {
    monthKey: monthPrefix,
    monthLabel: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now),
    orderCount: live._count._all,
    liveQty: live._sum.totalQty ?? 0,
    liveAmount: live._sum.totalAmount ?? 0,
    targetAmount: target?.targetAmount ?? 0,
    targetPcs: target?.targetPcs ?? 0,
    hadirDays: monthRows.filter((a) => a.code === "WORK" || a.code === "OVERTIME").length,
    sesiTotal: monthRows.reduce((sum, a) => sum + (a.sesi1 ?? 0) + (a.sesi2 ?? 0) + (a.sesi3 ?? 0), 0),
  };

  const rows: AttendanceRow[] = attendances.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    code: a.code,
    sesi1: a.sesi1,
    sesi2: a.sesi2,
    sesi3: a.sesi3,
    overtimeHours: a.overtimeHours === null ? null : Number(a.overtimeHours),
    note: a.note,
    employeeId: a.employeeId,
    employeeName: a.employee.name,
    employeeCode: a.employee.code,
    position: a.employee.position,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Live Seller"
        description="Omzet channel LIVE bulan berjalan, target yang berlaku, dan presensi sesi host live — semua dari data transaksi & presensi."
      />
      <LiveSellerView rows={rows} employees={employees as EmployeeOption[]} summary={summary} />
    </PageContainer>
  );
}
