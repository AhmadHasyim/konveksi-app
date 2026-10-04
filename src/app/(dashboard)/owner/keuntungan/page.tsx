import type { Metadata } from "next";
import { Coins, Percent, ReceiptText, TrendingUp } from "lucide-react";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodTabs } from "@/features/finance/components/period-tabs";
import { financeAgg, parsePeriod } from "@/features/finance/queries";
import { formatCurrency } from "@/lib/utils/format";
import { MarginTable } from "@/features/finance/components/margin-table";

export const metadata: Metadata = { title: "Keuntungan" };

export default async function KeuntunganPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePermission(P.PROFIT_VIEW);
  const { period: periodRaw } = await searchParams;
  const period = parsePeriod(periodRaw);
  const agg = await financeAgg(period);

  return (
    <PageContainer>
      <PageHeader
        title="Keuntungan"
        description="Pendapatan order terkirim − HPP. Data SENSITIF — hanya Owner (permission PROFIT_VIEW)."
        actions={<PeriodTabs current={period} basePath="/owner/keuntungan" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan" value={formatCurrency(agg.revenue)} icon={TrendingUp} accent="emerald" comparison={`${agg.orderCount} order terkirim`} />
        <StatCard label="HPP (Harga Pokok)" value={formatCurrency(agg.hpp)} icon={ReceiptText} accent="blue" comparison={`${agg.qty} pcs terjual`} />
        <StatCard label="Laba Kotor" value={formatCurrency(agg.margin)} icon={Coins} accent="indigo" comparison="Pendapatan − HPP" />
        <StatCard
          label="Margin"
          value={`${agg.marginPct}%`}
          icon={Percent}
          accent="amber"
          comparison={agg.missingHpp > 0 ? `${agg.missingHpp} pcs tanpa HPP — belum dihitung` : "HPP lengkap"}
        />
      </div>

      <MarginTable
        products={agg.perProduct.map((p) => ({
          id: p.productId,
          code: p.code,
          name: p.name,
          qty: p.qty,
          revenue: p.revenue,
          hpp: p.hpp,
          margin: p.margin,
        }))}
      />
    </PageContainer>
  );
}
