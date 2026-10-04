"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

export interface StockRow {
  id: string;
  productCode: string;
  productName: string;
  productActive: boolean;
  colorName: string | null;
  colorHex: string | null;
  sizeCode: string | null;
  sizeLabel: string | null;
  qty: number;
  updatedAt: string;
}

const CRITIS = 5; // ≤ 5 pcs dianggap kritis

export function BarangJadiView({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "ready" | "low" | "out">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        status === "low"
          ? r.qty > 0 && r.qty <= CRITIS
          : status === "out"
            ? r.qty === 0
            : status === "ready"
              ? r.qty > CRITIS
              : true,
      )
      .filter(
        (r) =>
          !needle ||
          r.productName.toLowerCase().includes(needle) ||
          r.productCode.toLowerCase().includes(needle) ||
          (r.colorName ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => a.productName.localeCompare(b.productName, "id"));
  }, [rows, q, status]);

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "product",
      header: "Produk",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">{r.productName}</span>
          <span className="block text-xs text-slate-400">{r.productCode}</span>
        </div>
      ),
    },
    {
      key: "color",
      header: "Warna",
      render: (r) =>
        r.colorName ? (
          <span className="inline-flex items-center gap-2 text-slate-700">
            <span
              className="size-3.5 rounded-full border border-slate-200"
              style={{ backgroundColor: r.colorHex ?? "#e2e8f0" }}
              aria-hidden
            />
            {r.colorName}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "size",
      header: "Ukuran",
      render: (r) => (r.sizeCode ? <span className="text-slate-700">{r.sizeCode}</span> : <span className="text-slate-400">—</span>),
    },
    {
      key: "qty",
      header: "Stok",
      render: (r) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            r.qty === 0 ? "text-red-600" : r.qty <= CRITIS ? "text-amber-600" : "text-slate-800",
          )}
        >
          {r.qty} pcs
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.qty === 0 ? (
          <StatusBadge tone="danger">Habis</StatusBadge>
        ) : r.qty <= CRITIS ? (
          <StatusBadge tone="warning">Kritis</StatusBadge>
        ) : (
          <StatusBadge tone="success">Aman</StatusBadge>
        ),
    },
    { key: "updatedAt", header: "Diperbarui", render: (r) => <span className="text-xs text-slate-400">{r.updatedAt.slice(0, 10)}</span> },
  ];

  return (
    <DataTable
      title="Stok Barang Jadi"
      description={`${rows.length} baris stok — kritis ≤ ${CRITIS} pcs.`}
      columns={columns}
      rows={filtered}
      keyOf={(r) => r.id}
      searchable={{ placeholder: "Cari produk / warna…", value: q, onChange: setQ }}
      filters={
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ["all", "Semua"],
              ["ready", "Aman"],
              ["low", "Kritis"],
              ["out", "Habis"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatus(k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                status === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
      emptyTitle="Belum ada baris stok"
      emptyDescription="Stok tercipta otomatis dari hasil produksi / retur restock, atau input penyesuaian ( menyusul )."
    />
  );
}
