import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { ReturView, type ReturnRow, type EligibleOrder } from "@/features/retur/components/retur-view";

export const metadata: Metadata = { title: "Retur" };

export default async function ReturPage() {
  await requirePermission(P.SALES_VIEW);
  const user = await requireUser();

  const [returns, eligible] = await Promise.all([
    prisma.return.findMany({
      orderBy: { date: "desc" },
      take: 200,
      include: {
        order: { select: { orderNumber: true, channel: true } },
        user: { select: { username: true } },
        items: {
          include: { orderItem: { include: { product: { select: { code: true, name: true } } } } },
        },
      },
    }),
    prisma.salesOrder.findMany({
      where: { status: { in: ["SHIPPED", "COMPLETED", "RETURNED"] } },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        shipment: { include: { items: true } },
        items: { include: { product: { select: { code: true, name: true } } } },
      },
    }),
  ]);

  const rows: ReturnRow[] = returns.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    date: r.date.toISOString(),
    orderNumber: r.order.orderNumber,
    channel: r.order.channel,
    operator: r.user?.username ?? null,
    note: r.note,
    items: r.items.map((i) => ({
      product: `${i.orderItem.product.code} · ${i.orderItem.product.name}`,
      qty: i.qty,
      restock: i.restock,
    })),
    totalQty: r.items.reduce((s, i) => s + i.qty, 0),
    restockQty: r.items.filter((i) => i.restock).reduce((s, i) => s + i.qty, 0),
  }));

  const eligibleRows: EligibleOrder[] = eligible.map((o) => {
    const shippedQty = new Map(o.shipment?.items.map((i) => [i.orderItemId, i.qty]) ?? []);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      items: o.items
        .filter((i) => (shippedQty.get(i.id) ?? 0) > 0)
        .map((i) => ({
          orderItemId: i.id,
          product: `${i.product.code} · ${i.product.name}`,
          shippedQty: shippedQty.get(i.id) ?? 0,
        })),
    };
  });

  return (
    <PageContainer>
      <PageHeader
        title="Retur"
        description="Penerimaan barang retur → order jadi Retur. Stok hanya naik untuk item yang ditandai layak jual."
      />
      <ReturView rows={rows} eligible={eligibleRows} canManage={hasPermission(user, P.INVENTORY_MANAGE)} />
    </PageContainer>
  );
}
