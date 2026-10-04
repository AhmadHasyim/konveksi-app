/**
 * CORE bisnis Order (tanpa auth — dipanggil actions yang sudah
 * requirePermission, dan test script via prisma lokal).
 */
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";

const CHANNELS = ["SHOPEE", "TIKTOK", "LIVE", "DROPSHIP", "RESELLER", "OFFLINE"] as const;

const itemSchema = z.object({
  productId: z.string().min(1, "Pilih produk"),
  colorId: z.string().min(1).nullable().optional(),
  sizeId: z.string().min(1).nullable().optional(),
  orderedQty: z.number().int().min(1, "Qty minimal 1").max(10_000),
  unitPrice: z.number().int().min(0).max(100_000_000),
});

export const createOrderSchema = z.object({
  channel: z.enum(CHANNELS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  customerName: z.string().trim().max(120).optional().default(""),
  customerPhone: z.string().trim().max(30).optional().default(""),
  resellerId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(500).optional().default(""),
  items: z.array(itemSchema).min(1, "Minimal 1 item").max(100),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;

async function assertProducts(items: z.infer<typeof itemSchema>[]) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const found = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, isActive: true },
  });
  const map = new Map(found.map((p) => [p.id, p]));
  for (const id of ids) {
    const p = map.get(id);
    if (!p) return `Produk tidak ditemukan (${id}).`;
    if (!p.isActive) return "Produk non-aktif tidak bisa dijual.";
  }
  return null;
}

function totals(items: z.infer<typeof itemSchema>[]) {
  return {
    totalQty: items.reduce((s, i) => s + i.orderedQty, 0),
    totalAmount: items.reduce((s, i) => s + i.orderedQty * i.unitPrice, 0),
  };
}

/** Buat order baru. Status awal PENDING. Nomor: ORD-YYYYMMDD-001 (unik/hari). */
export async function createOrderCore(
  input: CreateOrderInput,
): Promise<ActionResponse<{ id: string; orderNumber: string }>> {
  try {
    const data = createOrderSchema.parse(input);
    const invalid = await assertProducts(data.items);
    if (invalid) return fail("INVALID_PRODUCT", invalid);

    const { totalQty, totalAmount } = totals(data.items);
    const day = data.date.replaceAll("-", "");
    const seq =
      (await prisma.salesOrder.count({ where: { orderNumber: { startsWith: `ORD-${day}` } } })) + 1;
    const orderNumber = `ORD-${day}-${String(seq).padStart(3, "0")}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        channel: data.channel,
        date: new Date(`${data.date}T00:00:00`),
        entityId: null, // pelanggan marketplace ditampung di customerName/Phone
        resellerId: data.resellerId ?? null,
        status: "PENDING",
        totalQty,
        totalAmount,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        note: data.note || null,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            colorId: i.colorId ?? null,
            sizeId: i.sizeId ?? null,
            orderedQty: i.orderedQty,
            unitPrice: i.unitPrice,
            subtotal: i.orderedQty * i.unitPrice,
          })),
        },
      },
      select: { id: true, orderNumber: true },
    });

    return ok({ id: order.id, orderNumber: order.orderNumber }, "Order dibuat.");
  } catch (err) {
    console.error("[order:create]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Ubah order — hanya selama status PENDING & belum ada shipment. */
export async function updateOrderCore(
  id: string,
  input: CreateOrderInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const data = createOrderSchema.parse(input);
    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { shipment: true },
    });
    if (!existing) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (existing.shipment) return fail("LOCKED", "Order sudah terkirim — tidak bisa diubah.");
    if (existing.status !== "PENDING")
      return fail("LOCKED", "Hanya order berstatus Pending yang bisa diubah.");

    const invalid = await assertProducts(data.items);
    if (invalid) return fail("INVALID_PRODUCT", invalid);
    const { totalQty, totalAmount } = totals(data.items);

    await prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { orderId: id } });
      await tx.salesOrder.update({
        where: { id },
        data: {
          channel: data.channel,
          date: new Date(`${data.date}T00:00:00`),
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          resellerId: data.resellerId ?? null,
          note: data.note || null,
          totalQty,
          totalAmount,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              colorId: i.colorId ?? null,
              sizeId: i.sizeId ?? null,
              orderedQty: i.orderedQty,
              unitPrice: i.unitPrice,
              subtotal: i.orderedQty * i.unitPrice,
            })),
          },
        },
      });
    });

    return ok({ id }, "Order diperbarui.");
  } catch (err) {
    console.error("[order:update]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Batalkan order — hanya sebelum terkirim. */
export async function cancelOrderCore(orderId: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, shipment: { select: { id: true } } },
    });
    if (!order) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (order.shipment || order.status === "SHIPPED" || order.status === "COMPLETED")
      return fail("LOCKED", "Order sudah terkirim — tidak bisa dibatalkan.");

    await prisma.salesOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    return ok({ id: orderId }, "Order dibatalkan.");
  } catch (err) {
    console.error("[order:cancel]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
