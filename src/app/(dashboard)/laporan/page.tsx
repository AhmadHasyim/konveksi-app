import type { Metadata } from "next";
import Link from "next/link";
import { Package, Receipt, ShoppingBag, Trophy, Wallet } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { buttonStyles } from "@/components/ui/button";
import { ExportButtons } from "@/components/shared/export-buttons";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils/format";
import { RangeTabs, formatDay, pickRange } from "@/features/analytics/shared";
import { getLaporanDaily, type LaporanDailyRow } from "@/features/analytics/laporan";

export const metadata: Metadata = { title: "Laporan Penjualan" };

const ALLOWED = ["7d", "30d", "month"] as const;

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSION_CODES.REPORT_VIEW);

  const sp = await searchParams;
  const range = pickRange(sp.range, ALLOWED, "30d");
  // Rekap = order terealisasi (SHIPPED/COMPLETED) — helper dipakai bersama utk export Excel.
  const { rows, totalAmount, totalQty, orderCount, aov } = await getLaporanDaily(range);

  const columns: DataTableColumn<LaporanDailyRow>[] = [
    { key: "date", header: "Tanggal", render: (r) => formatDay(r.date) },
    {
      key: "orders",
      header: "Jumlah order",
      className: "tabular-nums text-right",
      render: (r) => r.orders.toLocaleString("id-ID"),
    },
    {
      key: "qty",
      header: "Total qty",
      className: "tabular-nums text-right",
      render: (r) => r.qty.toLocaleString("id-ID"),
    },
    {
      key: "amount",
      header: "Total omzet",
      className: "tabular-nums text-right font-semibold text-slate-900",
      render: (r) => formatCurrency(r.amount),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Laporan Penjualan"
        description="Rekap harian penjualan terealisasi (dikirim / selesai) pada rentang tanggal terpilih."
        actions={
          <>
            <RangeTabs current={range} allowed={ALLOWED} basePath="/laporan" param="range" />
            <Link
              href="/laporan/produk-terlaris"
              className={buttonStyles("outline", "sm")}
            >
              <Trophy aria-hidden />
              Produk terlaris
            </Link>
            <ExportButtons
              filename={`laporan-penjualan-${range}`}
              headers={["Tanggal", "Jumlah order", "Total qty", "Total omzet"]}
              rows={rows.map((r) => [r.date, r.orders, r.qty, r.amount])}
              excelHref={`/api/export/laporan?range=${range}`}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Omzet"
          value={formatCurrency(totalAmount)}
          comparison={`${rows.length} hari terjual`}
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Order terealisasi"
          value={orderCount.toLocaleString("id-ID")}
          comparison="status terkirim / selesai"
          icon={ShoppingBag}
          accent="indigo"
        />
        <StatCard
          label="Total qty"
          value={`${totalQty.toLocaleString("id-ID")} pcs`}
          comparison="unit terkirim"
          icon={Package}
          accent="blue"
        />
        <StatCard
          label="Rata-rata / order (AOV)"
          value={formatCurrency(aov)}
          comparison="omzet ÷ jumlah order"
          icon={Receipt}
          accent="amber"
        />
      </div>

      <DataTable
        title="Rekap harian"
        description="Satu baris per tanggal — jumlah order, qty, dan omzet."
        columns={columns}
        rows={rows}
        keyOf={(r) => r.date}
        emptyTitle="Belum ada penjualan pada rentang ini"
        emptyDescription="Order berstatus terkirim atau selesai akan muncul sebagai rekap harian di sini."
        footer={
          rows.length > 0 ? (
            <>
              <span className="text-xs text-slate-500">{rows.length} hari</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(totalAmount)}
              </span>
            </>
          ) : null
        }
      />
    </PageContainer>
  );
}
