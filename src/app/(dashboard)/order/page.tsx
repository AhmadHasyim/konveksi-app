import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission, requireUser } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { OrderView, type OrderRow, type ProductOption, type Option } from "@/features/order/components/order-view";

export const metadata: Metadata = { title: "Order & Resi" };

export default async function OrderPage() {
  await requirePermission(P.SALES_VIEW);
  const user = await requireUser();

  const [orders, products, colors, sizes] = await Promise.all([
    prisma.salesOrder.findMany({
      orderBy: { date: "desc" },
      take: 300,
      include: {
        items: true,
        picking: { select: { id: true } },
        shipment: { select: { id: true } },
        returns: { select: { id: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, basePrice: true, sizes: { select: { sizeId: true } } },
    }),
    prisma.color.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, hex: true } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, label: true } }),
  ]);

  const rows: OrderRow[] = orders.map((o) => ({
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
    itemCount: o.items.length,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      colorId: i.colorId,
      sizeId: i.sizeId,
      orderedQty: i.orderedQty,
      unitPrice: i.unitPrice,
    })),
    hasPicking: !!o.picking,
    hasShipment: !!o.shipment,
    hasReturn: o.returns.length > 0,
  }));

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    basePrice: p.basePrice,
    sizeIds: p.sizes.map((s) => s.sizeId),
  }));
  const colorOptions: Option[] = colors.map((c) => ({ id: c.id, label: c.name, hex: c.hex }));
  const sizeOptions: Option[] = sizes.map((s) => ({ id: s.id, label: `${s.code} · ${s.label}` }));

  return (
    <PageContainer>
      <PageHeader
        title="Order & Resi"
        description="Order marketplace (Shopee / TikTok) → resi → picking → kirim. Bukan POS — stok hanya berkurang saat pengiriman dikonfirmasi."
      />
      <OrderView
        orders={rows}
        products={productOptions}
        colors={colorOptions}
        sizes={sizeOptions}
        canManage={hasPermission(user, P.SALES_CREATE)}
      />
    </PageContainer>
  );
}
