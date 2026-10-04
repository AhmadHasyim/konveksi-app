import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatCurrency } from "@/lib/utils/format";

export interface MarginProductRow {
  id: string;
  code: string;
  name: string;
  qty: number;
  revenue: number;
  hpp: number;
  margin: number;
}

/** Tabel laba per produk — dipakai halaman Keuntungan & Margin (server component). */
export function MarginTable({ products }: { products: MarginProductRow[] }) {
  const columns: DataTableColumn<MarginProductRow>[] = [
    {
      key: "name",
      header: "Produk",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">{r.name}</span>
          <span className="block text-xs text-slate-400">{r.code}</span>
        </div>
      ),
    },
    { key: "qty", header: "Terjual", render: (r) => <span className="tabular-nums">{r.qty} pcs</span> },
    { key: "revenue", header: "Pendapatan", render: (r) => <span className="tabular-nums">{formatCurrency(r.revenue)}</span> },
    { key: "hpp", header: "HPP", render: (r) => <span className="tabular-nums text-slate-500">{formatCurrency(r.hpp)}</span> },
    {
      key: "margin",
      header: "Laba",
      render: (r) => (
        <span className={`font-semibold tabular-nums ${r.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {formatCurrency(r.margin)}
        </span>
      ),
    },
    {
      key: "pct",
      header: "Margin %",
      render: (r) => (
        <span className="tabular-nums text-slate-600">
          {r.revenue > 0 ? Math.round((r.margin / r.revenue) * 1000) / 10 : 0}%
        </span>
      ),
    },
  ];

  return (
    <DataTable
      title="Laba per Produk"
      description="Urut pendapatan tertinggi."
      columns={columns}
      rows={products}
      keyOf={(r) => r.id}
      emptyTitle="Belum ada penjualan"
      emptyDescription="Laba muncul setelah ada order berstatus Terkirim/Selesai + HPP produk terisi."
    />
  );
}
