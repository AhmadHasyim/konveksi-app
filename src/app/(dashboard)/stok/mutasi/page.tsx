import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { MutasiView, type MovementRow } from "@/features/stock/components/mutasi-view";

export const metadata: Metadata = { title: "Mutasi Stok" };

export default async function MutasiPage() {
  await requirePermission(P.INVENTORY_VIEW);

  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      stock: {
        include: {
          product: { select: { code: true, name: true } },
          color: { select: { name: true } },
          size: { select: { code: true } },
        },
      },
      user: { select: { username: true } },
    },
  });

  const rows: MovementRow[] = movements.map((m) => ({
    id: m.id,
    date: m.createdAt.toISOString(),
    product: `${m.stock.product.code} · ${m.stock.product.name}`,
    variant: [m.stock.color?.name, m.stock.size?.code].filter(Boolean).join(" / ") || "—",
    type: m.type,
    qty: m.qty,
    refType: m.refType,
    refId: m.refId,
    user: m.user?.username ?? null,
    note: m.note,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Mutasi Stok"
        description="Jurnal pergerakan barang jadi — produksi masuk, pengiriman, retur, koreksi. Append-only."
      />
      <MutasiView rows={rows} />
    </PageContainer>
  );
}
