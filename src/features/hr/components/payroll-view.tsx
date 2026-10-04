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
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { savePayroll, deletePayroll } from "@/features/hr/actions";
import { MONTHS, handle, periodLabel } from "@/features/hr/shared";
import { CurrencyInput, FormField, SegmentedChips } from "@/features/master/components/field";

export interface PayrollRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  year: number;
  month: number;
  basePay: number;
  transport: number;
  overtime: number;
  bonus: number;
  deduction: number;
  total: number;
  status: string;
  paidAt: string | null;
  note: string | null;
}

export interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  position: string;
  isActive: boolean;
}

type Tab = "all" | "DRAFT" | "PAID";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "DRAFT", label: "Draft" },
  { key: "PAID", label: "Lunas" },
];

const NOW = new Date();

const emptyForm = {
  employeeId: "",
  year: NOW.getFullYear(),
  month: NOW.getMonth() + 1,
  basePay: 0,
  transport: 0,
  overtime: 0,
  bonus: 0,
  deduction: 0,
  status: "DRAFT" as "DRAFT" | "PAID",
  note: "",
};

export function PayrollView({ rows, employees }: { rows: PayrollRow[]; employees: EmployeeOption[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => tab === "all" || r.status === tab)
      .filter(
        (r) =>
          !needle ||
          r.employeeName.toLowerCase().includes(needle) ||
          r.employeeCode.toLowerCase().includes(needle),
      )
      .sort(
        (a, b) =>
          a.year - b.year ||
          a.month - b.month ||
          a.employeeName.localeCompare(b.employeeName, "id"),
      );
  }, [rows, tab, q]);

  const grandTotal = useMemo(() => filtered.reduce((sum, r) => sum + r.total, 0), [filtered]);

  function openCreate() {
    if (employees.length === 0) {
      toast.error("Belum ada karyawan. Tambahkan dulu di Master → Karyawan.");
      return;
    }
    setFieldErrors({});
    setForm({ ...emptyForm, employeeId: employees[0].id });
  }

  function submit() {
    if (!form) return;
    startTransition(async () => {
      if (handle(await savePayroll(form), setFieldErrors)) setForm(null);
    });
  }

  const formTotal = form
    ? form.basePay + form.transport + form.overtime + form.bonus - form.deduction
    : 0;

  const columns: DataTableColumn<PayrollRow>[] = [
    {
      key: "period",
      header: "Periode",
      render: (r) => <span className="font-medium whitespace-nowrap text-slate-800">{periodLabel(r.year, r.month)}</span>,
    },
    {
      key: "employee",
      header: "Karyawan",
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.employeeName}</p>
          <p className="font-mono text-[11px] text-slate-400">{r.employeeCode}</p>
        </div>
      ),
    },
    { key: "basePay", header: "Pokok", className: "text-right tabular-nums", render: (r) => formatCurrency(r.basePay) },
    { key: "transport", header: "Transport", className: "text-right tabular-nums", render: (r) => formatCurrency(r.transport) },
    { key: "overtime", header: "Lembur", className: "text-right tabular-nums", render: (r) => formatCurrency(r.overtime) },
    { key: "bonus", header: "Bonus", className: "text-right tabular-nums", render: (r) => formatCurrency(r.bonus) },
    {
      key: "deduction",
      header: "Potongan",
      className: "text-right tabular-nums",
      render: (r) => (r.deduction > 0 ? <span className="text-red-500">−{formatCurrency(r.deduction)}</span> : <span className="text-slate-400">—</span>),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right tabular-nums",
      render: (r) => <span className="font-semibold text-slate-900">{formatCurrency(r.total)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="space-y-0.5">
          <StatusBadge tone={r.status === "PAID" ? "success" : "warning"}>
            {r.status === "PAID" ? "Lunas" : "Draft"}
          </StatusBadge>
          {r.paidAt ? <p className="text-[11px] whitespace-nowrap text-slate-400">{formatDateTime(r.paidAt)}</p> : null}
        </div>
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
            aria-label={`Edit slip ${r.employeeName}`}
            onClick={() => {
              setFieldErrors({});
              setForm({
                id: r.id,
                employeeId: r.employeeId,
                year: r.year,
                month: r.month,
                basePay: r.basePay,
                transport: r.transport,
                overtime: r.overtime,
                bonus: r.bonus,
                deduction: r.deduction,
                status: r.status === "PAID" ? "PAID" : "DRAFT",
                note: r.note ?? "",
              });
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" aria-label={`Hapus slip ${r.employeeName}`}>
                Hapus
              </Button>
            }
            description={`Slip gaji ${r.employeeName} — ${periodLabel(r.year, r.month)} akan dihapus. Slip berstatus LUNAS tidak bisa dihapus.`}
            onConfirm={async () => {
              const res = await deletePayroll(r.id);
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
        title="Slip Gaji Bulanan"
        description={`${rows.length} slip — urut tahun, bulan, nama (A→Z). Total dihitung ulang di server.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari nama / kode karyawan…", value: q, onChange: setQ }}
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
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Tambah Slip
          </Button>
        }
        footer={
          <p className="text-xs text-slate-500">
            {filtered.length} slip ditampilkan — total{" "}
            <b className="text-slate-900">{formatCurrency(grandTotal)}</b>
          </p>
        }
        emptyTitle="Belum ada slip gaji"
        emptyDescription="Buat slip gaji bulanan untuk karyawan aktif."
      />

      {/* ================= FORM PAYROLL ================= */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Slip Gaji" : "Tambah Slip Gaji"}
        description="Pokok + transport + lembur + bonus − potongan. Status LUNAS mencatat waktu pembayaran."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Slip"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Karyawan" required error={fieldErrors.employeeId?.[0]} className="sm:col-span-3">
                <Select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  placeholder="Pilih karyawan"
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.name} — ${e.code}${e.isActive ? "" : " (nonaktif)"}`,
                  }))}
                />
              </FormField>
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
              <FormField label="Status" required error={fieldErrors.status?.[0]}>
                <SegmentedChips
                  value={form.status}
                  onChange={(status) => setForm({ ...form, status })}
                  options={[
                    { value: "DRAFT", label: "Draft", description: "Belum dibayar" },
                    { value: "PAID", label: "Lunas", description: "Sudah dibayar" },
                  ]}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Gaji Pokok" required error={fieldErrors.basePay?.[0]}>
                <CurrencyInput value={form.basePay} onChange={(basePay) => setForm({ ...form, basePay })} />
              </FormField>
              <FormField label="Tunjangan Transport" error={fieldErrors.transport?.[0]}>
                <CurrencyInput value={form.transport} onChange={(transport) => setForm({ ...form, transport })} />
              </FormField>
              <FormField label="Lembur" error={fieldErrors.overtime?.[0]}>
                <CurrencyInput value={form.overtime} onChange={(overtime) => setForm({ ...form, overtime })} />
              </FormField>
              <FormField label="Bonus" error={fieldErrors.bonus?.[0]}>
                <CurrencyInput value={form.bonus} onChange={(bonus) => setForm({ ...form, bonus })} />
              </FormField>
              <FormField label="Potongan" error={fieldErrors.deduction?.[0]} hint="Ijin / alfa / lainnya">
                <CurrencyInput value={form.deduction} onChange={(deduction) => setForm({ ...form, deduction })} />
              </FormField>
              <FormField label="Total Bersih" hint="Dihitung otomatis — diverifikasi di server">
                <div
                  className={cn(
                    "flex h-10 items-center justify-end rounded-lg border px-3 text-sm font-semibold tabular-nums",
                    formTotal >= 0 ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-600",
                  )}
                >
                  {formatCurrency(formTotal)}
                </div>
              </FormField>
            </div>

            <FormField label="Catatan" error={fieldErrors.note?.[0]}>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Mis. bonus live 2 Januari"
                maxLength={255}
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
