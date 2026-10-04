"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils/format";
import { generatePicking } from "@/features/picking/actions";
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/features/order/components/status";

export interface PickingListRow {
  id: string;
  orderNumber: string;
  channel: string;
  date: string;
  status: string;
  shippingNumber: string | null;
  itemCount: number;
  totalOrdered: number;
  hasPicking: boolean;
  pickedAt: string | null;
}

export function PickingListView({ rows, canManage }: { rows: PickingListRow[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleGenerate(orderId: string) {
    startTransition(async () => {
      const res = await generatePicking(orderId);
      toast[res.success ? "success" : "error"](res.message ?? "");
      if (res.success) router.push(`/picking/${orderId}`);
    });
  }

  const columns: DataTableColumn<PickingListRow>[] = [
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
    { key: "channel", header: "Marketplace", render: (r) => <Badge variant="neutral">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge> },
    {
      key: "items",
      header: "Item / Qty Pesan",
      render: (r) => (
        <span className="text-slate-600">
          {r.itemCount} item · {r.totalOrdered} pcs
        </span>
      ),
    },
    {
      key: "resi",
      header: "Resi",
      render: (r) => (r.shippingNumber ? <span className="font-mono text-xs">{r.shippingNumber}</span> : <span className="text-slate-400">belum ada</span>),
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
      className: "w-40 text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          {!r.hasPicking ? (
            canManage ? (
              <Button size="sm" onClick={() => handleGenerate(r.id)} disabled={pending}>
                <ClipboardList className="size-3.5" /> Buat Picking
              </Button>
            ) : (
              <span className="text-xs text-slate-400">menunggu gudang</span>
            )
          ) : (
            <Button size="sm" variant="outline" onClick={() => router.push(`/picking/${r.id}`)}>
              <ExternalLink className="size-3.5" /> {r.status === "PICKED" ? "Siap Kirim" : "Isi Actual"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      title="Antrean Picking"
      description="Order menunggu pengambilan barang — urut tanggal terlama dulu."
      columns={columns}
      rows={rows}
      keyOf={(r) => r.id}
      emptyTitle="Antrean kosong"
      emptyDescription="Tidak ada order yang menunggu picking. Order baru muncul dari menu Order & Resi."
      actions={
        <Button variant="outline" onClick={() => router.push("/order")}>
          <ClipboardCheck className="size-4" /> Ke Order & Resi
        </Button>
      }
    />
  );
}
