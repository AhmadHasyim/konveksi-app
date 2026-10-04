"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

export interface MovementRow {
  id: string;
  date: string;
  product: string;
  variant: string;
  type: string;
  qty: number;
  refType: string | null;
  refId: string | null;
  user: string | null;
  note: string | null;
}

const TYPE_META: Record<string, { label: string; tone: StatusTone; sign: "+" | "−" }> = {
  PRODUCTION_IN: { label: "Produksi Masuk", tone: "success", sign: "+" },
  PRODUCTION_OUT: { label: "Bahan Keluar", tone: "warning", sign: "−" },
  SALE_SHIPMENT: { label: "Pengiriman", tone: "primary", sign: "−" },
  RETURN_IN: { label: "Retur Masuk", tone: "info", sign: "+" },
  ADJUSTMENT_IN: { label: "Koreksi +", tone: "neutral", sign: "+" },
  ADJUSTMENT_OUT: { label: "Koreksi −", tone: "neutral", sign: "−" },
};

const TYPE_TABS = [
  ["all", "Semua"],
  ["in", "Masuk"],
  ["out", "Keluar"],
] as const;

export function MutasiView({ rows }: { rows: MovementRow[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "in" | "out">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        const meta = TYPE_META[r.type];
        if (tab === "in") return meta?.sign === "+";
        if (tab === "out") return meta?.sign === "−";
        return true;
      })
      .filter((r) => !needle || r.product.toLowerCase().includes(needle) || (r.note ?? "").toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, q, tab]);

  const columns: DataTableColumn<MovementRow>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="text-slate-800">{r.date.slice(0, 10)}</span>
          <span className="block text-xs text-slate-400">{r.date.slice(11, 16)} UTC</span>
        </div>
      ),
    },
    {
      key: "product",
      header: "Produk",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-medium text-slate-900">{r.product}</span>
          <span className="block text-xs text-slate-400">{r.variant}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis",
      render: (r) => {
        const meta = TYPE_META[r.type] ?? { label: r.type, tone: "neutral" as StatusTone, sign: "+" };
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
    {
      key: "qty",
      header: "Qty",
      render: (r) => {
        const meta = TYPE_META[r.type];
        const sign = meta?.sign ?? "+";
        return (
          <span className={cn("font-semibold tabular-nums", sign === "+" ? "text-emerald-600" : "text-red-500")}>
            {sign}
            {r.qty}
          </span>
        );
      },
    },
    {
      key: "ref",
      header: "Referensi",
      render: (r) =>
        r.refType ? (
          <div className="space-y-0.5">
            <Badgeish>{r.refType}</Badgeish>
            {r.note ? <span className="block max-w-48 truncate text-xs text-slate-400">{r.note}</span> : null}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    { key: "user", header: "User", render: (r) => <span className="text-slate-500">{r.user ?? "—"}</span> },
  ];

  return (
    <DataTable
      title="Jurnal Mutasi Stok"
      description={`${rows.length} mutasi terakhir.`}
      columns={columns}
      rows={filtered}
      keyOf={(r) => r.id}
      searchable={{ placeholder: "Cari produk / catatan…", value: q, onChange: setQ }}
      filters={
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TYPE_TABS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
      emptyTitle="Belum ada mutasi"
      emptyDescription="Pergerakan stok tercatat otomatis dari pengiriman, produksi, dan retur."
    />
  );
}

function Badgeish({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{children}</span>
  );
}
