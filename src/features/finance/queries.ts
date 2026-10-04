import { prisma } from "@/lib/db/prisma";

// Konstanta periode dipisah ke period.ts — file ini di-import oleh komponen
// client, tidak boleh menarik prisma/pg ke bundle browser (lihat: "dns" error).
import type { PeriodKey } from "./period";
export { PERIOD_OPTIONS, parsePeriod } from "./period";
export type { PeriodKey };

export function periodRange(period: PeriodKey): { start: Date | null; end: Date } {
  const end = new Date();
  if (period === "today") {
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return { start, end };
  }
  if (period === "7d") return { start: new Date(end.getTime() - 6 * 86400_000), end };
  if (period === "30d") return { start: new Date(end.getTime() - 29 * 86400_000), end };
  if (period === "month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start, end };
  }
  return { start: null, end };
}

export interface ProductMargin {
  productId: string;
  code: string;
  name: string;
  qty: number;
  revenue: number;
  hpp: number;
  hppPerUnit: number | null;
  margin: number;
}

export interface FinanceAgg {
  revenue: number;
  hpp: number;
  margin: number;
  marginPct: number; // 0-100, 1 desimal
  orderCount: number;
  qty: number;
  missingHpp: number; // item tanpa HPP produk
  perProduct: ProductMargin[];
  perChannel: { channel: string; qty: number; revenue: number }[];
}

/**
 * Agregasi finansial dari order SHIPPED/COMPLETED pada rentang periode.
 * HPP = Σ qty × Product.hpp (flat). qty memakai orderedQty — cukup akurat
 * karena order terkirim umumnya sama dengan actual; koreksi per actual qty
 * menyusul setelah data picking matang.
 */
export async function financeAgg(period: PeriodKey): Promise<FinanceAgg> {
  const { start, end } = periodRange(period);

  const items = await prisma.salesOrderItem.findMany({
    where: {
      order: {
        status: { in: ["SHIPPED", "COMPLETED"] },
        ...(start ? { date: { gte: start, lte: end } } : { date: { lte: end } }),
      },
    },
    select: {
      orderedQty: true,
      subtotal: true,
      productId: true,
      product: { select: { code: true, name: true, hpp: true } },
      order: { select: { channel: true, id: true } },
    },
  });

  const byProduct = new Map<string, ProductMargin>();
  const byChannel = new Map<string, { qty: number; revenue: number }>();
  let revenue = 0;
  let hpp = 0;
  let qty = 0;
  let missingHpp = 0;
  const orderIds = new Set<string>();

  for (const i of items) {
    const p = i.product;
    const unitHpp = p.hpp;
    const lineHpp = unitHpp === null ? 0 : unitHpp * i.orderedQty;
    if (unitHpp === null) missingHpp += i.orderedQty;

    revenue += i.subtotal;
    hpp += lineHpp;
    qty += i.orderedQty;
    orderIds.add(i.order.id);

    const cur =
      byProduct.get(i.productId) ??
      ({
        productId: i.productId,
        code: p.code,
        name: p.name,
        qty: 0,
        revenue: 0,
        hpp: 0,
        hppPerUnit: unitHpp,
        margin: 0,
      } satisfies ProductMargin);
    cur.qty += i.orderedQty;
    cur.revenue += i.subtotal;
    cur.hpp += lineHpp;
    cur.hppPerUnit = unitHpp;
    cur.margin = cur.revenue - cur.hpp;
    byProduct.set(i.productId, cur);

    const ch = byChannel.get(i.order.channel) ?? { qty: 0, revenue: 0 };
    ch.qty += i.orderedQty;
    ch.revenue += i.subtotal;
    byChannel.set(i.order.channel, ch);
  }

  const perProduct = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const perChannel = [...byChannel.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    revenue,
    hpp,
    margin: revenue - hpp,
    marginPct: revenue > 0 ? Math.round(((revenue - hpp) / revenue) * 1000) / 10 : 0,
    orderCount: orderIds.size,
    qty,
    missingHpp,
    perProduct,
    perChannel,
  };
}

/** Ringkasan kas (CashTransaction IN/OUT) pada periode yang sama. */
export async function cashAgg(period: PeriodKey) {
  const { start, end } = periodRange(period);
  const rows = await prisma.cashTransaction.findMany({
    where: {
      ...(start ? { date: { gte: start, lte: end } } : { date: { lte: end } }),
    },
    select: { type: true, amount: true },
  });
  let inn = 0;
  let out = 0;
  for (const r of rows) {
    if (r.type === "IN") inn += r.amount;
    else out += r.amount;
  }
  return { in: inn, out, balance: inn - out, count: rows.length };
}
