"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { CHANNEL_LABEL } from "@/features/order/components/status";

export interface ShipmentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  channel: string;
  customerName: string | null;
  shippingNumber: string;
  shippedAt: string;
  operator: string | null;
  totalQty: number;
  itemCount: number;
}
export interface WaitingRow {
  id: string;
  orderNumber: string;
  channel: string;
  date: string;
  totalQty: number;
}

export function PengirimanView({ rows, waiting }: { rows: ShipmentRow[]; waiting: WaitingRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(
        (r) =>
          !needle ||
          r.shippingNumber.toLowerCase().includes(needle) ||
          r.orderNumber.toLowerCase().includes(needle) ||
          (r.customerName ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
  }, [rows, q]);

  const columns: DataTableColumn<ShipmentRow>[] = [
    {
      key: "shippingNumber",
      header: "Resi",
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-mono text-sm font-semibold text-slate-900">{r.shippingNumber}</span>
          <span className="block text-xs text-slate-400">{new Date(r.shippedAt).toLocaleString("id-ID")}</span>
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
    { key: "customer", header: "Pelanggan", render: (r) => <span className="text-slate-600">{r.customerName ?? "—"}</span> },
    {
      key: "qty",
      header: "Terkirim",
      render: (r) => (
        <span className="text-slate-600">
          {r.itemCount} item · {r.totalQty} pcs
        </span>
      ),
    },
    { key: "operator", header: "Operator", render: (r) => <span className="text-slate-500">{r.operator ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => router.push(`/order/${r.orderId}`)}>
            Detail
          </Button>
        </div>
      ),
    },
  ];

  const waitingColumns: DataTableColumn<WaitingRow>[] = [
    { key: "orderNumber", header: "No. Order", render: (r) => <span className="font-semibold text-slate-900">{r.orderNumber}</span> },
    { key: "channel", header: "Marketplace", render: (r) => <Badge variant="neutral">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge> },
    { key: "date", header: "Tanggal", render: (r) => r.date.slice(0, 10) },
    { key: "totalQty", header: "Qty", render: (r) => `${r.totalQty} pcs` },
    {
      key: "a",
      header: "",
      className: "w-28 text-right",
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => router.push(`/picking/${r.id}`)}>
            <ClipboardCheck className="size-3.5" /> Buka
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {waiting.length > 0 ? (
        <DataTable
          title="Menunggu Pengiriman"
          description="Order sudah dipicked — konfirmasi kirim lewat form picking (stok baru berkurang di situ)."
          columns={waitingColumns}
          rows={waiting}
          keyOf={(r) => r.id}
        />
      ) : null}

      <DataTable
        title="Riwayat Pengiriman"
        description={`${rows.length} pengiriman tercatat — resi unik per order.`}
        columns={columns}
        rows={filtered}
        keyOf={(r) => r.id}
        searchable={{ placeholder: "Cari resi / no. order / pelanggan…", value: q, onChange: setQ }}
        emptyTitle="Belum ada pengiriman"
        emptyDescription="Pengiriman muncul setelah konfirmasi kirim dari form picking."
      />
    </div>
  );
}
