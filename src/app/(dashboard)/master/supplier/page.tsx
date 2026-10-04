import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { SupplierView } from "@/features/master/components/supplier-view";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierPage() {
  await requirePermission(PERMISSION_CODES.INVENTORY_VIEW);

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <PageContainer>
      <PageHeader title="Master Supplier" description="Pemasok bahan baku dan jasa — dipakai modul pembelian." />
      <SupplierView
        suppliers={suppliers.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          phone: s.phone,
          address: s.address,
          isActive: s.isActive,
        }))}
      />
    </PageContainer>
  );
}
