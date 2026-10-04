/**
 * CORE bisnis Picking → Pengiriman (tanpa auth — dipanggil dari actions
 * yang sudah requirePermission, dan dari test script via prisma lokal).
 * Transaksi atomik: validasi stok → shipment → kurangi stok → movement → SHIPPED.
 */
import { prisma } from "@/lib/db/prisma";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";

/** Error domain: pesan validasi bisnis aman tampil ke client. */
export class ShipmentError extends Error {}

export interface ActualEntry {
  orderItemId: string;
  actualQty: number;
  note?: string;
}

/** Order PENDING → buat picking draft (1 order = 1 picking, idempotent). */
export async function generatePickingCore(
  orderId: string,
  userId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: { select: { id: true } }, picking: { select: { id: true } } },
    });
    if (!order) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (order.status !== "PENDING" && order.status !== "PICKING")
      return fail("LOCKED", `Order berstatus ${order.status} — tidak bisa di-picking.`);
    if (order.picking) return ok({ id: order.picking.id }, "Picking sudah ada.");
    if (order.items.length === 0) return fail("EMPTY", "Order tanpa item.");

    const picking = await prisma.$transaction(async (tx) => {
      const created = await tx.picking.create({
        data: {
          orderId,
          items: { create: order.items.map((i) => ({ orderItemId: i.id, actualQty: 0 })) },
        },
      });
      await tx.salesOrder.update({ where: { id: orderId }, data: { status: "PICKING" } });
      return created;
    });

    return ok({ id: picking.id }, "Picking dibuat.");
  } catch (err) {
    console.error("[picking:generate]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/**
 * Simpan Actual Qty. Validasi: actualQty ≤ orderedQty (lebih → tolak),
 * semua item wajib terisi, item harus milik order tsb. Status → PICKED.
 */
export async function saveActualQtyCore(
  pickingId: string,
  entries: ActualEntry[],
  userId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const picking = await prisma.picking.findUnique({
      where: { id: pickingId },
      include: {
        order: { select: { id: true, status: true } },
        items: { select: { id: true, orderItemId: true, orderItem: { select: { orderedQty: true } } } },
      },
    });
    if (!picking) return fail("NOT_FOUND", "Picking tidak ditemukan.");
    if (picking.order.status === "SHIPPED" || picking.order.status === "COMPLETED")
      return fail("LOCKED", "Order sudah terkirim.");
    if (picking.order.status === "CANCELLED") return fail("LOCKED", "Order dibatalkan.");

    const byItem = new Map(entries.map((e) => [e.orderItemId, e]));
    const allowedIds = new Set(picking.items.map((i) => i.orderItemId));

    for (const item of picking.items) {
      const e = byItem.get(item.orderItemId);
      if (!e) return fail("INCOMPLETE", "Semua item wajib diisi actual qty-nya.");
      if (e.actualQty > item.orderItem.orderedQty)
        return fail("OVER_PICK", `Actual qty melebihi jumlah pesanan (maks ${item.orderItem.orderedQty}).`);
    }
    for (const id of byItem.keys()) {
      if (!allowedIds.has(id)) return fail("INVALID_ITEM", "Item tidak termasuk order ini.");
    }

    await prisma.$transaction(async (tx) => {
      for (const item of picking.items) {
        const e = byItem.get(item.orderItemId)!;
        await tx.pickingItem.update({
          where: { id: item.id },
          data: { actualQty: e.actualQty, note: e.note || null },
        });
      }
      await tx.picking.update({
        where: { id: picking.id },
        data: { pickedAt: new Date(), pickedByUser: userId },
      });
      await tx.salesOrder.update({ where: { id: picking.order.id }, data: { status: "PICKED" } });
    });

    return ok({ id: picking.id }, "Actual qty tersimpan.");
  } catch (err) {
    console.error("[picking:actual]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/**
 * KONFIRMASI PENGIRIMAN — satu-satunya tempat stok barang jadi berkurang.
 * Validasi stok → Shipment+items → kurangi Stock → SALE_SHIPMENT movement →
 * status SHIPPED. Gagal di tengah = ROLLBACK penuh.
 */
export async function confirmShipmentCore(
  pickingId: string,
  shippingNumber: string,
  userId: string,
): Promise<ActionResponse<{ id: string; shippingNumber: string }>> {
  try {
    const picking = await prisma.picking.findUnique({
      where: { id: pickingId },
      include: {
        order: { include: { items: true } },
        items: { include: { orderItem: true } },
      },
    });
    if (!picking) return fail("NOT_FOUND", "Picking tidak ditemukan.");
    if (picking.order.status !== "PICKED")
      return fail("INVALID_STATE", "Simpan actual qty dulu sebelum konfirmasi pengiriman.");

    const shipped = picking.items.filter((i) => i.actualQty > 0);
    if (shipped.length === 0) return fail("EMPTY", "Tidak ada item dengan actual qty > 0.");

    try {
      const shipmentId = await prisma.$transaction(async (tx) => {
        // 1) validasi stok tersedia (gagal → throw → rollback)
        for (const it of shipped) {
          const stock = await tx.stock.findFirst({
            where: {
              productId: it.orderItem.productId,
              colorId: { equals: it.orderItem.colorId },
              sizeId: { equals: it.orderItem.sizeId },
            },
          });
          if (!stock || stock.qty < it.actualQty) {
            throw new ShipmentError(
              `Stok kurang untuk item order (butuh ${it.actualQty}, ${
                stock ? `tersedia ${stock.qty}` : "tidak ada baris stok"
              }).`,
            );
          }
        }
        // 2) shipment + items (shippingNumber unique → double shipment mustahil)
        const shipment = await tx.shipment.create({
          data: {
            orderId: picking.orderId,
            shippingNumber,
            userId,
            items: { create: shipped.map((i) => ({ orderItemId: i.orderItemId, qty: i.actualQty })) },
          },
        });
        // 3) kurangi stok + movement per item
        for (const it of shipped) {
          const stock = await tx.stock.findFirst({
            where: {
              productId: it.orderItem.productId,
              colorId: { equals: it.orderItem.colorId },
              sizeId: { equals: it.orderItem.sizeId },
            },
          });
          await tx.stock.update({ where: { id: stock!.id }, data: { qty: { decrement: it.actualQty } } });
          await tx.stockMovement.create({
            data: {
              stockId: stock!.id,
              type: "SALE_SHIPMENT",
              qty: it.actualQty,
              refType: "SHIPMENT",
              refId: shipment.id,
              userId,
              note: `Order ${picking.order.orderNumber} · resi ${shippingNumber}`,
            },
          });
        }
        // 4) status order → SHIPPED + tempel resi
        await tx.salesOrder.update({
          where: { id: picking.orderId },
          data: { status: "SHIPPED", shippingNumber },
        });
        return shipment.id;
      });

      return ok({ id: shipmentId, shippingNumber }, "Pengiriman dikonfirmasi, stok berkurang.");
    } catch (err) {
      if (err instanceof ShipmentError) return fail("STOCK_SHORT", err.message);
      const code = (err as { code?: string })?.code;
      if (code === "P2002") return fail("DUPLICATE_RESI", "Resi sudah dipakai order lain.");
      throw err;
    }
  } catch (err) {
    console.error("[picking:ship]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
