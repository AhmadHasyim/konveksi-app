"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { ok, fail, type ActionResponse } from "@/types/response";

// ---------------------------------------------------------------------------
// Pengeluaran bahan baku (sheet BAHAN)
// ---------------------------------------------------------------------------

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const usageSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  teamId: z.string().min(1, "Tim wajib dipilih"),
  fabricId: z.string().min(1, "Bahan wajib dipilih"),
  colorId: z.string().min(1, "Warna wajib dipilih"),
  roll: z.number().int().min(0).max(9_999),
  qty: z.number().int().min(1, "Jumlah harus lebih dari 0").max(1_000_000),
  note: z.string().trim().max(255).optional().default(""),
});

/**
 * Catat pengeluaran bahan: tulis MaterialUsage + kurangi FabricStock.
 * Guard stok cukup dilakukan di database (updateMany bersyarat) supaya aman
 * saat dua user menulis bersamaan. Bahan baku tidak punya baris `stocks`
 * (stocks = barang jadi), jadi StockMovement PRODUCTION_OUT tidak ditulis.
 */
export async function createMaterialUsage(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = usageSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));
  }
  const data = parsed.data;

  try {
    await requirePermission(P.PRODUCTION_MANAGE);

    const date = new Date(`${data.date}T00:00:00`);

    const id = await prisma.$transaction(async (tx) => {
      const dec = await tx.fabricStock.updateMany({
        where: { fabricId: data.fabricId, colorId: data.colorId, qty: { gte: data.qty } },
        data: { qty: { decrement: data.qty } },
      });
      if (dec.count === 0) throw new Error("STOCK_GUARD");

      const usage = await tx.materialUsage.create({
        data: {
          date,
          teamId: data.teamId,
          fabricId: data.fabricId,
          colorId: data.colorId,
          roll: data.roll,
          qty: data.qty,
          note: data.note || null,
        },
      });
      return usage.id;
    });

    revalidatePath("/produksi/pengeluaran-bahan");
    return ok({ id }, "Pengeluaran bahan tercatat.");
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_GUARD") {
      const stock = await prisma.fabricStock.findUnique({
        where: { fabricId_colorId: { fabricId: data.fabricId, colorId: data.colorId } },
        select: { qty: true },
      });
      return fail(
        "INSUFFICIENT_STOCK",
        stock
          ? `Stok kurang — tersisa ${Number(stock.qty)}.`
          : "Stok bahan ini belum tercatat. Tambah stok dulu di modul Persediaan.",
        { qty: ["Stok tidak cukup"] },
      );
    }
    console.error("[produksi/createMaterialUsage]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan pengeluaran bahan. Coba lagi.");
  }
}
