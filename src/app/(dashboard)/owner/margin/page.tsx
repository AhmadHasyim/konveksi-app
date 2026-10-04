import type { Metadata } from "next";
import { PERMISSION_CODES as P } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PeriodTabs } from "@/features/finance/components/period-tabs";
import { financeAgg, parsePeriod } from "@/features/finance/queries";
import { formatCurrency } from "@/lib/utils/format";
import { MarginTable } from "@/features/finance/components/margin-table";
import { CHANNEL_LABEL } from "@/features/order/components/status";

export const metadata: Metadata = { title: "Margin" };

export default async function MarginPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePermission(P.MARGIN_VIEW);
  const { period: periodRaw } = await searchParams;
  const period = parsePeriod(periodRaw);
  const agg = await financeAgg(period);

  return (
    <PageContainer>
      <PageHeader
        title="Margin"
        description="Margin per produk dan per marketplace — hanya Owner (MARGIN_VIEW)."
        actions={<PeriodTabs current={period} basePath="/owner/margin" />}
      />

      {/* Per channel */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agg.perChannel.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada penjualan terkirim pada periode ini.</p>
        ) : (
          agg.perChannel.map((c) => {
            const share = agg.revenue > 0 ? Math.round((c.revenue / agg.revenue) * 1000) / 10 : 0;
            return (
              <div key={c.channel} className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="neutral">{CHANNEL_LABEL[c.channel] ?? c.channel}</Badge>
                  <span className="text-xs text-slate-400">{share}% omzet</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Qty</span>
                    <span className="font-medium text-slate-800 tabular-nums">{c.qty} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pendapatan</span>
                    <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(c.revenue)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="text-slate-500">Margin share</span>
                    <span className="font-semibold text-teal-700 tabular-nums">{share}%</span>
                  </div>
                </div>
                {/* bar proporsi */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
              </div>
            );
          })
        )}
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
