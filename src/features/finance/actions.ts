"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";

const hppSchema = z.object({
  productId: z.string().min(1),
  hpp: z.number().int().min(0).max(100_000_000).nullable(),
});

/**
 * Simpan HPP produk. Data SENSITIF — hanya HPP_MANAGE (OWNER).
 * Nilai null = bersihkan HPP (produk belum punya harga pokok).
 */
export async function updateHpp(
  input: z.infer<typeof hppSchema>,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requirePermission(P.HPP_MANAGE);
    const data = hppSchema.parse(input);

    const before = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, hpp: true, name: true },
    });
    if (!before) return fail("NOT_FOUND", "Produk tidak ditemukan.");

    await prisma.product.update({ where: { id: data.productId }, data: { hpp: data.hpp } });

    await logAudit({
      userId: user.id,
      action: "HPP",
      module: "finance",
      recordId: data.productId,
      before: { hpp: before.hpp },
      after: { hpp: data.hpp },
    });
    revalidatePath("/owner/hpp");
    revalidatePath("/owner/keuntungan");
    revalidatePath("/owner/margin");
    revalidatePath("/owner/laporan-keuangan");
    return ok({ id: data.productId }, "HPP tersimpan.");
  } catch (err) {
    console.error("[finance:hpp]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
