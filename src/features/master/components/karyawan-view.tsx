"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency } from "@/lib/utils/format";
import { saveEmployee, deleteEmployee } from "@/features/master/actions";
import { ActiveToggle, CurrencyInput, FormField } from "@/features/master/components/field";

export interface EmployeeRow {
  id: string;
  code: string;
  name: string;
  position: string;
  baseSalary: number;
  transportAllowance: number;
  workdayBasis: number;
  isActive: boolean;
}

const POSITIONS = ["CUTTING", "SEWIST", "HOST_LIVE", "WAREHOUSE", "SALES", "ADMIN"] as const;
type Position = (typeof POSITIONS)[number];

const POSITION_LABEL: Record<Position, string> = {
  CUTTING: "Potong",
  SEWIST: "Penjahit",
  HOST_LIVE: "Host Live",
  WAREHOUSE: "Gudang",
  SALES: "Penjualan",
  ADMIN: "Admin",
};

type FormState = {
  id?: string;
  code: string;
  name: string;
  position: Position;
  baseSalary: number;
  transportAllowance: number;
  workdayBasis: number;
  isActive: boolean;
};

export function KaryawanView({ employees }: { employees: EmployeeRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return employees
      .filter((e) => (status === "active" ? e.isActive : status === "inactive" ? !e.isActive : true))
      .filter((e) => !n || e.name.toLowerCase().includes(n) || e.code.toLowerCase().includes(n))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [employees, q, status]);

  function submit() {
    if (!form) return;
    startTransition(async () => {
      const res = await saveEmployee(form);
      if (res.success) {
        setFieldErrors({});
        setForm(null);
        toast.success(res.message ?? "Tersimpan.");
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.message ?? "Gagal menyimpan.");
      }
    });
  }

  const columns: DataTableColumn<EmployeeRow>[] = [
    { key: "code", header: "Kode", render: (r) => <span className="font-mono text-xs font-semibold text-teal-700">{r.code}</span> },
    { key: "name", header: "Nama", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    {
      key: "position",
      header: "Posisi",
      render: (r) => <Badge variant={r.position === "HOST_LIVE" ? "default" : "neutral"}>{POSITION_LABEL[r.position as Position] ?? r.position}</Badge>,
    },
    { key: "baseSalary", header: "Gaji Pokok", className: "text-right tabular-nums", render: (r) => formatCurrency(r.baseSalary) },
    { key: "transportAllowance", header: "Tunjangan", className: "text-right tabular-nums", render: (r) => formatCurrency(r.transportAllowance) },
    { key: "workdayBasis", header: "Dasar Hari", className: "text-center", render: (r) => `${r.workdayBasis} hr` },
    { key: "isActive", header: "Status", render: (r) => (r.isActive ? <Badge variant="default">Aktif</Badge> : <Badge variant="neutral">Nonaktif</Badge>) },
    {
      key: "actions",
      header: "",
      className: "w-40 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setFieldErrors({}); setForm({ ...r, position: r.position as Position }); }}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                Hapus
              </Button>
            }
            description={`Karyawan "${r.name}" akan dihapus.`}
            onConfirm={async () => {
              const res = await deleteEmployee(r.id);
              toast[res.success ? "success" : "error"](res.message ?? "");
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Daftar Karyawan"
        description={`${employees.length} karyawan — dipakai produksi (penjahit/cutting) dan payroll.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari nama / kode…", value: q, onChange: setQ }}
        filters={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {([["all", "Semua"], ["active", "Aktif"], ["inactive", "Nonaktif"]] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatus(k)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (status === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")
                }
              >
                {label}
              </button>
            ))}
          </div>
        }
        actions={
          <Button
            onClick={() => {
              setFieldErrors({});
              setForm({ code: "", name: "", position: "SEWIST", baseSalary: 1_500_000, transportAllowance: 100_000, workdayBasis: 25, isActive: true });
            }}
          >
            <Plus className="size-4" /> Tambah Karyawan
          </Button>
        }
        emptyTitle="Belum ada karyawan"
        emptyDescription="Karyawan muncul di form produksi & perhitungan gaji."
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Karyawan" : "Tambah Karyawan"}
        description="Nominal gaji jadi dasar hitung payroll bulanan."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>Batal</Button>
            <Button onClick={submit} disabled={pending}>{pending ? "Menyimpan…" : "Simpan Karyawan"}</Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kode" required error={fieldErrors.code?.[0]} hint="K01, PJ01, HL01…">
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PJ01" maxLength={20} />
              </FormField>
              <FormField label="Nama Lengkap" required error={fieldErrors.name?.[0]}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ACIL" maxLength={100} />
              </FormField>
            </div>

            <FormField label="Posisi" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {POSITIONS.map((p) => {
                  const active = form.position === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, position: p })}
                      className={
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all " +
                        (active
                          ? "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-100"
                          : "border-slate-200 bg-card text-slate-600 hover:border-teal-300")
                      }
                    >
                      {POSITION_LABEL[p]}
                    </button>
                  );
                })}
              </div>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Gaji Pokok / Bulan" required error={fieldErrors.baseSalary?.[0]}>
                <CurrencyInput value={form.baseSalary} onChange={(baseSalary) => setForm({ ...form, baseSalary })} />
              </FormField>
              <FormField label="Tunjangan Transport" error={fieldErrors.transportAllowance?.[0]}>
                <CurrencyInput value={form.transportAllowance} onChange={(transportAllowance) => setForm({ ...form, transportAllowance })} />
              </FormField>
              <FormField label="Dasar Hari Kerja" hint="Jumlah hari kerja acuan hitung gaji (25).">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.workdayBasis}
                  onChange={(e) => setForm({ ...form, workdayBasis: Math.max(1, Number(e.target.value) || 1) })}
                />
              </FormField>
              <FormField label="Status">
                <ActiveToggle value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
              </FormField>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
