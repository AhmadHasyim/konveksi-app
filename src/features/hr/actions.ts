"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { ok, fail, type ActionResponse } from "@/types/response";

// ---------------------------------------------------------------------------
// Skema validasi HR (presensi, target, payroll)
// ---------------------------------------------------------------------------

const idSchema = z.string().min(1).optional();

const attendanceSchema = z.object({
  id: idSchema,
  employeeId: z.string().min(1, "Wajib diisi"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .refine((d) => !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()), "Tanggal tidak valid"),
  code: z.enum(["WORK", "LEAVE", "SICK", "ABSENT", "MENSTRUAL", "OVERTIME"]),
  sesi1: z.number().int().min(0).max(24).nullable().default(null),
  sesi2: z.number().int().min(0).max(24).nullable().default(null),
  sesi3: z.number().int().min(0).max(24).nullable().default(null),
  overtimeHours: z.number().min(0).max(24).nullable().default(null),
  note: z.string().trim().max(255).optional().default(""),
});

const targetSchema = z.object({
  id: idSchema,
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  targetPcs: z.number().int().min(0).max(1_000_000),
  targetAmount: z.number().int().min(0).max(2_000_000_000),
  commissionPct: z.number().min(0).max(100),
  upTargetPct: z.number().min(0).max(100),
});

const payrollSchema = z
  .object({
    id: idSchema,
    employeeId: z.string().min(1, "Wajib diisi"),
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
    basePay: z.number().int().min(0).max(2_000_000_000),
    transport: z.number().int().min(0).max(2_000_000_000),
    overtime: z.number().int().min(0).max(2_000_000_000),
    bonus: z.number().int().min(0).max(2_000_000_000),
    deduction: z.number().int().min(0).max(2_000_000_000),
    status: z.enum(["DRAFT", "PAID"]),
    note: z.string().trim().max(255).optional().default(""),
  })
  .refine((d) => d.basePay + d.transport + d.overtime + d.bonus - d.deduction >= 0, {
    message: "Potongan melebihi total penerimaan",
    path: ["deduction"],
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/** "YYYY-MM-DD" → Date UTC (kolom @db.Date — bebas pergeseran zona). */
function toDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function duplicate(
  model: "attendance" | "salesTarget" | "payroll",
  where: Record<string, unknown>,
  id?: string,
): Promise<boolean> {
  const found = await (prisma[model] as any).findFirst({
    where: { ...where, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

// ---------------------------------------------------------------------------
// Presensi (live seller / host live)
// ---------------------------------------------------------------------------

export async function saveAttendance(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    const date = toDate(data.date);
    if (await duplicate("attendance", { employeeId: data.employeeId, date }, data.id)) {
      return fail("DUPLICATE", "Presensi tanggal tersebut sudah tercatat.", {
        date: ["Sudah ada presensi untuk tanggal ini"],
      });
    }

    const payload = {
      code: data.code,
      sesi1: data.sesi1 ?? null,
      sesi2: data.sesi2 ?? null,
      sesi3: data.sesi3 ?? null,
      overtimeHours: data.overtimeHours ?? null,
      note: data.note || null,
    };

    const id = data.id
      ? (
          await prisma.attendance.update({
            where: { id: data.id },
            data: { employeeId: data.employeeId, date, ...payload },
          })
        ).id
      : (
          await prisma.attendance.create({
            data: { employeeId: data.employeeId, date, ...payload },
          })
        ).id;

    revalidatePath("/hr/live-seller");
    return ok({ id }, data.id ? "Presensi diperbarui." : "Presensi ditambahkan.");
  } catch (error) {
    console.error("[hr/saveAttendance]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan presensi. Coba lagi.");
  }
}

export async function deleteAttendance(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    await prisma.attendance.delete({ where: { id } });
    revalidatePath("/hr/live-seller");
    return ok({ id }, "Presensi dihapus.");
  } catch (error) {
    console.error("[hr/deleteAttendance]", error);
    return fail("SERVER_ERROR", "Gagal menghapus presensi. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Target penjualan bulanan
// ---------------------------------------------------------------------------

export async function saveTarget(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    if (await duplicate("salesTarget", { year: data.year, month: data.month }, data.id)) {
      return fail("DUPLICATE", "Target periode tersebut sudah ada.", {
        month: ["Sudah ada target untuk periode ini"],
      });
    }

    const payload = {
      year: data.year,
      month: data.month,
      targetPcs: data.targetPcs,
      targetAmount: data.targetAmount,
      commissionPct: data.commissionPct,
      upTargetPct: data.upTargetPct,
    };

    const id = data.id
      ? (await prisma.salesTarget.update({ where: { id: data.id }, data: payload })).id
      : (await prisma.salesTarget.create({ data: payload })).id;

    revalidatePath("/hr/target");
    return ok({ id }, data.id ? "Target diperbarui." : "Target ditambahkan.");
  } catch (error) {
    console.error("[hr/saveTarget]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan target. Coba lagi.");
  }
}

export async function deleteTarget(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    await prisma.salesTarget.delete({ where: { id } });
    revalidatePath("/hr/target");
    return ok({ id }, "Target dihapus.");
  } catch (error) {
    console.error("[hr/deleteTarget]", error);
    return fail("SERVER_ERROR", "Gagal menghapus target. Coba lagi.");
  }
}

// ---------------------------------------------------------------------------
// Payroll bulanan
// ---------------------------------------------------------------------------

export async function savePayroll(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const parsed = payrollSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Periksa kembali isian form.", fieldErrors(parsed.error));

  const data = parsed.data;
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    if (await duplicate("payroll", { employeeId: data.employeeId, year: data.year, month: data.month }, data.id)) {
      return fail("DUPLICATE", "Karyawan sudah punya slip gaji untuk periode itu.", {
        month: ["Sudah ada slip gaji untuk periode ini"],
      });
    }

    // total dihitung ulang di server — angka yang dikirim client tidak dipercaya.
    const total = data.basePay + data.transport + data.overtime + data.bonus - data.deduction;
    const payload = {
      employeeId: data.employeeId,
      year: data.year,
      month: data.month,
      basePay: data.basePay,
      transport: data.transport,
      overtime: data.overtime,
      bonus: data.bonus,
      deduction: data.deduction,
      total,
      status: data.status,
      note: data.note || null,
    };

    let paidAt: Date | null = null;
    if (data.id) {
      const existing = await prisma.payroll.findUnique({ where: { id: data.id }, select: { paidAt: true } });
      if (!existing) return fail("NOT_FOUND", "Slip gaji tidak ditemukan.");
      paidAt = data.status === "PAID" ? (existing.paidAt ?? new Date()) : null;
    } else {
      paidAt = data.status === "PAID" ? new Date() : null;
    }

    const id = data.id
      ? (await prisma.payroll.update({ where: { id: data.id }, data: { ...payload, paidAt } })).id
      : (await prisma.payroll.create({ data: { ...payload, paidAt } })).id;

    revalidatePath("/hr/payroll");
    return ok({ id }, data.id ? "Slip gaji diperbarui." : "Slip gaji ditambahkan.");
  } catch (error) {
    console.error("[hr/savePayroll]", error);
    return fail("SERVER_ERROR", "Gagal menyimpan slip gaji. Coba lagi.");
  }
}

export async function deletePayroll(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(P.PAYROLL_MANAGE);
    const row = await prisma.payroll.findUnique({ where: { id }, select: { status: true } });
    if (!row) return fail("NOT_FOUND", "Slip gaji tidak ditemukan.");
    if (row.status === "PAID") {
      return fail("PAID", "Slip berstatus LUNAS tidak bisa dihapus — ubah ke DRAFT dulu.");
    }
    await prisma.payroll.delete({ where: { id } });
    revalidatePath("/hr/payroll");
    return ok({ id }, "Slip gaji dihapus.");
  } catch (error) {
    console.error("[hr/deletePayroll]", error);
    return fail("SERVER_ERROR", "Gagal menghapus slip gaji. Coba lagi.");
  }
}
