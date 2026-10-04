import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer } from "@/components/shared/page-header";
import { PickingForm, type PickingFormData } from "@/features/picking/components/picking-form";

export const metadata: Metadata = { title: "Form Picking" };

export default async function PickingDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requirePermission(P.INVENTORY_VIEW);
  const user = await requireUser();
  const { orderId: id } = await params;

  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { code: true, name: true } },
          color: { select: { name: true, hex: true } },
          size: { select: { code: true } },
        },
      },
      picking: { include: { items: true } },
      shipment: { select: { shippingNumber: true } },
    },
  });
  if (!order) notFound();

  // Stok tersedia per varian (untuk info gudang sebelum konfirmasi)
  const stockQty: Record<string, number | null> = {};
  for (const item of order.items) {
    const stock = await prisma.stock.findFirst({
      where: {
        productId: item.productId,
        colorId: { equals: item.colorId },
        sizeId: { equals: item.sizeId },
      },
      select: { qty: true },
    });
    stockQty[item.id] = stock?.qty ?? null;
  }

  const data: PickingFormData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    channel: order.channel,
    date: order.date.toISOString(),
    status: order.status,
    existingShippingNumber: order.shippingNumber ?? order.shipment?.shippingNumber ?? null,
    pickingId: order.picking?.id ?? null,
    pickedAt: order.picking?.pickedAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      orderItemId: i.id,
      productName: `${i.product.code} · ${i.product.name}`,
      variant: [i.color?.name, i.size?.code].filter(Boolean).join(" / ") || "—",
      orderedQty: i.orderedQty,
      unitPrice: i.unitPrice,
      actualQty: order.picking?.items.find((p) => p.orderItemId === i.id)?.actualQty ?? i.orderedQty,
      note: order.picking?.items.find((p) => p.orderItemId === i.id)?.note ?? "",
      stockQty: stockQty[i.id],
    })),
  };

  return (
    <PageContainer>
      <PickingForm data={data} canManage={hasPermission(user, P.INVENTORY_MANAGE)} />
    </PageContainer>
  );
}
