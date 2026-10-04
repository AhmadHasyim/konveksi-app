import { getCurrentUser, hasPermission } from "@/lib/permissions";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { templateOrderXlsx } from "@/lib/server/excel";

/** GET /api/export/template-order — template .xlsx impor order (SALES_CREATE). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, P.SALES_CREATE))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const buf = await templateOrderXlsx();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-order.xlsx"',
    },
  });
}
