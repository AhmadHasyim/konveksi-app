"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import type { ActionResponse } from "@/types/response";
import { createReturnCore } from "@/features/retur/core";

// Lapisan auth + audit + revalidate — logika bisnis di core.ts (tertes).

const returnSchema = z.object({
  orderId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  note: z.string().trim().max(500).optional().default(""),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        qty: z.number().int().min(1, "Qty minimal 1").max(10_000),
        restock: z.boolean(),
      }),
    )
    .min(1, "Minimal 1 item retur"),
});

/** Terima retur — stok naik hanya utk item layak jual (RETURN_IN). */
export async function createReturn(
  input: z.infer<typeof returnSchema>,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.INVENTORY_MANAGE);
    const data = returnSchema.parse(input);
    const res = await createReturnCore(data, user.id);
    if (res.success) {
      await logAudit({
        userId: user.id,
        action: "RESTOCK",
        module: "retur",
        recordId: res.data.id,
        after: { orderId: data.orderId, items: data.items },
      });
      revalidatePath("/retur");
      revalidatePath("/order");
      revalidatePath("/stok/barang-jadi");
      revalidatePath("/stok/mutasi");
      revalidatePath("/dashboard");
    }
    return res;
  } catch (err) {
    console.error("[retur:action]", err);
    if (err instanceof z.ZodError)
      return {
        success: false,
        code: "VALIDATION",
        message: "Data tidak valid.",
        fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
      };
    return { success: false, code: "GENERIC", message: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
