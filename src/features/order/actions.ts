"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";
import {
  createOrderCore,
  updateOrderCore,
  cancelOrderCore,
  type CreateOrderInput,
} from "@/features/order/core";

// Lapisan auth + audit + revalidate — logika bisnis di core.ts (tertes).

const deleteSchema = z.string().min(1);
const resiSchema = z.string().trim().min(3, "Resi minimal 3 karakter").max(60);

/** Buat order (manual input / import). Status awal PENDING. */
export async function createOrder(
  input: CreateOrderInput,
): Promise<ActionResponse<{ id: string; orderNumber: string }>> {
  try {
    const user = await requirePermission(P.SALES_CREATE);
    const res = await createOrderCore(input);
    if (res.success) {
      await logAudit({
        userId: user.id,
        action: "CREATE",
        module: "order",
        recordId: res.data.id,
        after: { orderNumber: res.data.orderNumber },
      });
      revalidatePath("/order");
    }
    return res;
  } catch (err) {
    console.error("[order:create:action]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Ubah order — hanya selama status PENDING. */
export async function updateOrder(
  input: CreateOrderInput & { id: string },
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.SALES_UPDATE);
    const { id, ...rest } = input;
    const res = await updateOrderCore(id, rest);
    if (res.success) {
      await logAudit({ userId: user.id, action: "UPDATE", module: "order", recordId: id });
      revalidatePath("/order");
      revalidatePath(`/order/${id}`);
    }
    return res;
  } catch (err) {
    console.error("[order:update:action]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Set / ganti resi (shippingNumber) sebelum pengiriman. Unik lintas order. */
export async function setShippingNumber(
  orderId: string,
  shippingNumber: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.SALES_UPDATE);
    const resi = resiSchema.parse(shippingNumber);

    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, shippingNumber: true },
    });
    if (!order) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (order.status === "SHIPPED" || order.status === "COMPLETED")
      return fail("LOCKED", "Order sudah terkirim.");

    const dup = await prisma.salesOrder.findFirst({
      where: { shippingNumber: resi, NOT: { id: orderId } },
      select: { orderNumber: true },
    });
    if (dup) return fail("DUPLICATE_RESI", `Resi sudah dipakai order ${dup.orderNumber}.`);

    await prisma.salesOrder.update({ where: { id: orderId }, data: { shippingNumber: resi } });
    await logAudit({ userId: user.id, action: "UPDATE", module: "order", recordId: orderId, after: { shippingNumber: resi } });
    revalidatePath("/order");
    revalidatePath(`/order/${orderId}`);
    return ok({ id: orderId }, "Resi tersimpan.");
  } catch (err) {
    console.error("[order:resi]", err);
    if ((err as { code?: string })?.code === "P2002")
      return fail("DUPLICATE_RESI", "Resi sudah dipakai order lain.");
    if (err instanceof z.ZodError) return fail("INVALID_RESI", err.issues[0]?.message ?? "Resi tidak valid.");
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Batalkan order — hanya sebelum terkirim. */
export async function cancelOrder(orderId: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.SALES_UPDATE);
    const res = await cancelOrderCore(orderId);
    if (res.success) {
      await logAudit({ userId: user.id, action: "CANCEL", module: "order", recordId: orderId });
      revalidatePath("/order");
      revalidatePath(`/order/${orderId}`);
    }
    return res;
  } catch (err) {
    console.error("[order:cancel:action]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Hapus order — ditolak bila sudah ada picking/shipment/retur (guard IN_USE). */
export async function deleteOrder(orderId: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.SALES_UPDATE);
    deleteSchema.parse(orderId);
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        shipment: { select: { id: true } },
        returns: { select: { id: true } },
        picking: { select: { id: true } },
      },
    });
    if (!order) return fail("NOT_FOUND", "Order tidak ditemukan.");
    if (order.shipment || order.returns.length > 0)
      return fail("IN_USE", "Order sudah terkirim / ada retur — tidak bisa dihapus.");
    if (order.picking) await prisma.picking.delete({ where: { id: order.picking.id } }); // items cascade

    await prisma.$transaction([
      prisma.salesOrderItem.deleteMany({ where: { orderId } }),
      prisma.salesOrder.delete({ where: { id: orderId } }),
    ]);

    await logAudit({ userId: user.id, action: "DELETE", module: "order", recordId: orderId, before: { orderNumber: order.orderNumber } });
    revalidatePath("/order");
    return ok({ id: orderId }, "Order dihapus.");
  } catch (err) {
    console.error("[order:delete]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

