import type { NextRequest } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/permissions";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { getLaporanDaily } from "@/features/analytics/laporan";
import { laporanHarianXlsx } from "@/lib/server/excel";
import type { RangeKey } from "@/features/analytics/shared";

/** GET /api/export/laporan?range=7d — unduh .xlsx laporan penjualan (REPORT_VIEW). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, P.REPORT_VIEW))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const rangeParam = req.nextUrl.searchParams.get("range") ?? "30d";
  const range: RangeKey = (["7d", "30d", "month", "all"] as const).includes(rangeParam as RangeKey)
    ? (rangeParam as RangeKey)
    : "30d";

  const { rows, totalAmount, totalQty, orderCount } = await getLaporanDaily(range);
  const buf = await laporanHarianXlsx(rows, { totalAmount, totalQty, orderCount }, range);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-penjualan-${range}.xlsx"`,
    },
  });
}
