"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, ClipboardCheck, ExternalLink, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { cancelOrder, setShippingNumber } from "@/features/order/actions";
import { generatePicking } from "@/features/picking/actions";
import {
  CHANNEL_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  STATUS_FLOW,
} from "@/features/order/components/status";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { FormField } from "@/features/master/components/field";

export interface OrderDetailData {
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
  items: {
    id: string;
    productName: string;
    variant: string;
    orderedQty: number;
    unitPrice: number;
    subtotal: number;
    actualQty: number | null;
    shippedQty: number | null;
    returnedQty: number;
  }[];
  picking: { id: string; pickedAt: string | null } | null;
  shipment: { shippingNumber: string; shippedAt: string; operator: string | null } | null;
  returnCount: number;
  createdAt: string;
}

export function OrderDetail({
  data,
  canManage,
  canPick,
}: {
  data: OrderDetailData;
  canManage: boolean;
  canPick: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resiOpen, setResiOpen] = useState(false);
  const [resiValue, setResiValue] = useState(data.shippingNumber ?? "");

  const flowIndex = STATUS_FLOW.indexOf(data.status);
  const branched = data.status === "CANCELLED" || data.status === "RETURNED";

  async function doCancel() {
    startTransition(async () => {
      const res = await cancelOrder(data.id);
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) router.refresh();
    });
  }

  async function doPick() {
    startTransition(async () => {
      const res = await generatePicking(data.id);
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) router.push(`/picking/${data.id}`);
    });
  }

  async function doResi() {
    startTransition(async () => {
      const res = await setShippingNumber(data.id, resiValue);
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) setResiOpen(false);
    });
  }

  const preShip = !data.shipment && data.status !== "CANCELLED";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => router.push("/order")}>
            <ArrowLeft className="size-4" /> Semua Order
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">{data.orderNumber}</h1>
            <StatusBadge tone={ORDER_STATUS_TONE[data.status] ?? "neutral"}>
              {ORDER_STATUS_LABEL[data.status] ?? data.status}
            </StatusBadge>
            <Badge variant="neutral">{CHANNEL_LABEL[data.channel] ?? data.channel}</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {data.date.slice(0, 10)}
            {data.customerName ? ` · ${data.customerName}` : ""}
            {data.customerPhone ? ` · ${data.customerPhone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && preShip ? (
            <Button variant="outline" onClick={() => setResiOpen(true)} disabled={pending}>
              <Truck className="size-4" /> {data.shippingNumber ? "Ganti Resi" : "Set Resi"}
            </Button>
          ) : null}
          {canPick && data.status === "PENDING" ? (
            <Button onClick={doPick} disabled={pending}>
              <ClipboardCheck className="size-4" /> Buat Picking
            </Button>
          ) : null}
          {data.picking && data.status !== "SHIPPED" && data.status !== "COMPLETED" ? (
            <Button onClick={() => router.push(`/picking/${data.id}`)} disabled={pending}>
              <ExternalLink className="size-4" /> Buka Picking
            </Button>
          ) : null}
          {canManage && preShip && data.status !== "CANCELLED" ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-red-600 hover:text-red-700" disabled={pending}>
                  <Ban className="size-4" /> Batalkan Order
                </Button>
              }
              description={`Order "${data.orderNumber}" akan dibatalkan. Picking (bila ada) tetap tersimpan.`}
              onConfirm={doCancel}
            />
          ) : null}
        </div>
      </div>

      {/* Stepper status */}
      <Card className="rounded-xl py-0">
        <CardContent className="p-5">
          {branched ? (
            <div className="text-sm font-medium text-red-600">
              Order {ORDER_STATUS_LABEL[data.status]?.toLowerCase()} — alur normal berhenti.
            </div>
          ) : (
            <ol className="flex flex-wrap items-center gap-y-2">
              {STATUS_FLOW.map((s, i) => {
                const done = i < flowIndex;
                const active = i === flowIndex;
                return (
                  <li key={s} className="flex items-center">
                    <span
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                        active && "bg-teal-600 text-white",
                        done && "bg-teal-50 text-teal-700",
                        !done && !active && "bg-slate-100 text-slate-400",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full text-[10px]",
                          active ? "bg-white/25" : done ? "bg-teal-200" : "bg-slate-200",
                        )}
                      >
                        {i + 1}
                      </span>
                      {ORDER_STATUS_LABEL[s]}
                    </span>
                    {i < STATUS_FLOW.length - 1 ? (
                      <span className={cn("mx-1 h-px w-6", done ? "bg-teal-300" : "bg-slate-200")} aria-hidden />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Info ringkas */}
        <Card className="rounded-xl py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-2 text-sm">
            <Row label="Marketplace" value={CHANNEL_LABEL[data.channel] ?? data.channel} />
            <Row label="Tanggal" value={data.date.slice(0, 10)} />
            <Row label="Resi" value={data.shippingNumber ?? "belum ada"} mono />
            <Row label="Jumlah item" value={`${data.items.length} item · ${data.totalQty} pcs`} />
            <Row label="Total" value={formatCurrency(data.totalAmount)} strong />
            {data.note ? <Row label="Catatan" value={data.note} /> : null}
            {data.shipment ? (
              <Row label="Dikirim" value={new Date(data.shipment.shippedAt).toLocaleString("id-ID")} />
            ) : null}
            {data.returnCount > 0 ? <Row label="Retur" value={`${data.returnCount}x penerimaan`} /> : null}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="rounded-xl py-0 lg:col-span-2">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Item Order</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2 pr-3">Produk</th>
                    <th className="py-2 pr-3">Varian</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Harga</th>
                    <th className="py-2 pr-3 text-right">Subtotal</th>
                    <th className="py-2 text-right">Actual / Kirim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2.5 pr-3 text-slate-800">{i.productName}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{i.variant}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{i.orderedQty}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-600">{formatCurrency(i.unitPrice)}</td>
                      <td className="py-2.5 pr-3 text-right font-medium text-slate-900">{formatCurrency(i.subtotal)}</td>
                      <td className="py-2.5 text-right text-slate-600">
                        {i.actualQty !== null ? `${i.actualQty} / ${i.shippedQty ?? "—"}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">
                      Total
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-teal-700">{formatCurrency(data.totalAmount)}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-800">{data.totalQty} pcs</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal resi */}
      <Modal
        open={resiOpen}
        onClose={() => setResiOpen(false)}
        title="Set Resi / No. Pengiriman"
        description={`Order ${data.orderNumber} — resi dari marketplace.`}
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setResiOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={doResi} disabled={pending || resiValue.trim().length < 3}>
              {pending ? "Menyimpan…" : "Simpan Resi"}
            </Button>
          </>
        }
      >
        <FormField label="Nomor Resi" required>
          <Input value={resiValue} onChange={(e) => setResiValue(e.target.value)} placeholder="mis. SPX1234567890" maxLength={60} />
        </FormField>
      </Modal>
    </div>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn("text-right text-slate-800", mono && "font-mono text-xs", strong && "font-semibold text-teal-700")}>
        {value}
      </span>
    </div>
  );
}
