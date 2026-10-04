"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, requireUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit/log";
import { ok, fail, GENERIC_ERROR_MESSAGE, type ActionResponse } from "@/types/response";

// Modul Administrasi — User, Role & Permission (Audit log bersifat read-only).

const username = z.string().trim().regex(/^[A-Za-z0-9_.-]{3,30}$/, "3-30 karakter: huruf, angka, _ . -");
const email = z.string().trim().email("Email tidak valid").max(120).optional().or(z.literal("")).transform((v) => v || null);
const password = z.string().min(8, "Password minimal 8 karakter").max(100);
const roleIds = z.array(z.string().min(1)).min(1, "Pilih minimal 1 role");

const createSchema = z.object({
  username,
  email,
  password,
  roleIds,
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string().min(1),
  username,
  email,
  /** Kosong = tidak diganti. */
  password: z.string().max(100).optional().default(""),
  roleIds,
  isActive: z.boolean(),
});

const permissionCodes = z.array(z.string().min(1)).min(1, "Pilih minimal 1 permission");

const roleSchema = z.object({
  code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,30}$/, "Huruf besar/angka/underscore, min 2"),
  name: z.string().trim().min(2, "Nama role minimal 2 karakter").max(60),
  description: z.string().trim().max(200).optional().default(""),
  permissionCodes,
});

// ── USER ──────────────────────────────────────────────────────────────

export async function createUser(input: z.infer<typeof createSchema>): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.USER_CREATE);
    const data = createSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) return fail("DUPLICATE", "Username sudah dipakai.");
    if (data.email) {
      const dupEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (dupEmail) return fail("DUPLICATE", "Email sudah dipakai.");
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: await hash(data.password, 10),
        isActive: data.isActive,
        roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      select: { id: true },
    });

    await logAudit({
      userId: actor.id,
      action: "CREATE",
      module: "user",
      recordId: user.id,
      after: { username: data.username, roleIds: data.roleIds, isActive: data.isActive },
    });
    revalidatePath("/pengaturan/user");
    return ok({ id: user.id }, "User dibuat.");
  } catch (err) {
    console.error("[user:create]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    if ((err as { code?: string })?.code === "P2002") return fail("DUPLICATE", "Username/email sudah dipakai.");
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

export async function updateUser(input: z.infer<typeof updateSchema>): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.USER_UPDATE);
    const data = updateSchema.parse(input);
    if (data.id === actor.id && !data.isActive)
      return fail("SELF_GUARD", "Tidak bisa menonaktifkan akun sendiri.");

    const before = await prisma.user.findUnique({
      where: { id: data.id },
      include: { roles: { select: { roleId: true } } },
    });
    if (!before) return fail("NOT_FOUND", "User tidak ditemukan.");
    if (data.username !== before.username) {
      const dup = await prisma.user.findUnique({ where: { username: data.username } });
      if (dup) return fail("DUPLICATE", "Username sudah dipakai.");
    }
    if (data.email) {
      const dupEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (dupEmail && dupEmail.id !== data.id) return fail("DUPLICATE", "Email sudah dipakai.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.id },
        data: {
          username: data.username,
          email: data.email,
          isActive: data.isActive,
          ...(data.password ? { passwordHash: await hash(data.password, 10) } : {}),
          roles: {
            deleteMany: {},
            create: data.roleIds.map((roleId) => ({ roleId })),
          },
        },
      });
    });

    await logAudit({
      userId: actor.id,
      action: "UPDATE",
      module: "user",
      recordId: data.id,
      before: { username: before.username, roleIds: before.roles.map((r) => r.roleId), isActive: before.isActive },
      after: { username: data.username, roleIds: data.roleIds, isActive: data.isActive },
    });
    revalidatePath("/pengaturan/user");
    return ok({ id: data.id }, "User diperbarui.");
  } catch (err) {
    console.error("[user:update]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    if ((err as { code?: string })?.code === "P2002") return fail("DUPLICATE", "Username/email sudah dipakai.");
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Hapus user. Ditolak bila diri sendiri / punya jejak audit (nonaktifkan saja). */
export async function deleteUser(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.USER_DELETE);
    if (id === actor.id) return fail("SELF_GUARD", "Tidak bisa menghapus akun sendiri.");

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, _count: { select: { auditLogs: true } } },
    });
    if (!user) return fail("NOT_FOUND", "User tidak ditemukan.");
    if (user._count.auditLogs > 0)
      return fail("IN_USE", "User punya jejak audit — nonaktifkan saja (toggle Aktif).");

    await prisma.user.delete({ where: { id } }); // user_roles cascade
    await logAudit({ userId: actor.id, action: "DELETE", module: "user", recordId: id, before: { username: user.username } });
    revalidatePath("/pengaturan/user");
    return ok({ id }, "User dihapus.");
  } catch (err) {
    console.error("[user:delete]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

// ── ROLE ──────────────────────────────────────────────────────────────

async function resolvePermissionIds(codes: string[]): Promise<string[] | null> {
  const found = await prisma.permission.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  if (found.length !== codes.length) return null; // ada kode tak dikenal
  return found.map((p) => p.id);
}

export async function createRole(input: z.infer<typeof roleSchema>): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.ROLE_MANAGE);
    const data = roleSchema.parse(input);

    const dup = await prisma.role.findUnique({ where: { code: data.code } });
    if (dup) return fail("DUPLICATE", "Kode role sudah ada.");
    const permIds = await resolvePermissionIds(data.permissionCodes);
    if (!permIds) return fail("INVALID_PERMISSION", "Permission tidak dikenal.");

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description || null,
          permissions: { create: permIds.map((permissionId) => ({ permissionId })) },
        },
        select: { id: true },
      });
      return created;
    });

    await logAudit({
      userId: actor.id,
      action: "CREATE",
      module: "role",
      recordId: role.id,
      after: { code: data.code, permissionCodes: data.permissionCodes },
    });
    revalidatePath("/pengaturan/role");
    return ok({ id: role.id }, "Role dibuat.");
  } catch (err) {
    console.error("[role:create]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    if ((err as { code?: string })?.code === "P2002") return fail("DUPLICATE", "Kode role sudah ada.");
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

export async function updateRole(input: z.infer<typeof roleSchema> & { id: string }): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.ROLE_MANAGE);
    const { id, ...rest } = input;
    const data = roleSchema.parse(rest);

    const before = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { select: { permissionId: true } } },
    });
    if (!before) return fail("NOT_FOUND", "Role tidak ditemukan.");
    if (before.code !== data.code) {
      const dup = await prisma.role.findUnique({ where: { code: data.code } });
      if (dup) return fail("DUPLICATE", "Kode role sudah ada.");
    }
    const permIds = await resolvePermissionIds(data.permissionCodes);
    if (!permIds) return fail("INVALID_PERMISSION", "Permission tidak dikenal.");

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description || null,
          permissions: { deleteMany: {}, create: permIds.map((permissionId) => ({ permissionId })) },
        },
      });
    });

    await logAudit({
      userId: actor.id,
      action: "UPDATE",
      module: "role",
      recordId: id,
      before: { code: before.code, permissionIds: before.permissions.map((p) => p.permissionId) },
      after: { code: data.code, permissionCodes: data.permissionCodes },
    });
    revalidatePath("/pengaturan/role");
    revalidatePath("/pengaturan/user");
    return ok({ id }, "Role diperbarui.");
  } catch (err) {
    console.error("[role:update]", err);
    if (err instanceof z.ZodError)
      return fail("VALIDATION", "Data tidak valid.", err.flatten().fieldErrors as Record<string, string[]>);
    if ((err as { code?: string })?.code === "P2002") return fail("DUPLICATE", "Kode role sudah ada.");
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}

/** Hapus role — ditolak utk OWNER dan role yang masih dipakai user (IN_USE). */
export async function deleteRole(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const actor = await requirePermission(P.ROLE_MANAGE);
    const role = await prisma.role.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, _count: { select: { users: true } } },
    });
    if (!role) return fail("NOT_FOUND", "Role tidak ditemukan.");
    if (role.code === "OWNER") return fail("LOCKED", "Role OWNER tidak bisa dihapus.");
    if (role._count.users > 0)
      return fail("IN_USE", `Role masih dipakai ${role._count.users} user — lepaskan dulu dari user.`);

    await prisma.role.delete({ where: { id } }); // role_permissions cascade
    await logAudit({ userId: actor.id, action: "DELETE", module: "role", recordId: id, before: { code: role.code, name: role.name } });
    revalidatePath("/pengaturan/role");
    return ok({ id }, "Role dihapus.");
  } catch (err) {
    console.error("[role:delete]", err);
    return fail("GENERIC", GENERIC_ERROR_MESSAGE);
  }
}
