import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PengeluaranBahanView } from "@/features/produksi/components/pengeluaran-bahan-view";

export const metadata: Metadata = { title: "Pengeluaran Bahan" };

export default async function PengeluaranBahanPage() {
  await requirePermission(PERMISSION_CODES.PRODUCTION_VIEW);

  const [usages, fabrics, stocks, teams] = await Promise.all([
    prisma.materialUsage.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        team: { select: { name: true } },
        fabric: { select: { code: true, name: true, unit: true } },
        color: { select: { name: true } },
      },
    }),
    prisma.fabric.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.fabricStock.findMany({
      include: { color: { select: { name: true } } },
      orderBy: { colorId: "asc" },
    }),
    prisma.productionTeam.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Pengeluaran Bahan"
        description="Catat kain yang keluar gudang untuk produksi — stok bahan (per warna) otomatis berkurang dan tidak boleh minus."
      />
      <PengeluaranBahanView
        usages={usages.map((u) => ({
          id: u.id,
          date: u.date.toISOString(),
          teamName: u.team.name,
          fabricCode: u.fabric.code,
          fabricName: u.fabric.name,
          unit: u.fabric.unit,
          colorName: u.color.name,
          roll: u.roll,
          qty: u.qty,
          note: u.note,
        }))}
        fabrics={fabrics.map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          unit: f.unit,
        }))}
        stocks={stocks.map((s) => ({
          fabricId: s.fabricId,
          colorId: s.colorId,
          colorName: s.color.name,
          qty: Number(s.qty),
        }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </PageContainer>
  );
}
