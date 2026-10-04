import type { Metadata } from "next";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { RoleView, type RoleRow, type PermissionItem } from "@/features/admin/components/role-view";

export const metadata: Metadata = { title: "Role & Permission" };

export default async function RoleAdminPage() {
  const user = await requirePermission(PERMISSION_CODES.ROLE_VIEW);

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        permissions: { select: { permission: { select: { code: true } } } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({
      select: { code: true, name: true, description: true, module: true },
      orderBy: [{ module: "asc" }, { code: "asc" }],
    }),
  ]);

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    permissionCodes: r.permissions.map((p) => p.permission.code),
    userCount: r._count.users,
  }));
  const perms: PermissionItem[] = permissions;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Permission"
        description={`${rows.length} role · ${perms.length} permission tersedia.`}
      />
      <RoleView roles={rows} permissions={perms} canManage={hasPermission(user, PERMISSION_CODES.ROLE_MANAGE)} />
    </div>
  );
}
