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
import { saveFabric, deleteFabric } from "@/features/master/actions";
import { FormField, SegmentedChips } from "@/features/master/components/field";

export interface FabricRow {
  id: string;
  code: string;
  name: string;
  unit: "ROLL" | "METER" | "YARD";
}

type FormState = { id?: string; code: string; name: string; unit: "ROLL" | "METER" | "YARD" };

export function BahanView({ fabrics }: { fabrics: FabricRow[] }) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return fabrics
      .filter((f) => !n || f.name.toLowerCase().includes(n) || f.code.toLowerCase().includes(n))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [fabrics, q]);

  function submit() {
    if (!form) return;
    startTransition(async () => {
      const res = await saveFabric(form);
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

  const columns: DataTableColumn<FabricRow>[] = [
    { key: "code", header: "Kode", render: (r) => <span className="font-mono text-xs font-semibold text-teal-700">{r.code}</span> },
    { key: "name", header: "Jenis Bahan", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "unit", header: "Satuan", render: (r) => <Badge variant="neutral">{r.unit}</Badge> },
    {
      key: "actions",
      header: "",
      className: "w-40 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setFieldErrors({}); setForm({ ...r }); }}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                Hapus
              </Button>
            }
            description={`Bahan "${r.name}" akan dihapus.`}
            onConfirm={async () => {
              const res = await deleteFabric(r.id);
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
        title="Jenis Bahan Baku"
        description={`${fabrics.length} jenis kain/material — stok per warna dikelola di Persediaan.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari bahan…", value: q, onChange: setQ }}
        actions={
          <Button onClick={() => { setFieldErrors({}); setForm({ code: "", name: "", unit: "ROLL" }); }}>
            <Plus className="size-4" /> Tambah Bahan
          </Button>
        }
        emptyTitle="Belum ada bahan"
        emptyDescription="Daftarkan jenis kain: Brokat, Tille, Fukoro, Puring…"
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Bahan" : "Tambah Bahan"}
        description="Satuan menentukan cara stok dicatat (roll utk kain gulungan)."
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>Batal</Button>
            <Button onClick={submit} disabled={pending}>{pending ? "Menyimpan…" : "Simpan Bahan"}</Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kode" required error={fieldErrors.code?.[0]}>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BRO" maxLength={30} />
              </FormField>
              <FormField label="Nama Bahan" required error={fieldErrors.name?.[0]}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Brokat" maxLength={80} />
              </FormField>
            </div>
            <FormField label="Satuan" required>
              <SegmentedChips
                value={form.unit}
                onChange={(unit) => setForm({ ...form, unit })}
                options={[
                  { value: "ROLL", label: "Roll", description: "Kain gulungan" },
                  { value: "METER", label: "Meter", description: "Potongan" },
                  { value: "YARD", label: "Yard", description: "Imperial" },
                ]}
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
