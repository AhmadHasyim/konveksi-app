import { requirePermission, hasPermission } from "@/lib/permissions";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { UserView, type AdminUserRow, type RoleOption } from "@/features/admin/components/user-view";

export default async function UserAdminPage() {
  const user = await requirePermission(PERMISSION_CODES.USER_VIEW);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
      },
      orderBy: { username: "asc" },
    }),
    prisma.role.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    roles: u.roles.map((r) => r.role),
  }));
  const roleOptions: RoleOption[] = roles;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User"
        description={`Kelola akun login — ${rows.length} user terdaftar.`}
      />
      <UserView
        users={rows}
        roleOptions={roleOptions}
        canCreate={hasPermission(user, PERMISSION_CODES.USER_CREATE)}
        canUpdate={hasPermission(user, PERMISSION_CODES.USER_UPDATE)}
        canDelete={hasPermission(user, PERMISSION_CODES.USER_DELETE)}
      />
    </div>
  );
}
