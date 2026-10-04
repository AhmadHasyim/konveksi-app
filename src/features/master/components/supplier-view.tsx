"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { saveSupplier, deleteSupplier } from "@/features/master/actions";
import { FormField } from "@/features/master/components/field";

export interface SupplierRow {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

type FormState = { id?: string; code: string; name: string; phone: string; address: string };

export function SupplierView({ suppliers }: { suppliers: SupplierRow[] }) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return suppliers
      .filter((s) => !n || s.name.toLowerCase().includes(n) || s.code.toLowerCase().includes(n))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [suppliers, q]);

  function submit() {
    if (!form) return;
    startTransition(async () => {
      const res = await saveSupplier(form);
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

  const columns: DataTableColumn<SupplierRow>[] = [
    { key: "code", header: "Kode", render: (r) => <span className="font-mono text-xs font-semibold text-teal-700">{r.code}</span> },
    { key: "name", header: "Nama Supplier", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "phone", header: "Telepon", render: (r) => r.phone ?? <span className="text-slate-400">—</span> },
    {
      key: "address",
      header: "Alamat",
      render: (r) => <span className="block max-w-xs truncate text-slate-600">{r.address ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-40 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setFieldErrors({}); setForm({ id: r.id, code: r.code, name: r.name, phone: r.phone ?? "", address: r.address ?? "" }); }}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                Hapus
              </Button>
            }
            description={`Supplier "${r.name}" akan dihapus.`}
            onConfirm={async () => {
              const res = await deleteSupplier(r.id);
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
        title="Daftar Supplier"
        description={`${suppliers.length} pemasok bahan baku & jasa.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari nama / kode supplier…", value: q, onChange: setQ }}
        actions={
          <Button onClick={() => { setFieldErrors({}); setForm({ code: "", name: "", phone: "", address: "" }); }}>
            <Plus className="size-4" /> Tambah Supplier
          </Button>
        }
        emptyTitle="Belum ada supplier"
        emptyDescription="Daftarkan pemasok kain, aksesoris, atau jasa."
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Supplier" : "Tambah Supplier"}
        description="Data supplier dipakai modul pembelian bahan."
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>Batal</Button>
            <Button onClick={submit} disabled={pending}>{pending ? "Menyimpan…" : "Simpan Supplier"}</Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kode" required error={fieldErrors.code?.[0]}>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUP01" maxLength={20} />
              </FormField>
              <FormField label="Nama Supplier" required error={fieldErrors.name?.[0]}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CV. Kain Jaya" maxLength={100} />
              </FormField>
            </div>
            <FormField label="Telepon" error={fieldErrors.phone?.[0]}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812…" maxLength={30} />
            </FormField>
            <FormField label="Alamat">
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. …, Kota"
                maxLength={255}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-card px-3 py-2 text-sm text-slate-900 transition-colors outline-none hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
