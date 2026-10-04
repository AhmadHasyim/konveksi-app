import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PayrollView, type EmployeeOption, type PayrollRow } from "@/features/hr/components/payroll-view";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  await requirePermission(PERMISSION_CODES.PAYROLL_VIEW);

  const [payrolls, employees] = await Promise.all([
    prisma.payroll.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }, { createdAt: "asc" }],
      include: { employee: { select: { id: true, name: true, code: true } } },
    }),
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, position: true, isActive: true },
    }),
  ]);

  const rows: PayrollRow[] = payrolls.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    employeeName: p.employee.name,
    employeeCode: p.employee.code,
    year: p.year,
    month: p.month,
    basePay: p.basePay,
    transport: p.transport,
    overtime: p.overtime,
    bonus: p.bonus,
    deduction: p.deduction,
    total: p.total,
    status: p.status,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    note: p.note,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Payroll"
        description="Slip gaji bulanan: pokok, tunjangan, lembur, bonus, dan potongan — total dihitung ulang di server."
      />
      <PayrollView rows={rows} employees={employees as EmployeeOption[]} />
    </PageContainer>
  );
}
