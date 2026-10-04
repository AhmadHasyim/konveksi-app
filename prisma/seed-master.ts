/**
 * Seed master data bisnis dari ekstrak dokumen Excel client (seed-data.json).
 * Idempotent — semua upsert by code. Terpisah dari seed.ts (foundation RBAC).
 *   set -a; source .env.local; set +a && npx tsx prisma/seed-master.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const data = JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf-8")) as {
  colors: string[];
  models: string[];
  teams: string[];
  penjahit: string[];
  dropship: { code: string; name: string; price: number }[];
};

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// hex asli per warna; fallback = hash palet
const HEX: Record<string, string> = {
  BURGUNDY: "#800020", DENIM: "#4F6E9E", COKSU: "#B08968", NAVY: "#1B2A4A",
  HITAM: "#111827", DUSTY: "#D8A7A1", BABYBLUE: "#BDD7EE", MAROON: "#7B1E22",
  GOLD: "#D4AF37", SAGE: "#A3B18A", "EMERALD GREEN": "#0E7C5A", FUCIA: "#E0407F",
  SILVER: "#A8A9AD", "EMERALD BLUE": "#0FA3B1", "BROKEN WHITE": "#FAF7F0",
  MILO: "#5C3D2E", "BUTTER YELLOW": "#FBE38E", ROSEGOLD: "#E0A899",
};
const PALETTE = ["#8B1A1A", "#4A5568", "#C2410C", "#1E3A5F", "#111827", "#92400E", "#065F46", "#7C2D12", "#334155", "#854D0E"];
const hexOf = (code: string) => {
  if (HEX[code]) return HEX[code];
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

async function main() {
  // 1. Warna (18)
  for (const c of data.colors) {
    const code = c.toUpperCase().trim();
    await prisma.color.upsert({
      where: { code },
      update: { hex: hexOf(code) },
      create: { code, name: titleCase(code), hex: hexOf(code) },
    });
  }

  // 2. Ukuran: apparel (S–XL) lalu numerik (4–14)
  const sizes: [string, string, number][] = [
    ["S", "Small", 1], ["M", "Medium", 2], ["L", "Large", 3], ["XL", "Extra Large", 4],
    ["4", "Ukuran 4 (≈S)", 5], ["6", "Ukuran 6 (≈M)", 6], ["8", "Ukuran 8 (≈L)", 7],
    ["10", "Ukuran 10 (≈XL)", 8], ["12", "Ukuran 12", 9], ["14", "Ukuran 14", 10],
  ];
  for (const [code, label, sortOrder] of sizes) {
    await prisma.size.upsert({ where: { code }, update: {}, create: { code, label, sortOrder } });
  }

  // 3. Produk: katalog dropship (kode + harga) + model STOCK yang belum tercakup
  const allSizes = await prisma.size.findMany({ select: { id: true } });
  const dropNames = new Set(data.dropship.map((d) => norm(d.name)));
  const products: { code: string; name: string; price: number }[] = [
    ...data.dropship.map((d) => ({ code: d.code.toUpperCase(), name: d.name.toUpperCase(), price: d.price })),
    ...data.models.filter((m) => !dropNames.has(norm(m))).map((m) => ({
      code: norm(m).slice(0, 3),
      name: m.toUpperCase(),
      price: 0,
    })),
  ];
  const seen = new Set<string>();
  for (const p of products) {
    let code = p.code;
    let n = 2;
    while (seen.has(code)) code = `${p.code}${n++}`;
    seen.add(code);
    await prisma.product.upsert({
      where: { code },
      update: { name: p.name },
      create: {
        code,
        name: p.name,
        type: "GARMENT",
        basePrice: p.price,
        // ponytail: semua ukuran default — rapikan per produk lewat form
        sizes: { create: allSizes.map((s) => ({ sizeId: s.id })) },
      },
    });
  }

  // 4. Bahan
  const fabrics: [string, string][] = [
    ["BRO", "Brokat"], ["TIL", "Tille"], ["FUK", "Fukoro"], ["PUR", "Puring"], ["RBK", "Rok Batik"],
  ];
  for (const [code, name] of fabrics) {
    await prisma.fabric.upsert({ where: { code }, update: {}, create: { code, name, unit: "ROLL" } });
  }

  // 5. Karyawan penjahit — nominal mengikuti RULES Excel
  let i = 1;
  for (const name of data.penjahit) {
    const code = `PJ${String(i++).padStart(2, "0")}`;
    await prisma.employee.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: name.toUpperCase(),
        position: "SEWIST",
        baseSalary: 1_500_000,
        transportAllowance: 100_000,
        workdayBasis: 25,
      },
    });
  }

  // 6. Tim cutting
  for (const name of data.teams) {
    await prisma.productionTeam.upsert({ where: { name }, update: {}, create: { name: name.toUpperCase() } });
  }

  // 7. Entitas brand (cash flow)
  for (const [code, name] of [["KAE", "Kebaya Authentik"], ["GLM", "Glamore Kebaya"]] as const) {
    await prisma.entity.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  const [c, s, p, f, e, t] = await Promise.all([
    prisma.color.count(), prisma.size.count(), prisma.product.count(),
    prisma.fabric.count(), prisma.employee.count(), prisma.productionTeam.count(),
  ]);
  console.log(`Seed master selesai: ${c} warna, ${s} ukuran, ${p} produk, ${f} bahan, ${e} karyawan, ${t} tim.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
