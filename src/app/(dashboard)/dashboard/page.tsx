import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Coins,
  PackageCheck,
  Percent,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { filterMenu, MENU_ITEMS } from "@/components/layout/menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PeriodTabs } from "@/features/finance/components/period-tabs";
import { financeAgg, periodRange, type PeriodKey } from "@/features/finance/queries";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/features/order/components/status";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Ringkasan order, pengiriman, stok, dan keuntungan (Owner).",
};

const CRITIS = 5;
const KEYS: PeriodKey[] = ["today", "7d", "30d", "month", "all"];

/**
 * Dashboard REAL DATA (STEP 15): KPI order/kirim/omzet dari Prisma,
 * blok finansial (HPP/laba/margin) hanya dirender bila user punya PROFIT_VIEW.
 * Filter periode via query param (server) — tanpa angka dummy.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requirePermission(P.DASHBOARD_VIEW);
  const { period: periodRaw } = await searchParams;
  const period: PeriodKey = KEYS.includes(periodRaw as PeriodKey) ? (periodRaw as PeriodKey) : "7d";
  const { start, end } = periodRange(period);
  const showFinance = hasPermission(user, P.PROFIT_VIEW);
  const modules = filterMenu(MENU_ITEMS, user.permissions).filter((m) => m.href !== "/dashboard");

  const [agg, orderCount, shippedCount, liveCount, statusGroups, lowStock, recent, rangeOrders] =
    await Promise.all([
      financeAgg(period),
      prisma.salesOrder.count({ where: dateWhere(start, end) }),
      prisma.salesOrder.count({
        where: { ...dateWhere(start, end), status: { in: ["SHIPPED", "COMPLETED"] } },
      }),
      prisma.salesOrder.count({ where: { status: { in: ["PICKING", "PICKED", "READY_TO_SHIP"] } } }),
      prisma.salesOrder.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.stock.findMany({
        where: { qty: { lte: CRITIS } },
        orderBy: { qty: "asc" },
        take: 6,
        include: {
          product: { select: { code: true, name: true } },
          color: { select: { name: true } },
          size: { select: { code: true } },
        },
      }),
      prisma.salesOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, orderNumber: true, channel: true, status: true, totalAmount: true, totalQty: true },
      }),
      prisma.salesOrder.findMany({
        where: { ...dateWhere(start, end), status: { in: ["SHIPPED", "COMPLETED"] } },
        select: { date: true, totalAmount: true },
      }),
    ]);

  // Omzet per hari utk chart (maks 31 bar)
  const daily = new Map<string, number>();
  for (const o of rangeOrders) {
    const key = o.date.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + o.totalAmount);
  }
  const dailyBars = [...daily.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-31);
  const maxBar = Math.max(1, ...dailyBars.map(([, v]) => v));

  const statusTotal = Math.max(1, statusGroups.reduce((s, g) => s + g._count._all, 0));
  const topProducts = agg.perProduct.slice(0, 5);
  const maxQty = Math.max(1, ...topProducts.map((t) => t.qty));

  return (
    <PageContainer>
      <PageHeader
        title={`Selamat datang, ${user.username}`}
        description="Ringkasan order, pengiriman, stok, dan keuntungan bisnis."
        actions={<PeriodTabs current={period} basePath="/dashboard" />}
      />

      {/* KPI utama */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Order Masuk" value={String(orderCount)} icon={ShoppingCart} accent="indigo" comparison="periode aktif" />
        <StatCard label="Terkirim" value={String(shippedCount)} icon={Truck} accent="emerald" comparison="Terkirim / Selesai" />
        <StatCard label="Omzet" value={formatCurrency(agg.revenue)} icon={TrendingUp} accent="blue" comparison={`${agg.qty} pcs terjual`} />
        <StatCard label="Perlu Diproses" value={String(liveCount)} icon={ClipboardList} accent="amber" comparison="Picking / siap kirim" />
      </div>

      {/* Blok finansial — SENSITIF, hanya Owner (PROFIT_VIEW) */}
      {showFinance ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="HPP" value={formatCurrency(agg.hpp)} icon={ReceiptText} accent="blue" comparison="harga pokok penjualan" />
          <StatCard label="Laba Kotor" value={formatCurrency(agg.margin)} icon={Coins} accent="emerald" comparison="Pendapatan − HPP" />
          <StatCard label="Margin" value={`${agg.marginPct}%`} icon={Percent} accent="indigo" comparison="periode aktif" />
          <StatCard
            label="Order Jadi Basis Laba"
            value={String(agg.orderCount)}
            icon={PackageCheck}
            accent="amber"
            comparison={agg.missingHpp > 0 ? `${agg.missingHpp} pcs belum punya HPP` : "HPP lengkap"}
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Chart omzet harian */}
        <Card className="rounded-xl py-0 lg:col-span-2">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Omzet Harian</CardTitle>
            <CardDescription>Order terkirim per hari — periode aktif.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {dailyBars.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Belum ada order terkirim pada periode ini. Order diproses lewat menu{" "}
                <Link href="/order" className="font-medium text-teal-700 hover:underline">
                  Order &amp; Resi
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="flex h-44 items-end gap-1.5">
                  {dailyBars.map(([day, value]) => (
                    <div key={day} className="group relative flex-1" title={`${day}: ${formatCurrency(value)}`}>
                      <div
                        className="w-full rounded-t-md bg-teal-500/80 transition-colors group-hover:bg-teal-600"
                        style={{ height: `${Math.max(4, Math.round((value / maxBar) * 168))}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>{dailyBars[0][0]}</span>
                  <span>{dailyBars[dailyBars.length - 1][0]}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status order */}
        <Card className="rounded-xl py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Status Order</CardTitle>
            <CardDescription>Distribusi seluruh order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-2">
            {[...statusGroups]
              .sort((a, b) => b._count._all - a._count._all)
              .map((g) => {
                const pct = Math.round((g._count._all / statusTotal) * 100);
                return (
                  <div key={g.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <StatusBadge tone={ORDER_STATUS_TONE[g.status] ?? "neutral"}>
                        {ORDER_STATUS_LABEL[g.status] ?? g.status}
                      </StatusBadge>
                      <span className="tabular-nums text-slate-600">
                        {g._count._all} <span className="text-xs text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Produk terlaris */}
        <Card className="rounded-xl py-0 lg:col-span-2">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Produk Terlaris</CardTitle>
            <CardDescription>Qty terjual — periode aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-2">
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada penjualan terkirim pada periode ini.</p>
            ) : (
              topProducts.map((t) => {
                const pct = Math.round((t.qty / maxQty) * 100);
                return (
                  <div key={t.productId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {t.name} <span className="text-xs font-normal text-slate-400">{t.code}</span>
                      </span>
                      <span className="tabular-nums text-slate-600">
                        {t.qty} pcs · <b className="text-teal-700">{formatCurrency(t.revenue)}</b>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
            <Link href="/laporan/produk-terlaris" className="inline-block text-xs font-medium text-teal-700 hover:underline">
              Lihat laporan lengkap →
            </Link>
          </CardContent>
        </Card>

        {/* Stok kritis */}
        <Card className="rounded-xl py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <AlertTriangle className="size-4 text-amber-500" aria-hidden /> Stok Kritis
            </CardTitle>
            <CardDescription>Barang jadi ≤ {CRITIS} pcs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-500">Semua stok aman.</p>
            ) : (
              lowStock.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    {s.product.name}
                    <span className="ml-1 text-xs text-slate-400">
                      {[s.color?.name, s.size?.code].filter(Boolean).join("/")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      s.qty === 0 ? "text-red-600" : "text-amber-600",
                    )}
                  >
                    {s.qty} pcs
                  </span>
                </div>
              ))
            )}
            <Link href="/stok/barang-jadi" className="inline-block text-xs font-medium text-teal-700 hover:underline">
              Buka Barang Jadi →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Order terbaru + modul */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl py-0 lg:col-span-2">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Order Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada order.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <Link
                    key={o.id}
                    href={`/order/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:bg-teal-50/50"
                  >
                    <span className="font-medium text-slate-800">{o.orderNumber}</span>
                    <span className="hidden text-xs text-slate-400 sm:block">{o.totalQty} pcs</span>
                    <span className="tabular-nums text-slate-600">{formatCurrency(o.totalAmount)}</span>
                    <StatusBadge tone={ORDER_STATUS_TONE[o.status] ?? "neutral"}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </StatusBadge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Modul Anda</CardTitle>
            <CardDescription>{modules.length} modul sesuai hak akses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-3">
            {modules.slice(0, 7).map((m) => (
              <Link
                key={m.href}
                href={m.children ? m.children[0].href : m.href}
                className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-teal-50 group-hover:text-teal-600">
                  <m.icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {m.title}
                </span>
                <ArrowRight
                  className="size-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
                  aria-hidden
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function dateWhere(start: Date | null, end: Date) {
  return { date: start ? { gte: start, lte: end } : { lte: end } };
}
