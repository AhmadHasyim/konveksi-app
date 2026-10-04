import type { Metadata } from "next";
import { Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import {
  BarChart,
  ProgressBar,
  RangeTabs,
  axisLabel,
  dayKey,
  formatMonth,
  pickRange,
  rangeStart,
  statusLabel,
  STATUS_TONES,
  CHANNEL_LABELS,
  type RangeKey,
  type TrendPoint,
} from "@/features/analytics/shared";

export const metadata: Metadata = { title: "Penjualan" };

const ALLOWED = ["7d", "30d", "all"] as const;
const REALIZED = new Set(["SHIPPED", "COMPLETED"]);

const TONE_BAR: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  primary: "bg-teal-500",
  neutral: "bg-slate-400",
};

interface ChannelRow {
  channel: string;
  orders: number;
  qty: number;
  amount: number;
  pct: number;
}
interface StatusRow {
  status: string;
  count: number;
  pct: number;
}
interface OrderRow {
  id: string;
  orderNumber: string;
  date: Date;
  channel: string;
  status: string;
  totalQty: number;
  totalAmount: number;
  customerName: string | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** Bucket tren: harian bila rentang ≤ 60 hari, bulanan di atas itu. */
function buildTrend(realized: OrderRow[], from: Date | null): TrendPoint[] {
  const today = startOfDay(new Date());
  const buckets = new Map<string, number>();
  const spanDays = from
    ? Math.round((today.getTime() - startOfDay(from).getTime()) / 86_400_000)
    : Number.POSITIVE_INFINITY;

  if (from && spanDays <= 60) {
    for (let t = startOfDay(from).getTime(); t <= today.getTime(); t += 86_400_000) {
      buckets.set(dayKey(new Date(t)), 0);
    }
    for (const o of realized) {
      const k = dayKey(o.date);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalAmount);
    }
    return [...buckets].map(([k, v]) => ({ label: axisLabel(k), value: v }));
  }

  const end = monthIndex(today);
  const earliest = realized.length ? Math.min(...realized.map((o) => monthIndex(o.date))) : end;
  // ponytail: maks 37 bucket bulan — ganti ke agregasi DB bila datanya bertahun-tahun.
  const start = Math.max(earliest, from ? monthIndex(from) : earliest, end - 36);
  for (let m = start; m <= end; m++) {
    buckets.set(`${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`, 0);
  }
  for (const o of realized) {
    const k = `${Math.floor(monthIndex(o.date) / 12)}-${String((monthIndex(o.date) % 12) + 1).padStart(2, "0")}`;
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalAmount);
  }
  return [...buckets].map(([k, v]) => ({ label: formatMonth(k), value: v }));
}

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSION_CODES.SALES_VIEW);

  const sp = await searchParams;
  const period = pickRange(sp.period, ALLOWED, "7d");
  const from = rangeStart(period as RangeKey);

  // ponytail: 1 query fetch → semua turunan dihitung JS. Ganti ke groupBy/aggregate
  // saat volume order sudah ribuan per hari.
  const orders = await prisma.salesOrder.findMany({
    where: from ? { date: { gte: from } } : {},
    orderBy: { date: "desc" },
    select: {
      id: true,
      orderNumber: true,
      date: true,
      channel: true,
      status: true,
      totalQty: true,
      totalAmount: true,
      customerName: true,
    },
  });

  const realized = orders.filter((o) => REALIZED.has(o.status));
  const omzet = realized.reduce((s, o) => s + o.totalAmount, 0);
  const qty = realized.reduce((s, o) => s + o.totalQty, 0);
  const aov = realized.length > 0 ? Math.round(omzet / realized.length) : 0;

  // Per channel: order = semua status aktif, qty/omzet = yang terealisasi.
  const chMap = new Map<string, ChannelRow>();
  for (const o of orders) {
    const row = chMap.get(o.channel) ?? { channel: o.channel, orders: 0, qty: 0, amount: 0, pct: 0 };
    row.orders += 1;
    if (REALIZED.has(o.status)) {
      row.qty += o.totalQty;
      row.amount += o.totalAmount;
    }
    chMap.set(o.channel, row);
  }
  const maxAmount = Math.max(...[...chMap.values()].map((c) => c.amount), 1);
  const channelRows = [...chMap.values()]
    .map((c) => ({ ...c, pct: (c.amount / maxAmount) * 100 }))
    .sort((a, b) => b.amount - a.amount || b.orders - a.orders);

  const statusRows: StatusRow[] = [...orders.reduce((m, o) => m.set(o.status, (m.get(o.status) ?? 0) + 1), new Map<string, number>())]
    .map(([status, count]) => ({
      status,
      count,
      pct: orders.length > 0 ? (count / orders.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const trend = buildTrend(realized, from);
  const latest = orders.slice(0, 10);

  const channelColumns: DataTableColumn<ChannelRow>[] = [
    {
      key: "channel",
      header: "Channel",
      render: (r) => <span className="font-medium text-slate-900">{CHANNEL_LABELS[r.channel] ?? r.channel}</span>,
    },
    {
      key: "orders",
      header: "Order",
      className: "tabular-nums text-right",
      render: (r) => r.orders.toLocaleString("id-ID"),
    },
    {
      key: "qty",
      header: "Qty terkirim",
      className: "tabular-nums text-right",
      render: (r) => `${r.qty.toLocaleString("id-ID")} pcs`,
    },
    {
      key: "amount",
      header: "Omzet",
      className: "tabular-nums text-right font-semibold text-slate-900",
      render: (r) => formatCurrency(r.amount),
    },
    {
      key: "pct",
      header: "Share omzet",
      render: (r) => <ProgressBar pct={r.pct} />,
    },
  ];

  const orderColumns: DataTableColumn<OrderRow>[] = [
    { key: "orderNumber", header: "No. order", render: (r) => <span className="font-medium text-slate-900">{r.orderNumber}</span> },
    { key: "date", header: "Tanggal", render: (r) => formatDateTime(r.date) },
    { key: "channel", header: "Channel", render: (r) => CHANNEL_LABELS[r.channel] ?? r.channel },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge tone={STATUS_TONES[r.status] ?? "neutral"}>{statusLabel(r.status)}</StatusBadge>,
    },
    {
      key: "totalQty",
      header: "Qty",
      className: "tabular-nums text-right",
      render: (r) => r.totalQty.toLocaleString("id-ID"),
    },
    {
      key: "totalAmount",
      header: "Omzet",
      className: "tabular-nums text-right font-semibold text-slate-900",
      render: (r) => formatCurrency(r.totalAmount),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Penjualan"
        description="Analitik penjualan: KPI, kontribusi per channel, tren omzet, dan distribusi status order."
        actions={<RangeTabs current={period} allowed={ALLOWED} basePath="/penjualan" param="period" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Omzet terealisasi"
          value={formatCurrency(omzet)}
          comparison="order terkirim / selesai"
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Order"
          value={orders.length.toLocaleString("id-ID")}
          comparison={`${realized.length} terealisasi`}
          icon={ShoppingBag}
          accent="indigo"
        />
        <StatCard
          label="Qty terjual"
          value={`${qty.toLocaleString("id-ID")} pcs`}
          comparison="unit terkirim"
          icon={Package}
          accent="blue"
        />
        <StatCard
          label="AOV"
          value={formatCurrency(aov)}
          comparison="omzet ÷ order terealisasi"
          icon={Receipt}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Tren omzet</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <BarChart points={trend} emptyLabel="Belum ada order terealisasi pada rentang ini." />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Distribusi status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {statusRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Belum ada order pada rentang ini.</p>
            ) : (
              statusRows.map((s) => {
                const tone = STATUS_TONES[s.status] ?? "neutral";
                return (
                  <div key={s.status} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge tone={tone}>{statusLabel(s.status)}</StatusBadge>
                      <span className="text-sm tabular-nums text-slate-600">
                        {s.count}
                        <span className="ml-1 text-xs text-slate-400">{s.pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${TONE_BAR[tone] ?? TONE_BAR.neutral}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        title="Kontribusi per channel"
        description="Order = seluruh status; qty & omzet hanya order terkirim / selesai."
        columns={channelColumns}
        rows={channelRows}
        keyOf={(r) => r.channel}
        emptyTitle="Belum ada order pada rentang ini"
        emptyDescription="Ringkasan per channel (Shopee, TikTok, Live, Dropship, Reseller, Offline) muncul di sini."
      />

      <DataTable
        title="Order terbaru"
        description="10 order dengan tanggal terbaru."
        columns={orderColumns}
        rows={latest}
        keyOf={(r) => r.id}
        emptyTitle="Belum ada order"
        emptyDescription="Order yang diinput akan tampil di daftar ini."
      />
    </PageContainer>
  );
}
