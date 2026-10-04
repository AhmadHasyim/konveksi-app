"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { CurrencyInput } from "@/features/master/components/field";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils/format";
import { updateHpp } from "@/features/finance/actions";

export interface HppRow {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  hpp: number | null;
}

export function HppView({ rows, canEdit }: { rows: HppRow[]; canEdit: boolean }) {
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (onlyMissing ? r.hpp === null : true))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.code.toLowerCase().includes(needle));
  }, [rows, q, onlyMissing]);

  async function save(id: string) {
    const value = draft[id] ?? null;
    setPendingId(id);
    startTransition(async () => {
      const res = await updateHpp({ productId: id, hpp: value });
      toast[res.success ? "success" : "error"](res.message ?? "");
      setPendingId(null);
    });
  }

  const columns: DataTableColumn<HppRow>[] = [
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
    {
      key: "basePrice",
      header: "Harga Jual",
      render: (r) => <span className="text-slate-600">{formatCurrency(r.basePrice)}</span>,
    },
    {
      key: "hpp",
      header: "HPP",
      render: (r) => {
        const value = draft[r.id] ?? r.hpp;
        if (!canEdit) {
          return value === null ? (
            <StatusBadge tone="warning">belum diisi</StatusBadge>
          ) : (
            <span className="font-medium text-slate-800">{formatCurrency(value)}</span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <div className="w-40">
              <CurrencyInput
                value={value ?? 0}
                onChange={(v) => setDraft((d) => ({ ...d, [r.id]: v }))}
                placeholder="0"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || pendingId === r.id}
              onClick={() => save(r.id)}
              aria-label={`Simpan HPP ${r.name}`}
            >
              <Save className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "margin",
      header: "Margin Kotor/Unit",
      render: (r) => {
        const value = draft[r.id] ?? r.hpp;
        if (value === null) return <span className="text-slate-400">—</span>;
        const m = r.basePrice - value;
        return (
          <span className={m >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
            {formatCurrency(m)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        (draft[r.id] ?? r.hpp) === null ? (
          <StatusBadge tone="warning">Belum ada HPP</StatusBadge>
        ) : (
          <StatusBadge tone="success">Terisi</StatusBadge>
        ),
    },
  ];

  const missing = rows.filter((r) => r.hpp === null).length;

  return (
    <DataTable
      title="HPP per Produk"
      description={
        missing > 0
          ? `${missing} produk belum punya HPP — keuntungan baru dihitung untuk yang terisi.`
          : "Semua produk sudah punya HPP."
      }
      columns={columns}
      rows={filtered}
      keyOf={(r) => r.id}
      searchable={{ placeholder: "Cari produk…", value: q, onChange: setQ }}
      filters={
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setOnlyMissing(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${!onlyMissing ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setOnlyMissing(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${onlyMissing ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
          >
            Belum diisi
          </button>
        </div>
      }
      emptyTitle="Tidak ada produk"
      emptyDescription="Produk aktif akan tampil di sini."
    />
  );
}
