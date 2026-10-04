/**
 * CORE bisnis Retur (tanpa auth). Penerimaan retur → status RETURNED;
 * stok naik HANYA utk item restock=true (layak jual), lewat RETURN_IN.
 */
import { prisma } from "@/lib/db/prisma";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";

export interface ReturnInput {
  orderId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  items: { orderItemId: string; qty: number; restock: boolean }[];
}

export async function createReturnCore(
  data: ReturnInput,
  userId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (data.items.length === 0) return fail("EMPTY", "Minimal 1 item retur.");
    for (const i of data.items) {
      if (i.qty < 1) return fail("INVALID_QTY", "Qty retur minimal 1.");
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id: data.orderId },
      include: { shipment: { include: { items: true } } },
    });
    if (!order) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (!["SHIPPED", "COMPLETED", "RETURNED"].includes(order.status))
      return fail("INVALID_STATE", "Hanya order yang sudah terkirim yang bisa diretur.");

    // Validasi qty retur ≤ qty terkirim per item
    const shippedQty = new Map(order.shipment?.items.map((i) => [i.orderItemId, i.qty]) ?? []);
    for (const item of data.items) {
      const sent = shippedQty.get(item.orderItemId) ?? 0;
      if (sent === 0) return fail("INVALID_ITEM", "Item bukan bagian pengiriman order ini.");
      if (item.qty > sent) return fail("OVER_RETURN", `Retur melebihi qty terkirim (maks ${sent}).`);
    }

    const retur = await prisma.$transaction(async (tx) => {
      const created = await tx.return.create({
        data: {
          orderId: data.orderId,
          date: new Date(`${data.date}T00:00:00`),
          userId,
          note: data.note || null,
          items: {
            create: data.items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty, restock: i.restock })),
          },
        },
      });

      for (const item of data.items.filter((i) => i.restock)) {
        const oi = await tx.salesOrderItem.findUnique({
          where: { id: item.orderItemId },
          select: { productId: true, colorId: true, sizeId: true },
        });
        if (!oi) continue;
        const stock = await tx.stock.findFirst({
          where: {
            productId: oi.productId,
            colorId: { equals: oi.colorId },
            sizeId: { equals: oi.sizeId },
          },
        });
        const target =
          stock ??
          (await tx.stock.create({
            data: { productId: oi.productId, colorId: oi.colorId, sizeId: oi.sizeId, qty: 0 },
          }));
        await tx.stock.update({ where: { id: target.id }, data: { qty: { increment: item.qty } } });
        await tx.stockMovement.create({
          data: {
            stockId: target.id,
            type: "RETURN_IN",
            qty: item.qty,
            refType: "RETURN",
            refId: created.id,
            userId,
            note: `Retur order ${order.orderNumber}${stock ? "" : " (baris stok baru)"}`,
          },
        });
      }

      await tx.salesOrder.update({ where: { id: data.orderId }, data: { status: "RETURNED" } });
      return created;
    });

    return ok({ id: retur.id }, "Retur diterima.");
  } catch (err) {
    console.error("[retur:create]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
