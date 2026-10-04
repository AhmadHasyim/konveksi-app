import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { BahanView } from "@/features/master/components/bahan-view";

export const metadata: Metadata = { title: "Bahan Baku" };

export default async function BahanBakuPage() {
  await requirePermission(PERMISSION_CODES.INVENTORY_VIEW);

  const fabrics = await prisma.fabric.findMany({ orderBy: { name: "asc" } });

  return (
    <PageContainer>
      <PageHeader
        title="Master Bahan Baku"
        description="Jenis kain dan material — stok per warna dikelola di modul Persediaan."
      />
      <BahanView
        fabrics={fabrics.map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          unit: f.unit as "ROLL" | "METER" | "YARD",
        }))}
      />
    </PageContainer>
  );
}
