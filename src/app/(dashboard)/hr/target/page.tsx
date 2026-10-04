import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { TargetView, type TargetRow } from "@/features/hr/components/target-view";

export const metadata: Metadata = { title: "Target Sales" };

export default async function TargetPage() {
  await requirePermission(PERMISSION_CODES.PAYROLL_VIEW);

  const currentYear = new Date().getFullYear();

  const targets = await prisma.salesTarget.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  // Aktual per periode: agregat order non-batal dari tahun target terjauh → sekarang.
  const minYear = targets.length > 0 ? Math.min(...targets.map((t) => t.year)) : currentYear;
  const orders = await prisma.salesOrder.findMany({
    where: { date: { gte: new Date(minYear, 0, 1), lte: new Date() }, status: { not: "CANCELLED" } },
    select: { date: true, totalQty: true, totalAmount: true },
  });

  const actuals = new Map<string, { pcs: number; amount: number }>();
  for (const o of orders) {
    const key = `${o.date.getFullYear()}-${o.date.getMonth() + 1}`;
    const cur = actuals.get(key) ?? { pcs: 0, amount: 0 };
    cur.pcs += o.totalQty;
    cur.amount += o.totalAmount;
    actuals.set(key, cur);
  }

  const rows: TargetRow[] = targets.map((t) => {
    const actual = actuals.get(`${t.year}-${t.month}`) ?? { pcs: 0, amount: 0 };
    return {
      id: t.id,
      year: t.year,
      month: t.month,
      targetPcs: t.targetPcs,
      targetAmount: t.targetAmount,
      commissionPct: Number(t.commissionPct),
      upTargetPct: Number(t.upTargetPct),
      actualPcs: actual.pcs,
      actualAmount: actual.amount,
    };
  });

  return (
    <PageContainer>
      <PageHeader
        title="Target Sales"
        description="Target pcs & omzet bulanan beserta komisi dan up-target — capaian dihitung dari order non-batal seluruh channel."
      />
      <TargetView rows={rows} currentYear={currentYear} />
    </PageContainer>
  );
}
