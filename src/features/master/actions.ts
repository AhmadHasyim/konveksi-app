"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { ok, fail, type ActionResponse } from "@/types/response";

// ---------------------------------------------------------------------------
// Skema validasi master data
// ---------------------------------------------------------------------------

const idSchema = z.string().min(1).optional();

const productSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1, "Wajib diisi").max(20),
  name: z.string().trim().min(1, "Wajib diisi").max(100),
  type: z.enum(["GARMENT", "ACCESSORY"]),
  basePrice: z.number().int().min(0).max(2_000_000_000),
  isActive: z.boolean(),
  sizeIds: z.array(z.string().min(1)).max(30),
});

const colorSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(50),
});

const sizeSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1).max(10),
  label: z.string().trim().min(1).max(30),
  sortOrder: z.number().int().min(0).max(999),
});

const fabricSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(80),
  unit: z.enum(["ROLL", "METER", "YARD"]),
});

const supplierSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).or(z.literal("")).optional().default(""),
  address: z.string().trim().max(255).or(z.literal("")).optional().default(""),
});

const employeeSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  position: z.enum(["CUTTING", "SEWIST", "HOST_LIVE", "WAREHOUSE", "SALES", "ADMIN"]),
  baseSalary: z.number().int().min(0).max(2_000_000_000),
  transportAllowance: z.number().int().min(0).max(2_000_000_000),
  workdayBasis: z.number().int().min(1).max(31),
  isActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

async function duplicate(
  model: "product" | "color" | "size" | "fabric" | "supplier" | "employee",
  code: string,
  id?: string,
): Promise<boolean> {
  const found = await (prisma[model] as any).findFirst({
    where: { code, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

/** Hapus hanya bila tidak dipakai tabel lain (cegah cascade merusak data). */
async function assertUnused(
  refs: { model: "stock" | "materialUsage" | "cutting" | "sewing" | "salesOrderItem"; field: string; id: string }[],
): Promise<string | null> {
  for (const r of refs) {
    const n = await (prisma[r.model] as any).count({ where: { [r.field]: r.id } });
    if (n > 0) return r.model;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Produk + Ukuran per produk
// ---------------------------------------------------------------------------

export async function saveProduct(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(data.id ? P.PRODUCT_UPDATE : P.PRODUCT_CREATE);
    if (await duplicate("product", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode produk sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }

    const id = data.id
      ? (
          await prisma.product.update({
            where: { id: data.id },
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              type: data.type,
              basePrice: data.basePrice,
              isActive: data.isActive,
              sizes: { deleteMany: {}, create: data.sizeIds.map((sizeId) => ({ sizeId })) },
            },
          })
        ).id
      : (
          await prisma.product.create({
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              type: data.type,
              basePrice: data.basePrice,
              isActive: data.isActive,
              sizes: { create: data.sizeIds.map((sizeId) => ({ sizeId })) },
            },
          })
        ).id;

    revalidatePath("/master/produk");
    return ok({ id }, data.id ? "Produk diperbarui." : "Produk ditambahkan.");
  } catch (error) {
    console.error("[master/saveProduct]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan produk. Coba lagi.");
  }
}

export async function deleteProduct(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PRODUCT_DELETE);
    const used = await assertUnused([
      { model: "stock", field: "productId", id },
      { model: "salesOrderItem", field: "productId", id },
      { model: "cutting", field: "productId", id },
      { model: "sewing", field: "productId", id },
    ]);
    if (used) return fail("IN_USE", "Produk masih dipakai data lain dan tidak bisa dihapus.");
    await prisma.product.delete({ where: { id } });
    revalidatePath("/master/produk");
    return ok({ id }, "Produk dihapus.");
  } catch (error) {
    console.error("[master/deleteProduct]", error);
    return fail("SERVER_ERROR", "Gagal menghapus produk. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Warna
// ---------------------------------------------------------------------------

export async function saveColor(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = colorSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(data.id ? P.PRODUCT_UPDATE : P.PRODUCT_CREATE);
    if (await duplicate("color", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode warna sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }
    const id = data.id
      ? (
          await prisma.color.update({
            where: { id: data.id },
            data: { code: data.code.toUpperCase(), name: data.name },
          })
        ).id
      : (
          await prisma.color.create({
            data: { code: data.code.toUpperCase(), name: data.name },
          })
        ).id;
    revalidatePath("/master/produk");
    return ok({ id }, data.id ? "Warna diperbarui." : "Warna ditambahkan.");
  } catch (error) {
    console.error("[master/saveColor]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan warna. Coba lagi.");
  }
}

export async function deleteColor(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PRODUCT_DELETE);
    const used = await assertUnused([
      { model: "stock", field: "colorId", id },
      { model: "materialUsage", field: "colorId", id },
      { model: "cutting", field: "colorId", id },
      { model: "sewing", field: "colorId", id },
      { model: "salesOrderItem", field: "colorId", id },
    ]);
    if (used) return fail("IN_USE", "Warna masih dipakai data lain dan tidak bisa dihapus.");
    await prisma.color.delete({ where: { id } });
    revalidatePath("/master/produk");
    return ok({ id }, "Warna dihapus.");
  } catch (error) {
    console.error("[master/deleteColor]", error);
    return fail("SERVER_ERROR", "Gagal menghapus warna. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Ukuran global
// ---------------------------------------------------------------------------

export async function saveSize(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = sizeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(data.id ? P.PRODUCT_UPDATE : P.PRODUCT_CREATE);
    if (await duplicate("size", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode ukuran sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }
    const id = data.id
      ? (
          await prisma.size.update({
            where: { id: data.id },
            data: { code: data.code.toUpperCase(), label: data.label, sortOrder: data.sortOrder },
          })
        ).id
      : (
          await prisma.size.create({
            data: { code: data.code.toUpperCase(), label: data.label, sortOrder: data.sortOrder },
          })
        ).id;
    revalidatePath("/master/produk");
    return ok({ id }, data.id ? "Ukuran diperbarui." : "Ukuran ditambahkan.");
  } catch (error) {
    console.error("[master/saveSize]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan ukuran. Coba lagi.");
  }
}

export async function deleteSize(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PRODUCT_DELETE);
    const used = await assertUnused([
      { model: "stock", field: "sizeId", id },
      { model: "salesOrderItem", field: "sizeId", id },
    ]);
    if (used) return fail("IN_USE", "Ukuran masih dipakai data lain dan tidak bisa dihapus.");
    await prisma.size.delete({ where: { id } });
    revalidatePath("/master/produk");
    return ok({ id }, "Ukuran dihapus.");
  } catch (error) {
    console.error("[master/deleteSize]", error);
    return fail("SERVER_ERROR", "Gagal menghapus ukuran. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Bahan baku (kain)
// ---------------------------------------------------------------------------

export async function saveFabric(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = fabricSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(P.INVENTORY_MANAGE);
    if (await duplicate("fabric", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode bahan sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }
    const id = data.id
      ? (
          await prisma.fabric.update({
            where: { id: data.id },
            data: { code: data.code.toUpperCase(), name: data.name, unit: data.unit },
          })
        ).id
      : (
          await prisma.fabric.create({
            data: { code: data.code.toUpperCase(), name: data.name, unit: data.unit },
          })
        ).id;
    revalidatePath("/master/bahan-baku");
    return ok({ id }, data.id ? "Bahan diperbarui." : "Bahan ditambahkan.");
  } catch (error) {
    console.error("[master/saveFabric]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan bahan. Coba lagi.");
  }
}

export async function deleteFabric(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.INVENTORY_MANAGE);
    const used = await assertUnused([{ model: "materialUsage", field: "fabricId", id }]);
    const stock = await prisma.fabricStock.count({ where: { fabricId: id } });
    if (used || stock > 0) return fail("IN_USE", "Bahan masih dipakai data lain dan tidak bisa dihapus.");
    await prisma.fabric.delete({ where: { id } });
    revalidatePath("/master/bahan-baku");
    return ok({ id }, "Bahan dihapus.");
  } catch (error) {
    console.error("[master/deleteFabric]", error);
    return fail("SERVER_ERROR", "Gagal menghapus bahan. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

export async function saveSupplier(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(data.id ? P.INVENTORY_MANAGE : P.INVENTORY_MANAGE);
    if (await duplicate("supplier", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode supplier sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }
    const id = data.id
      ? (
          await prisma.supplier.update({
            where: { id: data.id },
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              phone: data.phone || null,
              address: data.address || null,
            },
          })
        ).id
      : (
          await prisma.supplier.create({
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              phone: data.phone || null,
              address: data.address || null,
            },
          })
        ).id;
    revalidatePath("/master/supplier");
    return ok({ id }, data.id ? "Supplier diperbarui." : "Supplier ditambahkan.");
  } catch (error) {
    console.error("[master/saveSupplier]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan supplier. Coba lagi.");
  }
}

export async function deleteSupplier(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.INVENTORY_MANAGE);
    const purchases = await prisma.materialPurchase.count({ where: { supplierId: id } });
    if (purchases > 0) return fail("IN_USE", "Supplier masih punya riwayat pembelian dan tidak bisa dihapus.");
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/master/supplier");
    return ok({ id }, "Supplier dihapus.");
  } catch (error) {
    console.error("[master/deleteSupplier]", error);
    return fail("SERVER_ERROR", "Gagal menghapus supplier. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Karyawan
// ---------------------------------------------------------------------------

export async function saveEmployee(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(data.id ? P.PAYROLL_MANAGE : P.PAYROLL_MANAGE);
    if (await duplicate("employee", data.code.toUpperCase(), data.id)) {
      return fail("DUPLICATE", "Kode karyawan sudah dipakai.", { code: ["Kode sudah dipakai"] });
    }
    const id = data.id
      ? (
          await prisma.employee.update({
            where: { id: data.id },
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              position: data.position,
              baseSalary: data.baseSalary,
              transportAllowance: data.transportAllowance,
              workdayBasis: data.workdayBasis,
              isActive: data.isActive,
            },
          })
        ).id
      : (
          await prisma.employee.create({
            data: {
              code: data.code.toUpperCase(),
              name: data.name,
              position: data.position,
              baseSalary: data.baseSalary,
              transportAllowance: data.transportAllowance,
              workdayBasis: data.workdayBasis,
              isActive: data.isActive,
            },
          })
        ).id;
    revalidatePath("/master/karyawan");
    return ok({ id }, data.id ? "Karyawan diperbarui." : "Karyawan ditambahkan.");
  } catch (error) {
    console.error("[master/saveEmployee]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan karyawan. Coba lagi.");
  }
}

export async function deleteEmployee(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    const [attendance, payroll, sewing, user] = await Promise.all([
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.payroll.count({ where: { employeeId: id } }),
      prisma.sewing.count({ where: { sewistId: id } }),
      prisma.user.count({ where: { employeeId: id } }),
    ]);
    if (attendance || payroll || sewing || user) {
      return fail("IN_USE", "Karyawan masih punya data presensi/gaji/produksi dan tidak bisa dihapus.");
    }
    await prisma.employee.delete({ where: { id } });
    revalidatePath("/master/karyawan");
    return ok({ id }, "Karyawan dihapus.");
  } catch (error) {
    console.error("[master/deleteEmployee]", error);
    return fail("SERVER_ERROR", "Gagal menghapus karyawan. Coba lagi.");
  }
}
