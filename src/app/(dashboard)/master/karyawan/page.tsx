import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { KaryawanView } from "@/features/master/components/karyawan-view";

export const metadata: Metadata = { title: "Karyawan" };

export default async function KaryawanPage() {
  await requirePermission(PERMISSION_CODES.PAYROLL_VIEW);

  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });

  return (
    <PageContainer>
      <PageHeader
        title="Master Karyawan"
        description="Data karyawan, posisi, dan nominal gaji — dasar form produksi & perhitungan payroll."
      />
      <KaryawanView
        employees={employees.map((e) => ({
          id: e.id,
          code: e.code,
          name: e.name,
          position: e.position,
          baseSalary: e.baseSalary,
          transportAllowance: e.transportAllowance,
          workdayBasis: e.workdayBasis,
          isActive: e.isActive,
        }))}
      />
    </PageContainer>
  );
}
