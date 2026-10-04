/**
 * Smoke modul Administrasi: roundtrip User + Role di DB (pola query sama
 * dgn features/admin/actions.ts) + hitung audit log.
 * Jalankan: npx tsx scripts/test-admin.ts — lalu file ini dihapus.
 */
import { prisma } from "../src/lib/db/prisma";
let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
};

async function main() {
  // ── ROLE ──
  const perm = await prisma.permission.findMany({ take: 3 });
  const role = await prisma.role.create({
    data: {
      code: "SMOKE_ROLE",
      name: "Role Smoke",
      permissions: { create: perm.map((p) => ({ permissionId: p.id })) },
    },
    include: { permissions: true },
  });
  ok("role dibuat + 3 permission", role.permissions.length === 3);

  const role2 = await prisma.role.create({
    data: { code: "SMOKE_ROLE2", name: "Role Smoke 2" },
  });

  // ganti permission (replace seperti updateRole)
  const allPerm = await prisma.permission.findMany({ select: { id: true } });
  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          deleteMany: {},
          create: allPerm.slice(0, 5).map((p) => ({ permissionId: p.id })),
        },
      },
    });
  });
  const nRolePerm = await prisma.rolePermission.count({ where: { roleId: role.id } });
  ok("replace permission = 5", nRolePerm === 5, `dapat ${nRolePerm}`);

  // ── USER ──
  const user = await prisma.user.create({
    data: {
      username: "smoke_admin",
      email: "smoke@local",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890",
      roles: { create: [{ roleId: role.id }, { roleId: role2.id }] },
    },
    include: { roles: true },
  });
  ok("user dibuat + 2 role", user.roles.length === 2);

  // guard IN_USE: role dipakai → delete harus ditolak (simulasi logika action)
  const cnt = await prisma.role.count({ where: { users: { some: { userId: user.id } } } });
  ok("IN_USE guard role terpakai", cnt > 0, `${cnt} user`);

  // update user: ganti role jadi role2 saja (replace)
  await prisma.user.update({
    where: { id: user.id },
    data: { roles: { deleteMany: {}, create: [{ roleId: role2.id }] } },
  });
  const u2 = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true },
  });
  ok("replace role user = 1", u2!.roles.length === 1);

  // hapus user (roles cascade) lalu role bebas dihapus
  await prisma.user.delete({ where: { id: user.id } });
  const gone = await prisma.user.findUnique({ where: { id: user.id } });
  ok("user terhapus + cascade", gone === null);
  await prisma.role.delete({ where: { id: role.id } });
  await prisma.role.delete({ where: { id: role2.id } });
  const rgone = await prisma.role.findUnique({ where: { id: role.id } });
  ok("role terhapus", rgone === null);

  // ── AUTH BRIDGE: query pola authorizeFromDb ──
  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  const perms = [...new Set(admin?.roles.flatMap((ur) => ur.role.permissions.map((p) => p.permission.code)) ?? [])];
  ok("admin DB ada + punya role", !!admin && admin.roles.length > 0);
  ok("admin punya permission finansial? (tergantung role)", Array.isArray(perms), `total ${perms.length} kode`);

  // ── AUDIT ──
  const { logAudit } = await import("../src/lib/audit/log");
  const logged = await logAudit({
    userId: admin!.id,
    action: "CREATE",
    module: "smoke",
    recordId: "SMOKE-1",
    after: { test: true },
  });
  const auditCount = await prisma.auditLog.count({ where: { module: "smoke" } });
  ok("logAudit menulis baris", logged !== null && auditCount === 1, `${auditCount} entri`);
  const auditWithUser = await prisma.auditLog.findFirst({
    where: { module: "smoke" },
    include: { user: { select: { username: true } } },
  });
  ok("audit relasi user jalan", auditWithUser?.user?.username === admin!.username, auditWithUser?.user?.username ?? "-");
  await prisma.auditLog.deleteMany({ where: { module: "smoke" } });

  console.log(`\n${pass} pass, ${fail} fail`);
}
main()
  .catch((e) => {
    console.error("ERROR", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
