"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Tag, Ruler, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  saveProduct,
  deleteProduct,
  saveColor,
  deleteColor,
  saveSize,
  deleteSize,
} from "@/features/master/actions";
import {
  ActiveToggle,
  ChipMultiSelect,
  CurrencyInput,
  FormField,
  SegmentedChips,
} from "@/features/master/components/field";

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  type: "GARMENT" | "ACCESSORY";
  basePrice: number;
  isActive: boolean;
  sizeIds: string[];
}
export interface SizeRow {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}
export interface ColorRow {
  id: string;
  code: string;
  name: string;
  hex: string | null;
}
type Tab = "produk" | "warna" | "ukuran";

const TABS: { key: Tab; label: string; icon: typeof Tag }[] = [
  { key: "produk", label: "Produk", icon: Tag },
  { key: "warna", label: "Warna", icon: Palette },
  { key: "ukuran", label: "Ukuran", icon: Ruler },
];

const emptyProduct = {
  code: "",
  name: "",
  type: "GARMENT" as "GARMENT" | "ACCESSORY",
  basePrice: 0,
  isActive: true,
  sizeIds: [] as string[],
};

export function ProdukView({
  products,
  sizes,
  colors,
}: {
  products: ProductRow[];
  sizes: SizeRow[];
  colors: ColorRow[];
}) {
  const [tab, setTab] = useState<Tab>("produk");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [pending, startTransition] = useTransition();

  // form state
  const [productForm, setProductForm] = useState<(typeof emptyProduct & { id?: string }) | null>(null);
  const [colorForm, setColorForm] = useState<{ id?: string; code: string; name: string; hex: string } | null>(null);
  const [sizeForm, setSizeForm] = useState<{ id?: string; code: string; label: string; sortOrder: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // filter + sort (ascending by nama)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => (status === "active" ? p.isActive : status === "inactive" ? !p.isActive : true))
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [products, q, status]);

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

  async function submitProduct() {
    if (!productForm) return;
    startTransition(async () => {
      if (handle(await saveProduct(productForm))) setProductForm(null);
    });
  }
  async function submitColor() {
    if (!colorForm) return;
    startTransition(async () => {
      if (handle(await saveColor(colorForm))) setColorForm(null);
    });
  }
  async function submitSize() {
    if (!sizeForm) return;
    startTransition(async () => {
      if (handle(await saveSize(sizeForm))) setSizeForm(null);
    });
  }

  const columns: DataTableColumn<ProductRow>[] = [
    {
      key: "code",
      header: "Kode",
      render: (r) => <span className="font-mono text-xs font-semibold text-teal-700">{r.code}</span>,
    },
    { key: "name", header: "Nama Produk", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    {
      key: "type",
      header: "Tipe",
      render: (r) => (
        <Badge variant={r.type === "GARMENT" ? "default" : "neutral"}>{r.type === "GARMENT" ? "Pakaian" : "Atribut"}</Badge>
      ),
    },
    {
      key: "basePrice",
      header: "Harga",
      className: "text-right tabular-nums",
      render: (r) => formatCurrency(r.basePrice),
    },
    {
      key: "sizes",
      header: "Ukuran",
      render: (r) => {
        if (r.type === "ACCESSORY") return <span className="text-slate-400">—</span>;
        const codes = r.sizeIds
          .map((id) => sizes.find((s) => s.id === id)?.code)
          .filter(Boolean) as string[];
        if (codes.length === 0) return <span className="text-slate-400">belum diatur</span>;
        const shown = codes.slice(0, 8);
        const rest = codes.length - shown.length;
        return (
          <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
            {shown.map((code) => (
              <span
                key={code}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-600"
              >
                {code}
              </span>
            ))}
            {rest > 0 ? (
              <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-teal-700">
                +{rest}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "isActive",
      header: "Status",
      render: (r) =>
        r.isActive ? (
          <Badge variant="default">Aktif</Badge>
        ) : (
          <Badge variant="neutral">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${r.name}`}
            onClick={() => {
              setFieldErrors({});
              setProductForm({ ...r });
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" aria-label={`Hapus ${r.name}`}>
                Hapus
              </Button>
            }
            description={`Produk "${r.name}" akan dihapus permanen.`}
            onConfirm={async () => {
              const res = await deleteProduct(r.id);
              toast[res.success ? "success" : "error"](res.message ?? "");
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none",
                active
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-teal-50 hover:text-teal-700",
              )}
            >
              <t.icon className="size-4" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ------------------- PRODUK ------------------- */}
      {tab === "produk" ? (
        <DataTable
          title="Daftar Produk"
          description={`${products.length} produk terdaftar — urut nama (A→Z).`}
          columns={columns}
          rows={filtered}
          keyOf={(r) => r.id}
          searchable={{ placeholder: "Cari nama / kode produk…", value: q, onChange: setQ }}
          filters={
            (
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {([
                  ["all", "Semua"],
                  ["active", "Aktif"],
                  ["inactive", "Nonaktif"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setStatus(k)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      status === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          }
          actions={
            <Button
              onClick={() => {
                setFieldErrors({});
                setProductForm({ ...emptyProduct, sizeIds: sizes.map((s) => s.id) });
              }}
            >
              <Plus className="size-4" /> Tambah Produk
            </Button>
          }
          emptyTitle="Belum ada produk"
          emptyDescription="Tambahkan produk pertama dari katalog atau hasil input manual."
        />
      ) : null}

      {/* ------------------- WARNA ------------------- */}
      {tab === "warna" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {colors.length} warna — sumber kebenaran tunggal varian (huruf besar semua).
            </p>
            <Button onClick={() => { setFieldErrors({}); setColorForm({ code: "", name: "", hex: "#8B5CF6" }); }}>
              <Plus className="size-4" /> Tambah Warna
            </Button>
          </div>
          {colors.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              Belum ada warna.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {[...colors]
                .sort((a, b) => a.name.localeCompare(b.name, "id"))
                .map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-teal-300 hover:shadow"
                  >
                    <span
                      className="size-8 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: c.hex ?? "#94A3B8" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium break-words text-slate-800">{c.name}</p>
                      <p className="truncate font-mono text-[11px] text-slate-400">{c.code}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => { setFieldErrors({}); setColorForm({ id: c.id, code: c.code, name: c.name, hex: c.hex ?? "#8B5CF6" }); }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600">
                            Hapus
                          </Button>
                        }
                        description={`Warna "${c.name}" akan dihapus.`}
                        onConfirm={async () => {
                          const res = await deleteColor(c.id);
                          toast[res.success ? "success" : "error"](res.message ?? "");
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ------------------- UKURAN ------------------- */}
      {tab === "ukuran" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {sizes.length} ukuran — dua sistem: apparel (S–XL) &amp; numerik (4–14).
            </p>
            <Button onClick={() => { setFieldErrors({}); setSizeForm({ code: "", label: "", sortOrder: sizes.length + 1 }); }}>
              <Plus className="size-4" /> Tambah Ukuran
            </Button>
          </div>
          {sizes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              Belum ada ukuran.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {[...sizes]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => (
                  <div
                    key={s.id}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-teal-300 hover:shadow"
                  >
                    <span className="text-lg font-semibold text-teal-700">{s.code}</span>
                    <span className="text-center text-[11px] text-slate-400">{s.label}</span>
                    <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5"
                        aria-label={`Edit ${s.code}`}
                        onClick={() => { setFieldErrors({}); setSizeForm({ id: s.id, code: s.code, label: s.label, sortOrder: s.sortOrder }); }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-red-500 hover:text-red-600">
                            Hapus
                          </Button>
                        }
                        description={`Ukuran "${s.code}" akan dihapus dari semua produk.`}
                        onConfirm={async () => {
                          const res = await deleteSize(s.id);
                          toast[res.success ? "success" : "error"](res.message ?? "");
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ================= FORM PRODUK ================= */}
      <Modal
        open={productForm !== null}
        onClose={() => setProductForm(null)}
        title={productForm?.id ? "Edit Produk" : "Tambah Produk"}
        description="Isi identitas, harga, dan ukuran yang berlaku untuk produk ini."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setProductForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitProduct} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Produk"}
            </Button>
          </>
        }
      >
        {productForm ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kode" required error={fieldErrors.code?.[0]}>
                <Input
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value.toUpperCase() })}
                  placeholder="KB — kode pendek dropship"
                  maxLength={20}
                />
              </FormField>
              <FormField label="Nama Produk" required error={fieldErrors.name?.[0]}>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="KUTU BARU"
                  maxLength={100}
                />
              </FormField>
            </div>

            <FormField label="Tipe Produk" required>
              <SegmentedChips
                value={productForm.type}
                onChange={(type) => setProductForm({ ...productForm, type })}
                options={[
                  { value: "GARMENT", label: "Pakaian", description: "Punya pilihan ukuran" },
                  { value: "ACCESSORY", label: "Atribut", description: "Tanpa ukuran (stok satuan)" },
                ]}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Harga" required error={fieldErrors.basePrice?.[0]} hint="Harga katalog, berlaku umum">
                <CurrencyInput
                  value={productForm.basePrice}
                  onChange={(basePrice) => setProductForm({ ...productForm, basePrice })}
                />
              </FormField>
              <FormField label="Status">
                <ActiveToggle
                  value={productForm.isActive}
                  onChange={(isActive) => setProductForm({ ...productForm, isActive })}
                />
              </FormField>
            </div>

            {productForm.type === "GARMENT" ? (
              <FormField
                label="Ukuran Berlaku"
                error={fieldErrors.sizeIds?.[0]}
                hint="Kosongkan jika belum yakin — bisa diatur nanti."
              >
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setProductForm({ ...productForm, sizeIds: sizes.map((s) => s.id) })}
                    >
                      Pilih semua
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setProductForm({ ...productForm, sizeIds: [] })}
                    >
                      Kosongkan
                    </Button>
                  </div>
                  <ChipMultiSelect
                    value={productForm.sizeIds}
                    onChange={(sizeIds) => setProductForm({ ...productForm, sizeIds })}
                    options={sizes
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((s) => ({ value: s.id, label: s.code }))}
                  />
                </div>
              </FormField>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Atribut tidak memakai ukuran — stok dicatat per warna saja.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ================= FORM WARNA ================= */}
      <Modal
        open={colorForm !== null}
        onClose={() => setColorForm(null)}
        title={colorForm?.id ? "Edit Warna" : "Tambah Warna"}
        description="Kode otomatis jadi huruf besar — dipakai semua modul (stok, produksi, penjualan)."
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setColorForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitColor} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Warna"}
            </Button>
          </>
        }
      >
        {colorForm ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kode" required error={fieldErrors.code?.[0]}>
                <Input
                  value={colorForm.code}
                  onChange={(e) => setColorForm({ ...colorForm, code: e.target.value.toUpperCase() })}
                  placeholder="BURGUNDY"
                  maxLength={30}
                />
              </FormField>
              <FormField label="Nama Tampilan" required error={fieldErrors.name?.[0]}>
                <Input
                  value={colorForm.name}
                  onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
                  placeholder="Burgundy"
                  maxLength={50}
                />
              </FormField>
            </div>
            <FormField label="Warna" hint="Dipakai titik pratinjau di daftar stok.">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorForm.hex}
                  onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  aria-label="Pilih warna"
                />
                <span className="font-mono text-sm text-slate-500">{colorForm.hex.toUpperCase()}</span>
                <span
                  className="size-8 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: colorForm.hex }}
                  aria-hidden
                />
              </div>
            </FormField>
          </div>
        ) : null}
      </Modal>

      {/* ================= FORM UKURAN ================= */}
      <Modal
        open={sizeForm !== null}
        onClose={() => setSizeForm(null)}
        title={sizeForm?.id ? "Edit Ukuran" : "Tambah Ukuran"}
        description="Kode tampil singkat (S, 4, 14); label menjelaskan artinya."
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSizeForm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitSize} disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Ukuran"}
            </Button>
          </>
        }
      >
        {sizeForm ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Kode" required error={fieldErrors.code?.[0]} hint="S, M, XL, 4, 14…">
              <Input
                value={sizeForm.code}
                onChange={(e) => setSizeForm({ ...sizeForm, code: e.target.value.toUpperCase() })}
                placeholder="S"
                maxLength={10}
              />
            </FormField>
            <FormField label="Label" required error={fieldErrors.label?.[0]} hint="Small, Extra Large…">
              <Input
                value={sizeForm.label}
                onChange={(e) => setSizeForm({ ...sizeForm, label: e.target.value })}
                placeholder="Small"
                maxLength={30}
              />
            </FormField>
            <FormField label="Urutan" hint="Posisi saat ditampilkan.">
              <Input
                type="number"
                min={0}
                value={sizeForm.sortOrder}
                onChange={(e) => setSizeForm({ ...sizeForm, sortOrder: Number(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
