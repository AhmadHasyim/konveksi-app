import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { buttonStyles } from "@/components/ui/button";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils/format";
import { ProgressBar } from "@/features/analytics/shared";

export const metadata: Metadata = { title: "Produk Terlaris" };

interface TopProductRow {
  rank: number;
  id: string;
  code: string;
  name: string;
  qty: number;
  amount: number;
  pct: number;
}

export default async function ProdukTerlarisPage() {
  await requirePermission(PERMISSION_CODES.REPORT_VIEW);

  // Aggregate item order terealisasi (SHIPPED / COMPLETED) per produk.
  const grouped = await prisma.salesOrderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { in: ["SHIPPED", "COMPLETED"] } } },
    _sum: { orderedQty: true, subtotal: true },
    orderBy: { _sum: { orderedQty: "desc" } },
    take: 50,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, code: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const maxQty = Math.max(...grouped.map((g) => g._sum.orderedQty ?? 0), 1);
  const rows: TopProductRow[] = grouped
    .map((g, i) => {
      const p = productMap.get(g.productId);
      const qty = g._sum.orderedQty ?? 0;
      return {
        rank: i + 1,
        id: g.productId,
        code: p?.code ?? "—",
        name: p?.name ?? "Produk dihapus",
        qty,
        amount: g._sum.subtotal ?? 0,
        pct: (qty / maxQty) * 100,
      };
    })
    .sort((a, b) => b.qty - a.qty);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  const columns: DataTableColumn<TopProductRow>[] = [
    {
      key: "rank",
      header: "#",
      className: "w-10 tabular-nums text-slate-400",
      render: (r) => r.rank,
    },
    {
      key: "name",
      header: "Produk",
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-medium text-slate-900">{r.name}</span>
          <span className="text-xs text-slate-400">{r.code}</span>
        </span>
      ),
    },
    {
      key: "qty",
      header: "Qty terjual",
      className: "tabular-nums",
      render: (r) => `${r.qty.toLocaleString("id-ID")} pcs`,
    },
    {
      key: "amount",
      header: "Pendapatan",
      className: "tabular-nums font-semibold text-slate-900",
      render: (r) => formatCurrency(r.amount),
    },
    {
      key: "pct",
      header: "Share vs tertinggi",
      render: (r) => <ProgressBar pct={r.pct} />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Produk Terlaris"
        description="Peringkat produk berdasarkan qty terjual dari order berstatus terkirim atau selesai."
        actions={
          <Link href="/laporan" className={buttonStyles("outline", "sm")}>
            <ArrowLeft aria-hidden />
            Laporan penjualan
          </Link>
        }
      />

      <DataTable
        title="Peringkat produk"
        description={`${rows.length} produk · ${totalQty.toLocaleString("id-ID")} pcs terjual`}
        columns={columns}
        rows={rows}
        keyOf={(r) => r.id}
        emptyTitle="Belum ada produk terjual"
        emptyDescription="Order berstatus terkirim atau selesai akan muncul di peringkat ini."
      />
    </PageContainer>
  );
}
