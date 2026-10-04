"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { saveTarget, deleteTarget } from "@/features/hr/actions";
import { MONTHS, handle, periodLabel } from "@/features/hr/shared";
import { CurrencyInput, FormField } from "@/features/master/components/field";

export interface TargetRow {
  id: string;
  year: number;
  month: number;
  targetPcs: number;
  targetAmount: number;
  commissionPct: number;
  upTargetPct: number;
  actualPcs: number;
  actualAmount: number;
}

type Tab = "all" | "done" | "todo";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "done", label: "Tercapai" },
  { key: "todo", label: "Belum" },
];

const CURRENT_YEAR = new Date().getFullYear();

const emptyForm = {
  year: CURRENT_YEAR,
  month: 1,
  targetPcs: 0,
  targetAmount: 0,
  commissionPct: 0,
  upTargetPct: 0,
};

function achievement(r: TargetRow): { achieved: boolean; pct: number } {
  if (r.targetAmount <= 0 && r.targetPcs <= 0) return { achieved: false, pct: 0 };
  const pct =
    r.targetAmount > 0
      ? Math.round((r.actualAmount / r.targetAmount) * 100)
      : Math.round((r.actualPcs / r.targetPcs) * 100);
  const achieved =
    (r.targetAmount > 0 ? r.actualAmount >= r.targetAmount : true) &&
    (r.targetPcs > 0 ? r.actualPcs >= r.targetPcs : true);
  return { achieved, pct };
}

export function TargetView({ rows, currentYear }: { rows: TargetRow[]; currentYear: number }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        const { achieved } = achievement(r);
        if (tab === "done") return achieved;
        if (tab === "todo") return !achieved;
        return true;
      })
      .filter(
        (r) =>
          !needle ||
          periodLabel(r.year, r.month).toLowerCase().includes(needle) ||
          String(r.year).includes(needle),
      )
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }, [rows, tab, q]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({ target: acc.target + r.targetAmount, actual: acc.actual + r.actualAmount }),
        { target: 0, actual: 0 },
      ),
    [filtered],
  );

  function submit() {
    if (!form) return;
    startTransition(async () => {
      if (handle(await saveTarget(form), setFieldErrors)) setForm(null);
    });
  }

  const columns: DataTableColumn<TargetRow>[] = [
    {
      key: "period",
      header: "Periode",
      render: (r) => <span className="font-medium whitespace-nowrap text-slate-800">{periodLabel(r.year, r.month)}</span>,
    },
    {
      key: "targetPcs",
      header: "Target Pcs",
      className: "text-right tabular-nums",
      render: (r) => r.targetPcs.toLocaleString("id-ID"),
    },
    {
      key: "targetAmount",
      header: "Target Omzet",
      className: "text-right tabular-nums",
      render: (r) => formatCurrency(r.targetAmount),
    },
    {
      key: "actualPcs",
      header: "Aktual Pcs",
      className: "text-right tabular-nums",
      render: (r) => <span className="text-slate-600">{r.actualPcs.toLocaleString("id-ID")}</span>,
    },
    {
      key: "actualAmount",
      header: "Aktual Omzet",
      className: "text-right tabular-nums",
      render: (r) => <span className="text-slate-600">{formatCurrency(r.actualAmount)}</span>,
    },
    {
      key: "progress",
      header: "Capaian",
      render: (r) => {
        const { achieved, pct } = achievement(r);
        return (
          <div className="min-w-32">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-xs font-semibold tabular-nums", achieved ? "text-teal-700" : "text-slate-500")}>
                {pct}%
              </span>
              <StatusBadge tone={achieved ? "success" : "warning"}>{achieved ? "Tercapai" : "Belum"}</StatusBadge>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all", achieved ? "bg-teal-500" : "bg-amber-400")}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "commission",
      header: "Komisi",
      render: (r) => (
        <span className="whitespace-nowrap text-xs">
          <b className="text-teal-700">{r.commissionPct}%</b>
          <span className="text-slate-400"> · up </span>
          <b className="text-slate-600">{r.upTargetPct}%</b>
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit target ${periodLabel(r.year, r.month)}`}
            onClick={() => {
              setFieldErrors({});
              setForm({
                id: r.id,
                year: r.year,
                month: r.month,
                targetPcs: r.targetPcs,
                targetAmount: r.targetAmount,
                commissionPct: r.commissionPct,
                upTargetPct: r.upTargetPct,
              });
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" aria-label={`Hapus target ${periodLabel(r.year, r.month)}`}>
                Hapus
              </Button>
            }
            description={`Target ${periodLabel(r.year, r.month)} akan dihapus permanen.`}
            onConfirm={async () => {
              const res = await deleteTarget(r.id);
              toast[res.success ? "success" : "error"](res.message ?? "");
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <DataTable
        title="Target Penjualan Bulanan"
        description={`${rows.length} periode — urut tahun & bulan (A→Z). Aktual = order non-batal seluruh channel.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari periode (mis. Maret 2026)…", value: q, onChange: setQ }}
        filters={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === t.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
        actions={
          <Button
            onClick={() => {
              setFieldErrors({});
              setForm({ ...emptyForm, year: currentYear });
            }}
          >
            <Plus className="size-4" /> Tambah Target
          </Button>
        }
        footer={
          <p className="text-xs text-slate-500">
            Total ditampilkan — target <b className="text-slate-700">{formatCurrency(totals.target)}</b> · aktual{" "}
            <b className="text-teal-700">{formatCurrency(totals.actual)}</b>
          </p>
        }
        emptyTitle="Belum ada target"
        emptyDescription="Tetapkan target pcs, omzet, dan komisi untuk periode berjalan."
      />

      {/* ================= FORM TARGET ================= */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Target" : "Tambah Target"}
        description="Satu target per periode (bulan unik). Komisi berlaku bila capaian ≤ 100%; up-target bila lewat."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Target"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tahun" required error={fieldErrors.year?.[0]}>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) || 0 })}
                />
              </FormField>
              <FormField label="Bulan" required error={fieldErrors.month?.[0]}>
                <Select
                  value={String(form.month)}
                  onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                  options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Target Pcs" required error={fieldErrors.targetPcs?.[0]} hint="Jumlah pcs terjual">
                <Input
                  type="number"
                  min={0}
                  value={form.targetPcs}
                  onChange={(e) => setForm({ ...form, targetPcs: Math.max(Number(e.target.value) || 0, 0) })}
                  className="text-right tabular-nums"
                />
              </FormField>
              <FormField label="Target Omzet" required error={fieldErrors.targetAmount?.[0]} hint="Rupiah per bulan">
                <CurrencyInput
                  value={form.targetAmount}
                  onChange={(targetAmount) => setForm({ ...form, targetAmount })}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Komisi (%)" required error={fieldErrors.commissionPct?.[0]} hint="0–100">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.commissionPct}
                  onChange={(e) =>
                    setForm({ ...form, commissionPct: Math.min(Math.max(Number(e.target.value) || 0, 0), 100) })
                  }
                  className="text-right tabular-nums"
                />
              </FormField>
              <FormField label="Up-Target (%)" required error={fieldErrors.upTargetPct?.[0]} hint="Komisi bila capaian lewat target">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.upTargetPct}
                  onChange={(e) =>
                    setForm({ ...form, upTargetPct: Math.min(Math.max(Number(e.target.value) || 0, 0), 100) })
                  }
                  className="text-right tabular-nums"
                />
              </FormField>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
