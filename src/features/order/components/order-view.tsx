"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2, Truck, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, SegmentedChips, CurrencyInput } from "@/features/master/components/field";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { createOrder, updateOrder, setShippingNumber, deleteOrder } from "@/features/order/actions";
import { ImportOrderModal } from "@/features/order/components/import-modal";
import {
  CHANNEL_LABEL,
  CHANNEL_OPTIONS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  STATUS_TABS,
} from "@/features/order/components/status";

export interface OrderItemRow {
  id: string;
  productId: string;
  colorId: string | null;
  sizeId: string | null;
  orderedQty: number;
  unitPrice: number;
}
export interface OrderRow {
  id: string;
  orderNumber: string;
  channel: string;
  date: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingNumber: string | null;
  status: string;
  totalQty: number;
  totalAmount: number;
  note: string | null;
  itemCount: number;
  items: OrderItemRow[];
  hasPicking: boolean;
  hasShipment: boolean;
  hasReturn: boolean;
}
export interface ProductOption {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  sizeIds: string[];
}
export interface Option {
  id: string;
  label: string;
  hex?: string | null;
}

interface FormItem {
  key: string;
  productId: string;
  colorId: string;
  sizeId: string;
  orderedQty: number;
  unitPrice: number;
}

const emptyForm = {
  channel: "SHOPEE",
  date: "",
  customerName: "",
  customerPhone: "",
  note: "",
  items: [] as FormItem[],
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OrderView({
  orders,
  products,
  colors,
  sizes,
  canManage,
}: {
  orders: OrderRow[];
  products: ProductOption[];
  colors: Option[];
  sizes: Option[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [channel, setChannel] = useState("all");
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [resiFor, setResiFor] = useState<OrderRow | null>(null);
  const [resiValue, setResiValue] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const statuses = STATUS_TABS.find((t) => t.key === tab)?.statuses ?? [];
    return orders
      .filter((o) => (statuses.length ? statuses.includes(o.status) : true))
      .filter((o) => (channel === "all" ? true : o.channel === channel))
      .filter(
        (o) =>
          !needle ||
          o.orderNumber.toLowerCase().includes(needle) ||
          (o.shippingNumber ?? "").toLowerCase().includes(needle) ||
          (o.customerName ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.orderNumber.localeCompare(a.orderNumber));
  }, [orders, q, tab, channel]);

  function handle(result: { success: boolean; message?: string; fieldErrors?: Record<string, string[]> }) {
    if (result.success) {
      setFieldErrors({});
      toast.success(result.message ?? "Tersimpan.");
      return true;
    }
    setFieldErrors(result.fieldErrors ?? {});
    toast.error(result.message ?? "Gagal menyimpan.");
    return false;
  }

  function openCreate() {
    setFieldErrors({});
    setForm({ ...emptyForm, date: today(), items: [newItem(products[0]?.id ?? "")] });
  }

  function openEdit(o: OrderRow) {
    setFieldErrors({});
    setForm({
      id: o.id,
      channel: o.channel,
      date: o.date.slice(0, 10),
      customerName: o.customerName ?? "",
      customerPhone: o.customerPhone ?? "",
      note: o.note ?? "",
      items: o.items.map((i) => ({
        key: i.id,
        productId: i.productId,
        colorId: i.colorId ?? "",
        sizeId: i.sizeId ?? "",
        orderedQty: i.orderedQty,
        unitPrice: i.unitPrice,
      })),
    });
  }

  function newItem(productId: string): FormItem {
    const p = products.find((x) => x.id === productId);
    return {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId,
      colorId: "",
      sizeId: "",
      orderedQty: 1,
      unitPrice: p?.basePrice ?? 0,
    };
  }

  function patchItem(key: string, patch: Partial<FormItem>) {
    setForm((f) =>
      f ? { ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) } : f,
    );
  }

  function onProductChange(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    setForm((f) =>
      f
        ? {
            ...f,
            items: f.items.map((i) =>
              i.key === key
                ? {
                    ...i,
                    productId,
                    unitPrice: p?.basePrice ?? i.unitPrice,
                    sizeId: p?.sizeIds.includes(i.sizeId) ? i.sizeId : "",
                  }
                : i,
            ),
          }
        : f,
    );
  }

  async function submit() {
    if (!form) return;
    startTransition(async () => {
      const payload = {
        channel: form.channel as "SHOPEE" | "TIKTOK" | "LIVE" | "DROPSHIP" | "RESELLER" | "OFFLINE",
        date: form.date,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        note: form.note,
        items: form.items.map((i) => ({
          productId: i.productId,
          colorId: i.colorId || null,
          sizeId: i.sizeId || null,
          orderedQty: i.orderedQty,
          unitPrice: i.unitPrice,
        })),
      };
      const res = form.id
        ? await updateOrder({ id: form.id, ...payload })
        : await createOrder(payload);
      if (handle(res)) setForm(null);
    });
  }

  async function submitResi() {
    if (!resiFor) return;
    startTransition(async () => {
      if (handle(await setShippingNumber(resiFor.id, resiValue))) setResiFor(null);
    });
  }

  const columns: DataTableColumn<OrderRow>[] = [
    {
      key: "orderNumber",
      header: "No. Order",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">{r.orderNumber}</span>
          <span className="block text-xs text-slate-400">{r.date.slice(0, 10)}</span>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Marketplace",
      render: (r) => <Badge variant="neutral">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge>,
    },
    {
      key: "customer",
      header: "Pelanggan",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="text-slate-700">{r.customerName ?? "—"}</span>
          {r.customerPhone ? <span className="block text-xs text-slate-400">{r.customerPhone}</span> : null}
        </div>
      ),
    },
    {
      key: "qty",
      header: "Item / Qty",
      render: (r) => (
        <span className="text-slate-600">
          {r.itemCount} item · {r.totalQty} pcs
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (r) => <span className="font-medium text-slate-900">{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: "shippingNumber",
      header: "Resi",
      render: (r) =>
        r.shippingNumber ? (
          <span className="font-mono text-xs text-slate-600">{r.shippingNumber}</span>
        ) : (
          <span className="text-slate-400">belum ada</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={ORDER_STATUS_TONE[r.status] ?? "neutral"}>{ORDER_STATUS_LABEL[r.status] ?? r.status}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" aria-label={`Lihat ${r.orderNumber}`} onClick={() => router.push(`/order/${r.id}`)}>
            <Eye className="size-3.5" />
          </Button>
          {canManage && !r.hasShipment && r.status === "PENDING" ? (
            <Button variant="ghost" size="sm" aria-label={`Edit ${r.orderNumber}`} onClick={() => openEdit(r)}>
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
          {canManage && !r.hasShipment && r.status !== "CANCELLED" ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Resi ${r.orderNumber}`}
              onClick={() => {
                setResiValue(r.shippingNumber ?? "");
                setResiFor(r);
              }}
            >
              <Truck className="size-3.5" />
            </Button>
          ) : null}
          {canManage && !r.hasShipment && !r.hasReturn && !r.hasPicking ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" aria-label={`Hapus ${r.orderNumber}`}>
                  <Trash2 className="size-3.5" />
                </Button>
              }
              description={`Order "${r.orderNumber}" akan dihapus permanen.`}
              onConfirm={async () => {
                const res = await deleteOrder(r.id);
                toast[res.success ? "success" : "error"](res.message ?? "");
              }}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const totalItems = form?.items.reduce((s, i) => s + i.orderedQty * i.unitPrice, 0) ?? 0;
  const totalQty = form?.items.reduce((s, i) => s + i.orderedQty, 0) ?? 0;

  return (
    <div className="space-y-4">
      <DataTable
        title="Daftar Order"
        description={`${orders.length} order — terbaru di atas.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari no. order / resi / pelanggan…", value: q, onChange: setQ }}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {STATUS_TABS.map((t) => (
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
            <Select
              className="h-8 w-36 text-xs"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              options={[{ value: "all", label: "Semua channel" }, ...CHANNEL_OPTIONS]}
            />
          </div>
        }
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="size-4" /> Impor CSV
              </Button>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Tambah Order
              </Button>
            </>
          ) : null
        }
        emptyTitle="Belum ada order"
        emptyDescription="Order marketplace akan muncul di sini — tambah manual atau tunggu impor."
      />

      {/* ── Modal form order ── */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit Order" : "Tambah Order"}
        description="Data dari marketplace (Shopee / TikTok). Harga per item di-snapshot saat order dibuat."
        className="max-w-3xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending || !form || form.items.length === 0}>
              {pending ? "Menyimpan…" : form?.id ? "Simpan Perubahan" : "Simpan Order"}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <FormField label="Marketplace" required>
              <SegmentedChips
                value={form.channel}
                onChange={(channel) => setForm({ ...form, channel })}
                options={CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Tanggal Order" required error={fieldErrors.date?.[0]}>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FormField>
              <FormField label="Nama Pelanggan">
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Opsional"
                  maxLength={120}
                />
              </FormField>
              <FormField label="No. HP">
                <Input
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="Opsional"
                  maxLength={30}
                />
              </FormField>
            </div>
            <FormField label="Catatan">
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Catatan order (opsional)"
                maxLength={500}
              />
            </FormField>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Item Order</span>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, newItem(products[0]?.id ?? "")] })}>
                  <Plus className="size-3.5" /> Tambah Item
                </Button>
              </div>
              {fieldErrors.items?.[0] ? <p className="text-xs text-red-500">{fieldErrors.items[0]}</p> : null}

              {form.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                  Belum ada item — klik “Tambah Item”.
                </p>
              ) : null}

              {form.items.map((it) => {
                const p = products.find((x) => x.id === it.productId);
                const sizeOpts = sizes.filter((s) => p?.sizeIds.includes(s.id));
                return (
                  <div key={it.key} className="rounded-xl border border-slate-200 p-3">
                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <FormField label="Produk" required>
                          <Select
                            value={it.productId}
                            onChange={(e) => onProductChange(it.key, e.target.value)}
                            options={products.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }))}
                          />
                        </FormField>
                      </div>
                      <div className="sm:col-span-2">
                        <FormField label="Warna">
                          <Select
                            value={it.colorId}
                            onChange={(e) => patchItem(it.key, { colorId: e.target.value })}
                            placeholder="—"
                            options={colors.map((c) => ({ value: c.id, label: c.label }))}
                          />
                        </FormField>
                      </div>
                      <div className="sm:col-span-2">
                        <FormField label="Ukuran">
                          <Select
                            value={it.sizeId}
                            onChange={(e) => patchItem(it.key, { sizeId: e.target.value })}
                            placeholder="—"
                            options={sizeOpts.map((s) => ({ value: s.id, label: s.label }))}
                          />
                        </FormField>
                      </div>
                      <div className="sm:col-span-1">
                        <FormField label="Qty" required>
                          <Input
                            type="number"
                            min={1}
                            value={it.orderedQty}
                            onChange={(e) => patchItem(it.key, { orderedQty: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </FormField>
                      </div>
                      <div className="sm:col-span-2">
                        <FormField label="Harga Satuan" required>
                          <CurrencyInput
                            value={it.unitPrice}
                            onChange={(unitPrice) => patchItem(it.key, { unitPrice })}
                          />
                        </FormField>
                      </div>
                      <div className="flex items-end justify-between gap-2 sm:col-span-1">
                        <div className="text-right text-xs leading-tight text-slate-500">
                          Subtotal
                          <span className="block font-semibold text-slate-800">
                            {formatCurrency(it.orderedQty * it.unitPrice)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          aria-label="Hapus item"
                          onClick={() => setForm({ ...form, items: form.items.filter((x) => x.key !== it.key) })}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {form.items.length > 0 ? (
                <div className="flex justify-end gap-6 rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                  <span className="text-slate-500">
                    Total qty: <b className="text-slate-800">{totalQty} pcs</b>
                  </span>
                  <span className="text-slate-500">
                    Total: <b className="text-teal-700">{formatCurrency(totalItems)}</b>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Modal resi ── */}
      <Modal
        open={resiFor !== null}
        onClose={() => setResiFor(null)}
        title="Set Resi / No. Pengiriman"
        description={resiFor ? `Order ${resiFor.orderNumber} — resi dari marketplace (Shopee / TikTok).` : ""}
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setResiFor(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitResi} disabled={pending || resiValue.trim().length < 3}>
              {pending ? "Menyimpan…" : "Simpan Resi"}
            </Button>
          </>
        }
      >
        <FormField label="Nomor Resi" required>
          <Input
            value={resiValue}
            onChange={(e) => setResiValue(e.target.value)}
            placeholder="mis. SPX1234567890"
            maxLength={60}
          />
        </FormField>
      </Modal>

      {/* ── Modal impor CSV ── */}
      <ImportOrderModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

