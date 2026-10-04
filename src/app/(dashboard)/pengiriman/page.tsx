import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PengirimanView, type ShipmentRow, type WaitingRow } from "@/features/shipping/components/pengiriman-view";

export const metadata: Metadata = { title: "Pengiriman" };

export default async function PengirimanPage() {
  await requirePermission(P.SALES_VIEW);

  const [shipments, waiting] = await Promise.all([
    prisma.shipment.findMany({
      orderBy: { shippedAt: "desc" },
      take: 300,
      include: {
        order: { select: { orderNumber: true, channel: true, customerName: true } },
        user: { select: { username: true } },
        items: { select: { qty: true } },
      },
    }),
    prisma.salesOrder.findMany({
      where: { status: { in: ["PICKED", "READY_TO_SHIP"] } },
      orderBy: { date: "asc" },
      include: { items: { select: { orderedQty: true } } },
    }),
  ]);

  const rows: ShipmentRow[] = shipments.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    orderNumber: s.order.orderNumber,
    channel: s.order.channel,
    customerName: s.order.customerName,
    shippingNumber: s.shippingNumber,
    shippedAt: s.shippedAt.toISOString(),
    operator: s.user?.username ?? null,
    totalQty: s.items.reduce((a, i) => a + i.qty, 0),
    itemCount: s.items.length,
  }));

  const waitRows: WaitingRow[] = waiting.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    channel: o.channel,
    date: o.date.toISOString(),
    totalQty: o.items.reduce((a, i) => a + i.orderedQty, 0),
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Pengiriman"
        description="Riwayat pengiriman (resi) + antrean order yang sudah dipicked menunggu konfirmasi kirim."
      />
      <PengirimanView rows={rows} waiting={waitRows} />
    </PageContainer>
  );
}
