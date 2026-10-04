"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, Pencil, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FormField } from "@/features/master/components/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createRole, updateRole, deleteRole } from "@/features/admin/actions";

export interface PermissionItem {
  code: string;
  name: string;
  description: string | null;
  module: string;
}
export interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissionCodes: string[];
  userCount: number;
}

interface FormState {
  id?: string;
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
}

const EMPTY: FormState = { code: "", name: "", description: "", permissionCodes: [] };

const MODULE_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  users: "User",
  roles: "Role",
  products: "Produk",
  inventory: "Persediaan",
  sales: "Penjualan",
  production: "Produksi",
  payroll: "Payroll",
  reports: "Laporan",
  audit: "Audit",
  financial: "Finansial (Owner)",
};

export function RoleView({
  roles,
  permissions,
  canManage,
}: {
  roles: RoleRow[];
  permissions: PermissionItem[];
  canManage: boolean;
}) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const filtered = useMemo(
    () =>
      roles.filter(
        (r) =>
          q === "" ||
          r.code.toLowerCase().includes(q.toLowerCase()) ||
          r.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [roles, q],
  );

  const modules = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return [...map.entries()];
  }, [permissions]);

  function isModuleChecked(list: PermissionItem[], codes: string[]) {
    return list.every((p) => codes.includes(p.code));
  }
  function toggleModule(list: PermissionItem[], on: boolean) {
    if (!form) return;
    const set = new Set(form.permissionCodes);
    for (const p of list) on ? set.add(p.code) : set.delete(p.code);
    setForm({ ...form, permissionCodes: [...set] });
  }
  function togglePerm(code: string) {
    if (!form) return;
    const set = new Set(form.permissionCodes);
    set.has(code) ? set.delete(code) : set.add(code);
    setForm({ ...form, permissionCodes: [...set] });
  }

  const columns: DataTableColumn<RoleRow>[] = [
    { key: "code", header: "Kode", render: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.code}</span> },
    { key: "name", header: "Role", render: (r) => (
      <div>
        <div className="font-medium text-slate-900">{r.name}</div>
        {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
      </div>
    ) },
    { key: "permissionCodes", header: "Permission", render: (r) => (
      <span className="text-sm text-slate-600">{r.permissionCodes.length} hak akses</span>
    ) },
    { key: "userCount", header: "User", render: (r) => (
      <Badge variant={r.userCount > 0 ? "default" : "neutral"}>{r.userCount} user</Badge>
    ) },
    ...(canManage
      ? [{
          key: "actions" as const,
          header: "Aksi",
          className: "text-right",
          render: (r: RoleRow) => (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => {
                setErrors({});
                setForm({
                  id: r.id,
                  code: r.code,
                  name: r.name,
                  description: r.description ?? "",
                  permissionCodes: r.permissionCodes,
                });
              }}>
                <Pencil className="size-3.5" /> Ubah
              </Button>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title={`Hapus role ${r.code}?`}
                description="Role yang masih dipakai user atau OWNER tidak bisa dihapus."
                onConfirm={async () => {
                  const res = await deleteRole(r.id);
                  if (res.success) toast.success(res.message ?? "Berhasil");
                  else toast.error(res.message);
                }}
              />
            </div>
          ),
        }]
      : []),
  ];

  function submit() {
    if (!form) return;
    if (form.permissionCodes.length === 0) {
      setErrors({ permissionCodes: ["Pilih minimal 1 permission"] });
      return;
    }
    start(async () => {
      const res = form.id
        ? await updateRole({ ...form, id: form.id })
        : await createRole(form);
      if (res.success) {
        toast.success(res.message ?? "Berhasil");
        setForm(null);
        setErrors({});
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cari role..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        {canManage && (
          <Button className="ml-auto" onClick={() => { setErrors({}); setForm({ ...EMPTY }); }}>
            <Plus className="size-4" /> Tambah Role
          </Button>
        )}
      </div>

      <DataTable
        title="Daftar Role"
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        emptyTitle="Belum ada role"
        emptyDescription="Klik Tambah Role untuk membuat role baru."
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? `Ubah Role — ${form.code}` : "Tambah Role"}
        description="Centang permission yang dimiliki role. Grup per modul bisa dicentang sekaligus."
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {form?.permissionCodes.length ?? 0} permission dipilih
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Menyimpan..." : form?.id ? "Simpan Perubahan" : "Buat Role"}
              </Button>
            </div>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kode" required error={errors.code?.[0]} hint="Huruf besar, mis. LIVE_SALES">
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </FormField>
              <FormField label="Nama Role" required error={errors.name?.[0]}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Deskripsi" error={errors.description?.[0]}>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="opsional"
              />
            </FormField>

            <FormField label="Permission" required error={errors.permissionCodes?.[0]}>
              <div className="max-h-[46vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {modules.map(([mod, list]) => {
                  const checked = isModuleChecked(list, form.permissionCodes);
                  return (
                    <div key={mod}>
                      <button
                        type="button"
                        onClick={() => toggleModule(list, !checked)}
                        className={cn(
                          "mb-1.5 flex w-full items-center gap-2 rounded-md px-1 text-sm font-semibold text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {checked ? (
                          <CheckSquare className="size-4 text-teal-600" />
                        ) : (
                          <Square className="size-4 text-slate-400" />
                        )}
                        {MODULE_LABEL[mod] ?? mod}
                        <span className="text-xs font-normal text-slate-400">({list.length})</span>
                      </button>
                      <div className="grid grid-cols-2 gap-1.5 pl-6">
                        {list.map((p) => {
                          const on = form.permissionCodes.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              className={cn(
                                "flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                                on ? "border-teal-300 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => togglePerm(p.code)}
                                className="mt-0.5 accent-teal-600"
                              />
                              <span>
                                <span className="font-medium">{p.name}</span>
                                {p.description && (
                                  <span className="block text-[11px] text-slate-500">{p.description}</span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
