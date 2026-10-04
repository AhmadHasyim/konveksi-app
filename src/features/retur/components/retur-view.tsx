"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FormField } from "@/features/master/components/field";
import { createReturn } from "@/features/retur/actions";
import { CHANNEL_LABEL, CHANNEL_OPTIONS } from "@/features/order/components/status";

export interface ReturnRow {
  id: string;
  orderId: string;
  date: string;
  orderNumber: string;
  channel: string;
  operator: string | null;
  note: string | null;
  items: { product: string; qty: number; restock: boolean }[];
  totalQty: number;
  restockQty: number;
}
export interface EligibleOrder {
  id: string;
  orderNumber: string;
  channel: string;
  items: { orderItemId: string; product: string; shippedQty: number }[];
}

const emptyForm = { orderId: "", date: "", note: "", items: [] as { orderItemId: string; qty: number; restock: boolean }[] };

export function ReturView({
  rows,
  eligible,
  canManage,
}: {
  rows: ReturnRow[];
  eligible: EligibleOrder[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<(typeof emptyForm) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !needle || r.orderNumber.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, q]);

  function openCreate() {
    setFieldErrors({});
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
  }

  function pickOrder(orderId: string) {
    const o = eligible.find((x) => x.id === orderId);
    if (!o) {
      setForm((f) => (f ? { ...f, orderId, items: [] } : f));
      return;
    }
    setForm((f) =>
      f
        ? {
            ...f,
            orderId,
            items: o.items.map((i) => ({ orderItemId: i.orderItemId, qty: 0, restock: false })),
          }
        : f,
    );
  }

  async function submit() {
    if (!form) return;
    startTransition(async () => {
      const items = form.items.filter((i) => i.qty > 0);
      if (items.length === 0) {
        toast.error("Isi minimal 1 item dengan qty > 0.");
        return;
      }
      const res = await createReturn({ orderId: form.orderId, date: form.date, note: form.note, items });
      if (res.success) {
        toast.success(res.message ?? "Retur diterima.");
        setForm(null);
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.message ?? "Gagal.");
      }
    });
  }

  const columns: DataTableColumn<ReturnRow>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">{r.date.slice(0, 10)}</span>
          <span className="block text-xs text-slate-400">{r.operator ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "orderNumber",
      header: "Order",
      render: (r) => (
        <button
          type="button"
          className="font-medium text-teal-700 hover:underline"
          onClick={() => router.push(`/order/${r.orderId}`)}
        >
          {r.orderNumber}
        </button>
      ),
    },
    { key: "channel", header: "Marketplace", render: (r) => <Badge variant="neutral">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge> },
    {
      key: "items",
      header: "Item Retur",
      render: (r) => (
        <div className="space-y-0.5 text-xs">
          {r.items.map((i, idx) => (
            <div key={idx} className="text-slate-600">
              {i.product} · <b>{i.qty}</b>
              {i.restock ? <span className="ml-1 text-emerald-600">(restock)</span> : <span className="ml-1 text-slate-400">(tidak layak)</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "total",
      header: "Qty",
      render: (r) => (
        <span className="text-slate-600">
          {r.totalQty} pcs
          {r.restockQty > 0 ? <span className="block text-xs text-emerald-600">+{r.restockQty} ke stok</span> : null}
        </span>
      ),
    },
    { key: "note", header: "Catatan", render: (r) => <span className="text-slate-500">{r.note ?? "—"}</span> },
  ];

  const activeOrder = eligible.find((o) => o.id === form?.orderId);

  return (
    <div className="space-y-4">
      <DataTable
        title="Penerimaan Retur"
        description={`${rows.length} retur tercatat.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari no. order…", value: q, onChange: setQ }}
        actions={
          canManage ? (
            <Button onClick={openCreate} disabled={eligible.length === 0}>
              <Plus className="size-4" /> Terima Retur
            </Button>
          ) : null
        }
        emptyTitle="Belum ada retur"
        emptyDescription={
          eligible.length === 0
            ? "Belum ada order terkirim yang bisa diretur."
            : "Retur akan muncul di sini setelah penerimaan barang."
        }
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="Terima Retur"
        description="Pilih order terkirim, isi qty retur per item, tandai restock bila layak jual."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending || !form?.orderId}>
              {pending ? "Menyimpan…" : "Simpan Retur"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Order" required error={fieldErrors.orderId?.[0]}>
                <Select
                  value={form.orderId}
                  onChange={(e) => pickOrder(e.target.value)}
                  placeholder="Pilih order terkirim…"
                  options={eligible.map((o) => ({
                    value: o.id,
                    label: `${o.orderNumber} (${CHANNEL_LABEL[o.channel] ?? o.channel})`,
                  }))}
                />
              </FormField>
              <FormField label="Tanggal Terima" required>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FormField>
            </div>

            {activeOrder ? (
              <div className="space-y-2">
                {activeOrder.items.map((it) => {
                  const row = form.items.find((x) => x.orderItemId === it.orderItemId)!;
                  return (
                    <div key={it.orderItemId} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="min-w-40 flex-1 text-sm text-slate-800">{it.product}</div>
                      <span className="text-xs text-slate-400">terkirim {it.shippedQty}</span>
                      <Input
                        type="number"
                        min={0}
                        max={it.shippedQty}
                        className="h-8 w-20 text-right"
                        value={row.qty}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            items: form.items.map((x) =>
                              x.orderItemId === it.orderItemId
                                ? { ...x, qty: Math.max(0, Math.min(it.shippedQty, Number(e.target.value) || 0)) }
                                : x,
                            ),
                          })
                        }
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          className="size-4 accent-teal-600"
                          checked={row.restock}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              items: form.items.map((x) =>
                                x.orderItemId === it.orderItemId ? { ...x, restock: e.target.checked } : x,
                              ),
                            })
                          }
                        />
                        Layak jual (restock)
                      </label>
                    </div>
                  );
                })}
                <p className="text-xs text-slate-500">
                  Item dengan restock dicentang akan menambah stok barang jadi (mutasi RETURN_IN). Item tanpa restock
                  dicatat sebagai retur tanpa stok masuk.
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                Pilih order terlebih dahulu.
              </p>
            )}

            <FormField label="Catatan">
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="mis. rusak di jalan, salah kirim…"
                maxLength={500}
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
