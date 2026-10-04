"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField, ChipMultiSelect, ActiveToggle } from "@/features/master/components/field";
import { toast } from "@/components/ui/toast";
import {
  createUser,
  updateUser,
  deleteUser,
} from "@/features/admin/actions";

export interface AdminUserRow {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  roles: { code: string; name: string }[];
  createdAt: string;
}
export interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface FormState {
  id?: string;
  username: string;
  email: string;
  password: string;
  roleIds: string[];
  isActive: boolean;
}

const EMPTY: FormState = { username: "", email: "", password: "", roleIds: [], isActive: true };

export function UserView({
  users,
  roleOptions,
  canCreate,
  canUpdate,
  canDelete,
}: {
  users: AdminUserRow[];
  roleOptions: RoleOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (tab === "ALL" || (tab === "ACTIVE" ? u.isActive : !u.isActive)) &&
          (q === "" ||
            u.username.toLowerCase().includes(q.toLowerCase()) ||
            (u.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
            u.roles.some((r) => r.name.toLowerCase().includes(q.toLowerCase()))),
      ),
    [users, q, tab],
  );

  const columns: DataTableColumn<AdminUserRow>[] = [
    { key: "username", header: "Username", render: (u) => (
      <div>
        <div className="font-medium text-slate-900">{u.username}</div>
        <div className="text-xs text-slate-500">{u.email ?? "—"}</div>
      </div>
    ) },
    { key: "roles", header: "Role", render: (u) => (
      <div className="flex flex-wrap gap-1">
        {u.roles.map((r) => (
          <Badge key={r.code} variant="default">{r.name}</Badge>
        ))}
        {u.roles.length === 0 && <span className="text-xs text-slate-400">—</span>}
      </div>
    ) },
    { key: "isActive", header: "Status", render: (u) => (
      <StatusBadge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Aktif" : "Nonaktif"}</StatusBadge>
    ) },
    { key: "createdAt", header: "Dibuat", render: (u) => (
      <span className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString("id-ID")}</span>
    ) },
    ...(canUpdate || canDelete
      ? [{
          key: "actions" as const,
          header: "Aksi",
          className: "text-right",
          render: (u: AdminUserRow) => (
            <div className="flex justify-end gap-1.5">
              {canUpdate && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setErrors({});
                  setForm({
                    id: u.id,
                    username: u.username,
                    email: u.email ?? "",
                    password: "",
                    roleIds: roleOptions.filter((r) => u.roles.some((ur) => ur.code === r.code)).map((r) => r.id),
                    isActive: u.isActive,
                  });
                }}>
                  <Pencil className="size-3.5" /> Ubah
                </Button>
              )}
              {canDelete && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700">
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title={`Hapus user ${u.username}?`}
                  description="User yang punya jejak audit tidak bisa dihapus — nonaktifkan saja."
                  onConfirm={async () => {
                    const res = await deleteUser(u.id);
                    if (res.success) toast.success(res.message ?? "Berhasil");
                    else toast.error(res.message);
                  }}
                />
              )}
            </div>
          ),
        }]
      : []),
  ];

  function submit() {
    if (!form) return;
    start(async () => {
      const res = form.id
        ? await updateUser({ ...form, id: form.id })
        : await createUser(form);
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

  const tabs = [
    { key: "ALL", label: `Semua (${users.length})` },
    { key: "ACTIVE", label: `Aktif (${users.filter((u) => u.isActive).length})` },
    { key: "INACTIVE", label: `Nonaktif (${users.filter((u) => !u.isActive).length})` },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Cari username / email / role..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        {canCreate && (
          <Button className="ml-auto" onClick={() => { setErrors({}); setForm({ ...EMPTY }); }}>
            <Plus className="size-4" /> Tambah User
          </Button>
        )}
      </div>

      <DataTable
        title="Daftar User"
        columns={columns}
        rows={filtered}
        keyOf={(u) => u.id}
        emptyTitle="Belum ada user"
        emptyDescription="Klik Tambah User untuk membuat akun baru."
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Ubah User" : "Tambah User"}
        description={form?.id ? "Kosongkan password jika tidak ingin mengganti." : "Buat akun login baru dengan role."}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Menyimpan..." : form?.id ? "Simpan Perubahan" : "Buat User"}
            </Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Username" required error={errors.username?.[0]}>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="mis. siti"
                />
              </FormField>
              <FormField label="Email" error={errors.email?.[0]}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="opsional"
                />
              </FormField>
            </div>
            <FormField
              label={form.id ? "Password Baru" : "Password"}
              required={!form.id}
              error={errors.password?.[0]}
              hint={form.id ? "Biarkan kosong jika tidak diganti." : "Minimal 8 karakter."}
            >
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={form.id ? "••••••••" : ""}
              />
            </FormField>
            <FormField label="Role" required error={errors.roleIds?.[0]}>
              <ChipMultiSelect
                value={form.roleIds}
                onChange={(roleIds) => setForm({ ...form, roleIds })}
                options={roleOptions.map((r) => ({ value: r.id, label: r.name }))}
              />
            </FormField>
            <FormField label="Status Aktif">
              <ActiveToggle value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
