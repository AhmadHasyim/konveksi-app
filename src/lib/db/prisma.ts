import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma client singleton — aman untuk development hot-reload.
 * Prisma 7 mewajibkan driver adapter (PostgreSQL via @prisma/adapter-pg).
 * Dipakai mulai Phase 2 (saat PostgreSQL disambungkan); Phase 1
 * memakai data dummy (src/lib/mock/store.ts).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum di-set. Lihat .env.example (dibutuhkan mulai Phase 2).",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
