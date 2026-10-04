"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface HasilRow {
  id: string;
  date: string;
  kind: "CUTTING" | "SEWING";
  productCode: string;
  productName: string;
  colorName: string;
  actor: string; // nama tim (cutting) / penjahit (jahit)
  qty: number; // total pcs dari item per ukuran
  roll: number | null; // cutting
  surplus: number | null; // cutting — "lebih size S"
  setorQty: number | null; // jahit — jumlah pcs disetor
  note: string | null;
}

type KindFilter = "all" | "CUTTING" | "SEWING";

const TABS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "CUTTING", label: "Cutting" },
  { key: "SEWING", label: "Jahit" },
];

export function HasilView({ rows }: { rows: HasilRow[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => kind === "all" || r.kind === kind)
      .filter(
        (r) =>
          !needle ||
          r.productName.toLowerCase().includes(needle) ||
          r.productCode.toLowerCase().includes(needle) ||
          r.colorName.toLowerCase().includes(needle) ||
          r.actor.toLowerCase().includes(needle),
      );
  }, [rows, q, kind]);

  const columns: DataTableColumn<HasilRow>[] = [
    { key: "date", header: "Tanggal", render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    {
      key: "kind",
      header: "Jenis",
      render: (r) =>
        r.kind === "CUTTING" ? (
          <StatusBadge tone="info">Cutting</StatusBadge>
        ) : (
          <StatusBadge tone="primary">Jahit</StatusBadge>
        ),
    },
    {
      key: "productName",
      header: "Produk",
      render: (r) => (
        <span>
          <span className="font-mono text-xs font-semibold text-teal-700">{r.productCode}</span>{" "}
          <span className="font-medium text-slate-800">{r.productName}</span>
        </span>
      ),
    },
    { key: "colorName", header: "Warna" },
    { key: "actor", header: "Tim / Penjahit", render: (r) => <span className="whitespace-nowrap">{r.actor}</span> },
    {
      key: "qty",
      header: "Qty (pcs)",
      className: "text-right font-medium tabular-nums text-slate-900",
      render: (r) => r.qty,
    },
    {
      key: "roll",
      header: "Roll",
      className: "text-right tabular-nums",
      render: (r) => r.roll ?? <span className="text-slate-400">—</span>,
    },
    {
      key: "setorQty",
      header: "Disetor",
      className: "text-right tabular-nums",
      render: (r) => r.setorQty ?? <span className="text-slate-400">—</span>,
    },
    {
      key: "selisih",
      header: "Selisih",
      className: "text-right font-medium tabular-nums",
      render: (r) => {
        if (r.kind !== "SEWING" || r.setorQty === null) return <span className="font-normal text-slate-400">—</span>;
        const d = r.qty - r.setorQty;
        if (d === 0) return <span className="font-normal text-slate-500">0</span>;
        return (
          <span className={cn(d > 0 ? "text-amber-600" : "text-emerald-600")}>
            {d > 0 ? `+${d}` : d}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Hasil Produksi"
      description={`${rows.length} catatan cutting & jahit — gabungan hasil nyata dari sheet Cutting dan Penjahit, urut tanggal (A→Z).`}
      columns={columns}
      rows={filtered}
      keyOf={(r) => r.id}
      searchable={{
        placeholder: "Cari produk / warna / tim / penjahit…",
        value: q,
        onChange: setQ,
      }}
      filters={
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setKind(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                kind === t.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
      emptyTitle="Belum ada hasil produksi"
      emptyDescription="Data cutting dan penjahit akan muncul di sini."
    />
  );
}
