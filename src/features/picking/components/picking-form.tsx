"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageCheck, Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/features/master/components/field";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { saveActualQty, confirmShipment, generatePicking } from "@/features/picking/actions";
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/features/order/components/status";

export interface PickingFormData {
  orderId: string;
  orderNumber: string;
  channel: string;
  date: string;
  status: string;
  existingShippingNumber: string | null;
  pickingId: string | null;
  pickedAt: string | null;
  items: {
    orderItemId: string;
    productName: string;
    variant: string;
    orderedQty: number;
    unitPrice: number;
    actualQty: number;
    note: string;
    stockQty: number | null;
  }[];
}

export function PickingForm({ data, canManage }: { data: PickingFormData; canManage: boolean }) {
  const router = useRouter();
  const [entries, setEntries] = useState(
    data.items.map((i) => ({ orderItemId: i.orderItemId, actualQty: i.actualQty, note: i.note })),
  );
  const [resi, setResi] = useState(data.existingShippingNumber ?? "");
  const [pending, startTransition] = useTransition();

  const byItem = new Map(entries.map((e) => [e.orderItemId, e]));
  const totalOrdered = data.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalActual = entries.reduce((s, e) => s + e.actualQty, 0);

  function patch(orderItemId: string, patch: Partial<(typeof entries)[number]>) {
    setEntries((prev) => prev.map((e) => (e.orderItemId === orderItemId ? { ...e, ...patch } : e)));
  }

  async function handleCreatePicking() {
    startTransition(async () => {
      const res = await generatePicking(data.orderId);
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) router.refresh();
    });
  }

  async function handleSave() {
    startTransition(async () => {
      const res = await saveActualQty({ pickingId: data.pickingId!, entries });
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) router.refresh();
    });
  }

  async function handleShip() {
    startTransition(async () => {
      const res = await confirmShipment({ pickingId: data.pickingId!, shippingNumber: resi });
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) {
        router.push(`/order/${data.orderId}`);
      }
    });
  }

  const savedOnce = data.pickedAt !== null;
  const canShip = data.status === "PICKED";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => router.push("/picking")}>
            <ArrowLeft className="size-4" /> Antrean Picking
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">{data.orderNumber}</h1>
            <StatusBadge tone={ORDER_STATUS_TONE[data.status] ?? "neutral"}>
              {ORDER_STATUS_LABEL[data.status] ?? data.status}
            </StatusBadge>
            <Badge variant="neutral">{CHANNEL_LABEL[data.channel] ?? data.channel}</Badge>
            {savedOnce ? (
              <span className="text-xs text-slate-400">
                actual disimpan {new Date(data.pickedAt!).toLocaleString("id-ID")}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">
            Isi qty riil yang diambil (≤ qty pesanan). Konfirmasi pengiriman = stok barang jadi berkurang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!data.pickingId && canManage ? (
            <Button onClick={handleCreatePicking} disabled={pending}>
              <PackageCheck className="size-4" /> Buat Picking
            </Button>
          ) : null}
          {data.pickingId && canManage ? (
            <Button onClick={handleSave} disabled={pending || data.status === "SHIPPED"}>
              <Save className="size-4" /> {pending ? "Menyimpan…" : "Simpan Actual Qty"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabel actual qty */}
      <Card className="rounded-xl py-0">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">Actual Qty per Item</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {!data.pickingId ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Picking belum dibuat — klik “Buat Picking” untuk mulai mengisi actual qty.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2 pr-3">Produk</th>
                    <th className="py-2 pr-3">Varian</th>
                    <th className="py-2 pr-3 text-right">Dipesan</th>
                    <th className="py-2 pr-3 text-right">Stok</th>
                    <th className="py-2 pr-3 text-right">Actual Qty</th>
                    <th className="py-2 pr-3 text-right">Selisih</th>
                    <th className="py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((i) => {
                    const e = byItem.get(i.orderItemId)!;
                    const diff = e.actualQty - i.orderedQty;
                    const shortStock = i.stockQty !== null && e.actualQty > i.stockQty;
                    return (
                      <tr key={i.orderItemId}>
                        <td className="py-2.5 pr-3 text-slate-800">{i.productName}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{i.variant}</td>
                        <td className="py-2.5 pr-3 text-right text-slate-700">{i.orderedQty}</td>
                        <td className={cn("py-2.5 pr-3 text-right", shortStock ? "font-semibold text-red-600" : "text-slate-500")}>
                          {i.stockQty === null ? "—" : i.stockQty}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={i.orderedQty}
                            className="h-8 w-20 text-right"
                            value={e.actualQty}
                            disabled={!canManage || data.status === "SHIPPED"}
                            onChange={(ev) =>
                              patch(i.orderItemId, { actualQty: Math.max(0, Number(ev.target.value) || 0) })
                            }
                          />
                        </td>
                        <td
                          className={cn(
                            "py-2.5 pr-3 text-right font-medium",
                            diff === 0 ? "text-slate-400" : diff < 0 ? "text-amber-600" : "text-red-600",
                          )}
                        >
                          {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${diff}`}
                        </td>
                        <td className="py-2.5">
                          <Input
                            className="h-8 text-xs"
                            placeholder={diff !== 0 ? "wajib: alasan selisih" : "opsional"}
                            value={e.note}
                            disabled={!canManage || data.status === "SHIPPED"}
                            maxLength={200}
                            onChange={(ev) => patch(i.orderItemId, { note: ev.target.value })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">
                      Total
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-teal-700">{totalActual}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-slate-800">
                      {totalActual - totalOrdered === 0 ? "—" : `${totalActual - totalOrdered > 0 ? "+" : ""}${totalActual - totalOrdered}`}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Konfirmasi kirim */}
      {data.pickingId ? (
        <Card className="rounded-xl py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Konfirmasi Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nomor Resi / Resi" required>
                <Input
                  value={resi}
                  onChange={(e) => setResi(e.target.value)}
                  placeholder="mis. SPX1234567890"
                  maxLength={60}
                  disabled={!canManage}
                />
              </FormField>
              <div className="flex items-end gap-2">
                <ConfirmDialog
                  trigger={
                    <Button disabled={!canManage || !canShip || resi.trim().length < 3 || pending}>
                      <Truck className="size-4" />
                      {pending ? "Memproses…" : "Konfirmasi Pengiriman"}
                    </Button>
                  }
                  description={`Stok akan berkurang ${totalActual} pcs sesuai actual qty, order jadi Terkirim, resi ${resi}. Tidak bisa dibatalkan otomatis.`}
                  onConfirm={handleShip}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Transaksi atomik: validasi stok → catat shipment → kurangi stok → tulis mutasi (SALE_SHIPMENT) → status SHIPPED.
              Bila stok kurang, seluruh proses dibatalkan.
            </p>
            {data.status === "PICKING" ? (
              <p className="text-xs font-medium text-amber-600">
                Simpan actual qty dulu sebelum konfirmasi pengiriman.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
