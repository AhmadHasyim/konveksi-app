import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { HppView, type HppRow } from "@/features/finance/components/hpp-view";

export const metadata: Metadata = { title: "HPP" };

export default async function HppPage() {
  await requirePermission(P.HPP_VIEW);
  const user = await requireUser();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, basePrice: true, hpp: true },
  });

  const rows: HppRow[] = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    basePrice: p.basePrice,
    hpp: p.hpp,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="HPP — Harga Pokok Penjualan"
        description="Data SENSITIF — hanya Owner. HPP flat per produk (fasal biaya rinci menyusul). Dipakai perhitungan Keuntungan & Margin."
      />
      <HppView rows={rows} canEdit={hasPermission(user, P.HPP_MANAGE)} />
    </PageContainer>
  );
}
