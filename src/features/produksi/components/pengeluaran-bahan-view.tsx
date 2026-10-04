"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { createMaterialUsage } from "@/features/produksi/actions";
import { FormField } from "@/features/master/components/field";

export interface UsageRow {
  id: string;
  date: string;
  teamName: string;
  fabricCode: string;
  fabricName: string;
  unit: string;
  colorName: string;
  roll: number;
  qty: number;
  note: string | null;
}
export interface FabricOption {
  id: string;
  code: string;
  name: string;
  unit: string;
}
export interface StockOption {
  fabricId: string;
  colorId: string;
  colorName: string;
  qty: number;
}
export interface TeamOption {
  id: string;
  name: string;
}

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const emptyForm = {
  date: todayISO(),
  teamId: "",
  fabricId: "",
  colorId: "",
  roll: 0,
  qty: 0,
  note: "",
};

export function PengeluaranBahanView({
  usages,
  fabrics,
  stocks,
  teams,
}: {
  usages: UsageRow[];
  fabrics: FabricOption[];
  stocks: StockOption[];
  teams: TeamOption[];
}) {
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return usages
      .filter((u) => !teamFilter || u.teamName === teamFilter)
      .filter(
        (u) =>
          !needle ||
          u.fabricName.toLowerCase().includes(needle) ||
          u.fabricCode.toLowerCase().includes(needle) ||
          u.colorName.toLowerCase().includes(needle) ||
          u.teamName.toLowerCase().includes(needle) ||
          (u.note ?? "").toLowerCase().includes(needle),
      );
  }, [usages, q, teamFilter]);

  const stockOptions = useMemo(
    () => (form ? stocks.filter((s) => s.fabricId === form.fabricId) : []),
    [stocks, form],
  );
  const selectedStock = useMemo(
    () => stockOptions.find((s) => s.colorId === form?.colorId) ?? null,
    [stockOptions, form],
  );
  const selectedUnit = useMemo(
    () => fabrics.find((f) => f.id === form?.fabricId)?.unit ?? "METER",
    [fabrics, form],
  );

  function submit() {
    if (!form) return;
    startTransition(async () => {
      const res = await createMaterialUsage(form);
      if (res.success) {
        setFieldErrors({});
        setForm(null);
        toast.success(res.message ?? "Tersimpan.");
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.message);
      }
    });
  }

  const columns: DataTableColumn<UsageRow>[] = [
    { key: "date", header: "Tanggal", render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { key: "teamName", header: "Tim", render: (r) => <span className="font-medium text-slate-800">{r.teamName}</span> },
    {
      key: "fabricName",
      header: "Bahan",
      render: (r) => (
        <span>
          <span className="font-mono text-xs font-semibold text-teal-700">{r.fabricCode}</span>{" "}
          <span className="text-slate-800">{r.fabricName}</span>
        </span>
      ),
    },
    { key: "colorName", header: "Warna" },
    {
      key: "roll",
      header: "Roll",
      className: "text-right tabular-nums",
      render: (r) => r.roll || <span className="text-slate-400">—</span>,
    },
    {
      key: "qty",
      header: "Jumlah",
      className: "text-right font-medium tabular-nums text-slate-900",
      render: (r) => `${r.qty} ${r.unit}`,
    },
    {
      key: "note",
      header: "Catatan",
      render: (r) => r.note ?? <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <DataTable
        title="Pengeluaran Bahan"
        description={`${usages.length} catatan — bahan keluar gudang untuk produksi, urut tanggal (A→Z).`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{
          placeholder: "Cari bahan / warna / tim / catatan…",
          value: q,
          onChange: setQ,
        }}
        filters={
          <Select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            placeholder="Semua tim"
            options={teams.map((t) => ({ value: t.name, label: t.name }))}
            className="w-44"
            aria-label="Filter tim"
          />
        }
        actions={
          <Button
            onClick={() => {
              setFieldErrors({});
              setForm({ ...emptyForm, date: todayISO() });
            }}
          >
            <Plus className="size-4" /> Catat Pengeluaran
          </Button>
        }
        emptyTitle="Belum ada pengeluaran bahan"
        emptyDescription="Catat bahan yang keluar gudang untuk proses cutting/jahit."
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="Catat Pengeluaran Bahan"
        description="Stok kain (per warna) akan dikurangi setelah disimpan."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tanggal" required error={fieldErrors.date?.[0]}>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </FormField>
              <FormField label="Tim" required error={fieldErrors.teamId?.[0]}>
                <Select
                  value={form.teamId}
                  onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                  placeholder="Pilih tim"
                  options={teams.map((t) => ({ value: t.id, label: t.name }))}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bahan" required error={fieldErrors.fabricId?.[0]}>
                <Select
                  value={form.fabricId}
                  onChange={(e) => setForm({ ...form, fabricId: e.target.value, colorId: "" })}
                  placeholder="Pilih bahan"
                  options={fabrics.map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
                />
              </FormField>
              <FormField
                label="Warna"
                required
                error={fieldErrors.colorId?.[0]}
                hint={
                  form.fabricId
                    ? stockOptions.length === 0
                      ? "Belum ada stok bahan ini — tambah dulu di Persediaan."
                      : `Tersedia ${stockOptions.length} warna stok.`
                    : "Pilih bahan dulu."
                }
              >
                <Select
                  value={form.colorId}
                  onChange={(e) => setForm({ ...form, colorId: e.target.value })}
                  placeholder={stockOptions.length === 0 ? "Tidak ada stok" : "Pilih warna"}
                  disabled={stockOptions.length === 0}
                  options={stockOptions.map((s) => ({ value: s.colorId, label: s.colorName }))}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Roll" error={fieldErrors.roll?.[0]} hint="Jumlah roll keluar (opsional).">
                <Input
                  type="number"
                  min={0}
                  value={form.roll}
                  onChange={(e) => setForm({ ...form, roll: Number(e.target.value) || 0 })}
                />
              </FormField>
              <FormField
                label={`Jumlah (${selectedUnit})`}
                required
                error={fieldErrors.qty?.[0]}
                hint={
                  selectedStock
                    ? `Stok tersisa: ${selectedStock.qty} ${selectedUnit}`
                    : "Pilih bahan & warna untuk melihat stok."
                }
              >
                <Input
                  type="number"
                  min={1}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) || 0 })}
                />
              </FormField>
            </div>

            <FormField label="Catatan" error={fieldErrors.note?.[0]}>
              <Input
                value={form.note}
                maxLength={255}
                placeholder="Opsional — mis. untuk order tertentu"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </FormField>

            <p className={cn("rounded-lg bg-slate-50 p-3 text-xs text-slate-500")}>
              Pengeluaran dicatat sebagai MaterialUsage dan langsung mengurangi stok kain.
              Jika stok kurang, simpanan ditolak.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
