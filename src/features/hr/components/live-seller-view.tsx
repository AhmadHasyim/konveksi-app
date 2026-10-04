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
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { saveAttendance, deleteAttendance } from "@/features/hr/actions";
import { ATTENDANCE_LABEL, POSITION_LABEL, handle } from "@/features/hr/shared";
import { FormField, SegmentedChips } from "@/features/master/components/field";

export interface AttendanceRow {
  id: string;
  date: string; // ISO
  code: string;
  sesi1: number | null;
  sesi2: number | null;
  sesi3: number | null;
  overtimeHours: number | null;
  note: string | null;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  position: string;
}

export interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  position: string;
  isActive: boolean;
}

export interface LiveSummary {
  monthKey: string; // "YYYY-MM" bulan berjalan
  monthLabel: string;
  orderCount: number;
  liveQty: number;
  liveAmount: number;
  targetAmount: number;
  targetPcs: number;
  hadirDays: number;
  sesiTotal: number;
}

type Tab = "all" | "masuk" | "lembur" | "izin" | "alfa";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "masuk", label: "Masuk" },
  { key: "lembur", label: "Lembur" },
  { key: "izin", label: "Izin/Sakit" },
  { key: "alfa", label: "Alfa" },
];

const CODE_GROUP: Record<Tab, string[]> = {
  all: [],
  masuk: ["WORK"],
  lembur: ["OVERTIME"],
  izin: ["LEAVE", "SICK", "MENSTRUAL"],
  alfa: ["ABSENT"],
};

const CODE_TONE: Record<string, StatusTone> = {
  WORK: "success",
  OVERTIME: "info",
  LEAVE: "warning",
  SICK: "warning",
  MENSTRUAL: "neutral",
  ABSENT: "danger",
};

const emptyForm = {
  employeeId: "",
  date: "",
  code: "WORK" as "WORK" | "LEAVE" | "SICK" | "ABSENT" | "MENSTRUAL" | "OVERTIME",
  sesi1: null as number | null,
  sesi2: null as number | null,
  sesi3: null as number | null,
  overtimeHours: null as number | null,
  note: "",
};

function StatCard({ label, value, sub, bar }: { label: string; value: string; sub?: string; bar?: number }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      {bar !== undefined ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(bar, 100)}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function LiveSellerView({
  rows,
  employees,
  summary,
}: {
  rows: AttendanceRow[];
  employees: EmployeeOption[];
  summary: LiveSummary;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [pending, startTransition] = useTransition();

  const months = useMemo(
    () => [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort().reverse(),
    [rows],
  );
  const [month, setMonth] = useState(() =>
    months.includes(summary.monthKey) ? summary.monthKey : (months[0] ?? summary.monthKey),
  );

  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const codes = CODE_GROUP[tab];
    return rows
      .filter((r) => r.date.slice(0, 7) === month)
      .filter((r) => tab === "all" || codes.includes(r.code))
      .filter(
        (r) =>
          !needle ||
          r.employeeName.toLowerCase().includes(needle) ||
          r.employeeCode.toLowerCase().includes(needle),
      )
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName, "id"),
      );
  }, [rows, month, tab, q]);

  function openCreate() {
    if (employees.length === 0) {
      toast.error("Belum ada karyawan. Tambahkan dulu di Master → Karyawan.");
      return;
    }
    setFieldErrors({});
    setForm({ ...emptyForm, employeeId: employees[0].id, date: `${month}-01` });
  }

  function submit() {
    if (!form) return;
    startTransition(async () => {
      if (handle(await saveAttendance(form), setFieldErrors)) setForm(null);
    });
  }

  const columns: DataTableColumn<AttendanceRow>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (r) => <span className="font-medium whitespace-nowrap text-slate-800">{formatDate(r.date)}</span>,
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
    {
      key: "position",
      header: "Posisi",
      render: (r) => <StatusBadge tone={r.position === "HOST_LIVE" ? "primary" : "neutral"}>{POSITION_LABEL[r.position] ?? r.position}</StatusBadge>,
    },
    {
      key: "code",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={CODE_TONE[r.code] ?? "neutral"}>{ATTENDANCE_LABEL[r.code] ?? r.code}</StatusBadge>
      ),
    },
    {
      key: "sesi",
      header: "Sesi Live",
      render: (r) => {
        const parts = [r.sesi1, r.sesi2, r.sesi3];
        if (parts.every((v) => v === null)) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex gap-1">
            {parts.map((v, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                  v === null ? "bg-slate-50 text-slate-300" : "bg-teal-50 text-teal-700",
                )}
              >
                S{i + 1}: {v ?? "–"}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "overtimeHours",
      header: "Lembur",
      className: "text-right tabular-nums",
      render: (r) =>
        r.overtimeHours ? <span className="font-medium text-slate-700">{r.overtimeHours} j</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: "note",
      header: "Catatan",
      render: (r) =>
        r.note ? (
          <span className="block max-w-40 truncate text-slate-500" title={r.note}>
            {r.note}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
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
            aria-label={`Edit presensi ${r.employeeName}`}
            onClick={() => {
              setFieldErrors({});
              setForm({
                id: r.id,
                employeeId: r.employeeId,
                date: r.date.slice(0, 10),
                code: r.code as typeof emptyForm.code,
                sesi1: r.sesi1,
                sesi2: r.sesi2,
                sesi3: r.sesi3,
                overtimeHours: r.overtimeHours,
                note: r.note ?? "",
              });
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" aria-label={`Hapus presensi ${r.employeeName}`}>
                Hapus
              </Button>
            }
            description={`Presensi ${r.employeeName} pada ${formatDate(r.date)} akan dihapus.`}
            onConfirm={async () => {
              const res = await deleteAttendance(r.id);
              toast[res.success ? "success" : "error"](res.message ?? "");
            }}
          />
        </div>
      ),
    },
  ];

  const targetPct =
    summary.targetAmount > 0 ? Math.round((summary.liveAmount / summary.targetAmount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Ringkasan bulan berjalan */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Order LIVE — ${summary.monthLabel}`}
          value={String(summary.orderCount)}
          sub={`${summary.liveQty} pcs terjual`}
        />
        <StatCard
          label="Omzet LIVE"
          value={formatCurrency(summary.liveAmount)}
          sub={summary.targetAmount > 0 ? `${targetPct}% dari target` : "Belum ada target bulan ini"}
          bar={summary.targetAmount > 0 ? targetPct : undefined}
        />
        <StatCard
          label="Target bulan ini"
          value={summary.targetAmount > 0 ? formatCurrency(summary.targetAmount) : "—"}
          sub={summary.targetPcs > 0 ? `${summary.targetPcs} pcs` : "Atur di menu Target"}
        />
        <StatCard
          label="Presensi bulan ini"
          value={`${summary.hadirDays} hari`}
          sub={`${summary.sesiTotal} sesi live tercatat`}
        />
      </div>

      <DataTable
        title="Presensi Host Live & Karyawan"
        description={`${rows.length} presensi 12 bulan terakhir — urut tanggal (A→Z). Sesi 1–3 = sesi tayang live.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari nama / kode karyawan…", value: q, onChange: setQ }}
        filters={
          <div className="flex flex-wrap gap-3">
            <Select
              aria-label="Pilih bulan"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={months.map((m) => ({
                value: m,
                label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
                  new Date(`${m}-01T00:00:00Z`),
                ),
              }))}
              className="h-9 w-44"
            />
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
          </div>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Tambah Presensi
          </Button>
        }
        emptyTitle="Belum ada presensi"
        emptyDescription="Catat sesi live dan kehadiran karyawan untuk bulan ini."
      />

      {/* ================= FORM PRESENSI ================= */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Presensi" : "Tambah Presensi"}
        description="Sesi 1–3 dicatat per hari untuk host live; lembur dalam jam."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Presensi"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Karyawan" required error={fieldErrors.employeeId?.[0]}>
                <Select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  placeholder="Pilih karyawan"
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.name} — ${POSITION_LABEL[e.position] ?? e.position}${e.isActive ? "" : " (nonaktif)"}`,
                  }))}
                />
              </FormField>
              <FormField label="Tanggal" required error={fieldErrors.date?.[0]}>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FormField>
            </div>

            <FormField label="Status Kehadiran" required error={fieldErrors.code?.[0]}>
              <SegmentedChips
                value={form.code}
                onChange={(code) => setForm({ ...form, code })}
                options={[
                  { value: "WORK", label: "Masuk", description: "Hadir normal" },
                  { value: "OVERTIME", label: "Lembur", description: "Hadir + lembur" },
                  { value: "LEAVE", label: "Izin", description: "Izin tidak hadir" },
                  { value: "SICK", label: "Sakit", description: "Tidak hadir" },
                  { value: "MENSTRUAL", label: "MERAH", description: "Cuti bulanan" },
                  { value: "ABSENT", label: "Alfa", description: "Tanpa keterangan" },
                ]}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-4">
              {(["sesi1", "sesi2", "sesi3"] as const).map((key, i) => (
                <FormField key={key} label={`Sesi ${i + 1}`} hint="Kosongkan bila tidak ada">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    placeholder="—"
                    value={form[key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value === "" ? null : Math.min(Number(e.target.value) || 0, 24) })
                    }
                  />
                </FormField>
              ))}
              <FormField label="Lembur (jam)" error={fieldErrors.overtimeHours?.[0]} hint="0–24">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="—"
                  value={form.overtimeHours ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      overtimeHours: e.target.value === "" ? null : Math.min(Number(e.target.value) || 0, 24),
                    })
                  }
                />
              </FormField>
            </div>

            <FormField label="Catatan" error={fieldErrors.note?.[0]}>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Mis. ganti sesi 2 — server error"
                maxLength={255}
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
