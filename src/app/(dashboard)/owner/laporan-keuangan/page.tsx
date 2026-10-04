import type { Metadata } from "next";
import { Banknote, Coins, Percent, Receipt, TrendingUp, Wallet } from "lucide-react";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PeriodTabs } from "@/features/finance/components/period-tabs";
import { financeAgg, cashAgg, parsePeriod } from "@/features/finance/queries";
import { formatCurrency } from "@/lib/utils/format";
import { CHANNEL_LABEL } from "@/features/order/components/status";
import { ExportButtons } from "@/components/shared/export-buttons";

export const metadata: Metadata = { title: "Laporan Keuangan" };

export default async function LaporanKeuanganPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePermission(P.FINANCIAL_REPORT_VIEW);
  const { period: periodRaw } = await searchParams;
  const period = parsePeriod(periodRaw);
  const [agg, cash] = await Promise.all([financeAgg(period), cashAgg(period)]);

  return (
    <PageContainer>
      <PageHeader
        title="Laporan Keuangan"
        description="Ringkasan owner: pendapatan, HPP, laba kotor, realisasi margin + arus kas. SENSITIF — FINANCIAL_REPORT_VIEW."
        actions={
          <>
            <PeriodTabs current={period} basePath="/owner/laporan-keuangan" />
            <ExportButtons
              excelHref={`/api/export/laporan-keuangan?period=${period}`}
              filename={`laporan-keuangan-${period}`}
              headers={["Metrik", "Nilai"]}
              rows={[
                ["Pendapatan", agg.revenue],
                ["HPP", agg.hpp],
                ["Laba Kotor", agg.margin],
                ["Margin (%)", agg.marginPct],
                ["Kas Masuk", cash.in],
                ["Kas Keluar", cash.out],
                ["Saldo Periode", cash.balance],
                ...agg.perChannel.map((c) => [
                  `Omzet ${CHANNEL_LABEL[c.channel as keyof typeof CHANNEL_LABEL] ?? c.channel}`,
                  c.revenue,
                ]),
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pendapatan" value={formatCurrency(agg.revenue)} icon={TrendingUp} accent="emerald" comparison={`${agg.orderCount} order · ${agg.qty} pcs`} />
        <StatCard label="HPP" value={formatCurrency(agg.hpp)} icon={Receipt} accent="blue" comparison="HPP flat per produk" />
        <StatCard label="Laba Kotor" value={formatCurrency(agg.margin)} icon={Coins} accent="indigo" comparison="Pendapatan − HPP" />
        <StatCard label="Realisasi Margin" value={`${agg.marginPct}%`} icon={Percent} accent="amber" comparison={agg.missingHpp > 0 ? `${agg.missingHpp} pcs belum punya HPP` : "HPP lengkap"} />
        <StatCard label="Kas Masuk" value={formatCurrency(cash.in)} icon={Wallet} accent="emerald" comparison={`${cash.count} transaksi kas`} />
        <StatCard label="Kas Keluar" value={formatCurrency(cash.out)} icon={Banknote} accent="amber" comparison={`Saldo periode ${formatCurrency(cash.balance)}`} />
      </div>

      <Card className="rounded-xl py-0">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">Komposisi Omzet per Marketplace</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {agg.perChannel.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada penjualan terkirim pada periode ini.</p>
          ) : (
            <div className="space-y-3">
              {agg.perChannel.map((c) => {
                const share = agg.revenue > 0 ? Math.round((c.revenue / agg.revenue) * 1000) / 10 : 0;
                return (
                  <div key={c.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {CHANNEL_LABEL[c.channel] ?? c.channel}{" "}
                        <span className="ml-1 text-xs font-normal text-slate-400">{c.qty} pcs</span>
                      </span>
                      <span className="tabular-nums text-slate-600">
                        {formatCurrency(c.revenue)} <b className="text-teal-700">{share}%</b>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <StatusBadge tone="info">Catatan</StatusBadge>
        <span>
          Angka laba = order Terkirim/Selesai − HPP produk. Laba bersih (setelah biaya operasional) dihitung dari kas
          keluar pada tabel Cash — masuk tahap berikutnya.
        </span>
      </div>
    </PageContainer>
  );
}
