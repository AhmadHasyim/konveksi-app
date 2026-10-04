import { prisma } from "@/lib/db/prisma";
import { rangeStart, type RangeKey } from "@/features/analytics/shared";

/** Rekap harian penjualan terealisasi (SHIPPED/COMPLETED) — dipakai halaman & export. */
export interface LaporanDailyRow {
  date: string;
  orders: number;
  qty: number;
  amount: number;
}

export async function getLaporanDaily(range: RangeKey) {
  const from = rangeStart(range);
  const orders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ["SHIPPED", "COMPLETED"] },
      ...(from ? { date: { gte: from } } : {}),
    },
    select: { date: true, totalQty: true, totalAmount: true },
  });

  const byDay = new Map<string, LaporanDailyRow>();
  for (const o of orders) {
    const key = o.date.toISOString().slice(0, 10);
    const row = byDay.get(key) ?? { date: key, orders: 0, qty: 0, amount: 0 };
    row.orders += 1;
    row.qty += o.totalQty;
    row.amount += o.totalAmount;
    byDay.set(key, row);
  }
  const rows = [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
  const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalQty = orders.reduce((s, o) => s + o.totalQty, 0);
  const orderCount = orders.length;
  return {
    rows,
    totalAmount,
    totalQty,
    orderCount,
    aov: orderCount > 0 ? Math.round(totalAmount / orderCount) : 0,
  };
}
