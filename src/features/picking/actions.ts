"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import type { ActionResponse } from "@/types/response";
import {
  generatePickingCore,
  saveActualQtyCore,
  confirmShipmentCore,
} from "@/features/picking/core";

// Lapisan auth + validasi input — logika bisnis ada di core.ts (tertes).

const actualSchema = z.object({
  pickingId: z.string().min(1),
  entries: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        actualQty: z.number().int().min(0).max(10_000),
        note: z.string().trim().max(200).optional().default(""),
      }),
    )
    .min(1),
});

const shipSchema = z.object({
  pickingId: z.string().min(1),
  shippingNumber: z.string().trim().min(3, "Resi minimal 3 karakter").max(60),
});

export async function generatePicking(orderId: string): Promise<ActionResponse<{ id: string }>> {
  const user = await requirePermission(P.INVENTORY_MANAGE);
  const res = await generatePickingCore(orderId, user.id);
  if (res.success) {
    await logAudit({ userId: user.id, action: "CREATE", module: "picking", recordId: res.data.id, after: { orderId } });
    revalidatePath("/picking");
    revalidatePath("/order");
  }
  return res;
}

export async function saveActualQty(
  input: z.infer<typeof actualSchema>,
): Promise<ActionResponse<{ id: string }>> {
  const user = await requirePermission(P.INVENTORY_MANAGE);
  const data = actualSchema.parse(input);
  const res = await saveActualQtyCore(data.pickingId, data.entries, user.id);
  if (res.success) {
    await logAudit({ userId: user.id, action: "PICK", module: "picking", recordId: res.data.id, after: { entries: data.entries } });
    revalidatePath("/picking");
    revalidatePath(`/picking/${data.pickingId}`);
  }
  return res;
}

export async function confirmShipment(
  input: z.infer<typeof shipSchema>,
): Promise<ActionResponse<{ id: string; shippingNumber: string }>> {
  const user = await requirePermission(P.INVENTORY_MANAGE);
  const data = shipSchema.parse(input);
  const res = await confirmShipmentCore(data.pickingId, data.shippingNumber, user.id);
  if (res.success) {
    await logAudit({
      userId: user.id,
      action: "SHIP",
      module: "shipment",
      recordId: res.data.id,
      after: { shippingNumber: data.shippingNumber },
    });
    revalidatePath("/picking");
    revalidatePath("/pengiriman");
    revalidatePath("/order");
    revalidatePath("/stok/mutasi");
    revalidatePath("/stok/barang-jadi");
    revalidatePath("/dashboard");
  }
  return res;
}
