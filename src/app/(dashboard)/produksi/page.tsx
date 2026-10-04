import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackagePlus, Ruler, Scissors, Shirt } from "lucide-react";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";

export const metadata: Metadata = { title: "Produksi" };

/** Landing modul Produksi — ringkasan real + jalan cepat ke sub-modul. */
export default async function ProduksiPage() {
  await requirePermission(PERMISSION_CODES.PRODUCTION_VIEW);

  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [usage, usageQty, cutting, sewing, setorQty, timAktif] = await Promise.all([
    prisma.materialUsage.count({ where: { date: { gte: awalBulan } } }),
    prisma.materialUsage.aggregate({ _sum: { qty: true }, where: { date: { gte: awalBulan } } }),
    prisma.cutting.count({ where: { date: { gte: awalBulan } } }),
    prisma.sewing.count({ where: { date: { gte: awalBulan } } }),
    prisma.sewing.aggregate({ _sum: { setorQty: true }, where: { date: { gte: awalBulan } } }),
    prisma.productionTeam.count({ where: { isActive: true } }),
  ]);

  const submodules = [
    {
      href: "/produksi/pengeluaran-bahan",
      title: "Pengeluaran Bahan",
      desc: "Pakai kain/roll per tim & warna.",
      icon: PackagePlus,
    },
    {
      href: "/produksi/hasil",
      title: "Hasil Produksi",
      desc: "Cutting, jahit, dan setor tim.",
      icon: Shirt,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Produksi"
        description={`Ringkasan bulan ini — ${timAktif} tim aktif.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pengeluaran Bahan"
          value={String(usage)}
          icon={PackagePlus}
          accent="emerald"
          comparison={`${usageQty._sum.qty ?? 0} m/yard terpakai`}
        />
        <StatCard
          label="Cutting"
          value={String(cutting)}
          icon={Scissors}
          accent="indigo"
          comparison="batch bulan ini"
        />
        <StatCard
          label="Jahit Masuk"
          value={String(sewing)}
          icon={Shirt}
          accent="blue"
          comparison="order bulan ini"
        />
        <StatCard
          label="Disetor"
          value={String(setorQty._sum.setorQty ?? 0)}
          icon={Ruler}
          accent="amber"
          comparison="pcs selesai bulan ini"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {submodules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="group transition-colors hover:border-teal-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <m.icon className="size-4.5" />
                  </span>
                  {m.title}
                  <ArrowRight className="ml-auto size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
