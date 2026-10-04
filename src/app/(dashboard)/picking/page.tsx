import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PickingListView, type PickingListRow } from "@/features/picking/components/picking-list-view";

export const metadata: Metadata = { title: "Picking" };

export default async function PickingPage() {
  await requirePermission(P.INVENTORY_VIEW);
  const user = await requireUser();

  const orders = await prisma.salesOrder.findMany({
    where: { status: { in: ["PENDING", "PICKING", "PICKED"] } },
    orderBy: { date: "asc" },
    include: {
      items: { select: { id: true, orderedQty: true } },
      picking: { select: { id: true, pickedAt: true } },
    },
  });

  const rows: PickingListRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    channel: o.channel,
    date: o.date.toISOString(),
    status: o.status,
    shippingNumber: o.shippingNumber,
    itemCount: o.items.length,
    totalOrdered: o.items.reduce((s, i) => s + i.orderedQty, 0),
    hasPicking: !!o.picking,
    pickedAt: o.picking?.pickedAt?.toISOString() ?? null,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Picking"
        description="Ambil barang sesuai order, isi Actual Qty (≤ qty pesanan), lalu konfirmasi pengiriman — stok baru berkurang di situ."
      />
      <PickingListView rows={rows} canManage={hasPermission(user, P.INVENTORY_MANAGE)} />
    </PageContainer>
  );
}
