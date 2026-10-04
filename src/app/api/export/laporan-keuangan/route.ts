import type { NextRequest } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/permissions";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { financeAgg, cashAgg, parsePeriod } from "@/features/finance/queries";
import { laporanKeuanganXlsx } from "@/lib/server/excel";
import { CHANNEL_LABEL } from "@/features/order/components/status";

/** GET /api/export/laporan-keuangan?period=month — .xlsx SENSITIF (FINANCIAL_REPORT_VIEW). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, P.FINANCIAL_REPORT_VIEW))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const [agg, cash] = await Promise.all([financeAgg(period), cashAgg(period)]);
  const buf = await laporanKeuanganXlsx(
    {
      revenue: agg.revenue,
      hpp: agg.hpp,
      margin: agg.margin,
      marginPct: agg.marginPct,
      orderCount: agg.orderCount,
      qty: agg.qty,
      perChannel: agg.perChannel.map((c) => ({ channel: c.channel, revenue: c.revenue })),
    },
    { in: cash.in, out: cash.out, balance: cash.balance, count: cash.count },
    period,
    (c: string) => CHANNEL_LABEL[c] ?? c,
  );
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-keuangan-${period}.xlsx"`,
    },
  });
}
