import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { HasilView, type HasilRow } from "@/features/produksi/components/hasil-view";

export const metadata: Metadata = { title: "Hasil Produksi" };

export default async function HasilProduksiPage() {
  await requirePermission(PERMISSION_CODES.PRODUCTION_VIEW);

  const [cuttings, sewings] = await Promise.all([
    prisma.cutting.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        team: { select: { name: true } },
        product: { select: { code: true, name: true } },
        color: { select: { name: true } },
        items: { select: { qty: true } },
      },
    }),
    prisma.sewing.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        product: { select: { code: true, name: true } },
        color: { select: { name: true } },
        sewist: { select: { name: true } },
        items: { select: { qty: true } },
      },
    }),
  ]);

  // Gabung cutting + jahit dalam satu daftar; urut tanggal naik (A→Z).
  const rows: HasilRow[] = [
    ...cuttings.map<HasilRow>((c) => ({
      id: `C-${c.id}`,
      date: c.date.toISOString(),
      kind: "CUTTING",
      productCode: c.product.code,
      productName: c.product.name,
      colorName: c.color.name,
      actor: c.team.name,
      qty: c.items.reduce((sum, i) => sum + i.qty, 0),
      roll: c.roll,
      surplus: c.surplus,
      setorQty: null,
      note: c.note,
    })),
    ...sewings.map<HasilRow>((s) => ({
      id: `S-${s.id}`,
      date: s.date.toISOString(),
      kind: "SEWING",
      productCode: s.product.code,
      productName: s.product.name,
      colorName: s.color.name,
      actor: s.sewist.name,
      qty: s.items.reduce((sum, i) => sum + i.qty, 0),
      roll: null,
      surplus: null,
      setorQty: s.setorQty,
      note: s.note,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageContainer>
      <PageHeader
        title="Hasil Produksi"
        description="Potongan (cutting) dan hasil jahit yang sudah masuk — qty per ukuran dijumlahkan, selisih disetor dihitung otomatis."
      />
      <HasilView rows={rows} />
    </PageContainer>
  );
}
