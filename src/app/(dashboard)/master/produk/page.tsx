import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { ProdukView } from "@/features/master/components/produk-view";

export const metadata: Metadata = { title: "Produk" };

export default async function ProdukPage() {
  await requirePermission(PERMISSION_CODES.PRODUCT_VIEW);

  const [products, sizes, colors] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { sizes: { select: { sizeId: true } } },
    }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.color.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Master Produk"
        description="Katalog produk, daftar warna, dan ukuran — sumber kebenaran untuk semua modul (stok, produksi, penjualan)."
      />
      <ProdukView
        products={products.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          type: p.type,
          basePrice: p.basePrice,
          isActive: p.isActive,
          sizeIds: p.sizes.map((s) => s.sizeId),
        }))}
        sizes={sizes.map((s) => ({ id: s.id, code: s.code, label: s.label, sortOrder: s.sortOrder }))}
        colors={colors.map((c) => ({ id: c.id, code: c.code, name: c.name, hex: c.hex }))}
      />
    </PageContainer>
  );
}
