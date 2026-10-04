import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { BarangJadiView, type StockRow } from "@/features/stock/components/barang-jadi-view";

export const metadata: Metadata = { title: "Barang Jadi" };

export default async function BarangJadiPage() {
  await requirePermission(P.INVENTORY_VIEW);

  const stocks = await prisma.stock.findMany({
    take: 500,
    include: {
      product: { select: { code: true, name: true, isActive: true } },
      color: { select: { name: true, hex: true } },
      size: { select: { code: true, label: true } },
    },
  });

  const rows: StockRow[] = stocks.map((s) => ({
    id: s.id,
    productCode: s.product.code,
    productName: s.product.name,
    productActive: s.product.isActive,
    colorName: s.color?.name ?? null,
    colorHex: s.color?.hex ?? null,
    sizeCode: s.size?.code ?? null,
    sizeLabel: s.size?.label ?? null,
    qty: s.qty,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Barang Jadi"
        description="Stok per produk × warna × ukuran. Berkurang otomatis saat pengiriman dikonfirmasi, bertambah dari hasil produksi & retur layak jual."
      />
      <BarangJadiView rows={rows} />
    </PageContainer>
  );
}
