"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export interface AuditRow {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  user: { username: string } | null;
}

const ACTION_TONE: Record<string, "success" | "danger" | "primary" | "neutral" | "warning"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGOUT: "neutral",
};

export function AuditView({ logs, modules }: { logs: AuditRow[]; modules: string[] }) {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("ALL");
  const [act, setAct] = useState("ALL");
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const filtered = useMemo(
    () =>
      logs.filter(
        (l) =>
          (mod === "ALL" || l.module === mod) &&
          (act === "ALL" || l.action === act) &&
          (q === "" ||
            l.recordId?.toLowerCase().includes(q.toLowerCase()) ||
            l.user?.username.toLowerCase().includes(q.toLowerCase()) ||
            l.module.toLowerCase().includes(q.toLowerCase())),
      ),
    [logs, q, mod, act],
  );

  const columns: DataTableColumn<AuditRow>[] = [
    { key: "createdAt", header: "Waktu", render: (l) => (
      <span className="whitespace-nowrap text-xs text-slate-600">
        {new Date(l.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
      </span>
    ) },
    { key: "user", header: "User", render: (l) => (
      <span className="text-sm font-medium text-slate-900">{l.user?.username ?? "—"}</span>
    ) },
    { key: "module", header: "Modul", render: (l) => (
      <span className="text-sm capitalize text-slate-600">{l.module}</span>
    ) },
    { key: "action", header: "Aksi", render: (l) => (
      <StatusBadge tone={ACTION_TONE[l.action] ?? "neutral"}>{l.action}</StatusBadge>
    ) },
    { key: "recordId", header: "Record", render: (l) => (
      <span className="font-mono text-xs text-slate-500">{l.recordId ? `${l.recordId.slice(0, 10)}…` : "—"}</span>
    ) },
    {
      key: "detail",
      header: "",
      className: "text-right",
      render: (l) => (
        <Button size="sm" variant="ghost" onClick={() => setDetail(l)}>
          <Eye className="size-3.5" /> Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={mod}
          onChange={(e) => setMod(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="ALL">Semua modul</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={act}
          onChange={(e) => setAct(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="ALL">Semua aksi</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
        </select>
        <Input
          placeholder="Cari user / record..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} dari {logs.length} entri terakhir
        </span>
      </div>

      <DataTable
        title="Riwayat Aktivitas"
        columns={columns}
        rows={filtered}
        keyOf={(l) => l.id}
        emptyTitle="Belum ada aktivitas"
        emptyDescription="Setiap perubahan data akan tercatat di sini."
      />

      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Detail Audit Log" className="max-w-2xl">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500">Waktu</div>
                <div>{new Date(detail.createdAt).toLocaleString("id-ID")}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">User</div>
                <div>{detail.user?.username ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Modul / Aksi</div>
                <div className="capitalize">{detail.module} — {detail.action}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Record ID</div>
                <div className="break-all font-mono text-xs">{detail.recordId ?? "—"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">SEBELUM</div>
                <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700">
                  {detail.before ? JSON.stringify(detail.before, null, 2) : "—"}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">SESUDAH</div>
                <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700">
                  {detail.after ? JSON.stringify(detail.after, null, 2) : "—"}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
