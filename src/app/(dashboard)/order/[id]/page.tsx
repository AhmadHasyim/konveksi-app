import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer } from "@/components/shared/page-header";
import { OrderDetail, type OrderDetailData } from "@/features/order/components/order-detail";

export const metadata: Metadata = { title: "Detail Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(P.SALES_VIEW);
  const user = await requireUser();
  const { id } = await params;

  const o = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { code: true, name: true, hpp: true } },
          color: { select: { name: true, hex: true } },
          size: { select: { code: true, label: true } },
        },
      },
      picking: { include: { items: true } },
      shipment: { include: { items: true } },
      returns: { include: { items: true } },
    },
  });
  if (!o) notFound();

  const data: OrderDetailData = {
    id: o.id,
    orderNumber: o.orderNumber,
    channel: o.channel,
    date: o.date.toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    shippingNumber: o.shippingNumber,
    status: o.status,
    totalQty: o.totalQty,
    totalAmount: o.totalAmount,
    note: o.note,
    items: o.items.map((i) => ({
      id: i.id,
      productName: `${i.product.code} · ${i.product.name}`,
      variant: [i.color?.name, i.size ? `${i.size.code}` : null].filter(Boolean).join(" / ") || "—",
      orderedQty: i.orderedQty,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      actualQty: o.picking?.items.find((p) => p.orderItemId === i.id)?.actualQty ?? null,
      shippedQty: o.shipment?.items.find((s) => s.orderItemId === i.id)?.qty ?? null,
      returnedQty: o.returns.reduce((s, r) => {
        const ri = r.items.find((x) => x.orderItemId === i.id);
        return s + (ri?.qty ?? 0);
      }, 0),
    })),
    picking: o.picking
      ? { id: o.picking.id, pickedAt: o.picking.pickedAt?.toISOString() ?? null }
      : null,
    shipment: o.shipment
      ? {
          shippingNumber: o.shipment.shippingNumber,
          shippedAt: o.shipment.shippedAt.toISOString(),
          operator: o.shipment.userId ?? null,
        }
      : null,
    returnCount: o.returns.length,
    createdAt: o.createdAt.toISOString(),
  };

  return (
    <PageContainer>
      <OrderDetail
        data={data}
        canManage={hasPermission(user, P.SALES_UPDATE)}
        canPick={hasPermission(user, P.INVENTORY_MANAGE)}
      />
    </PageContainer>
  );
}
