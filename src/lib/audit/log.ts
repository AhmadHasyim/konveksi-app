import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Tulis jejak audit generik (tabel audit_logs, append-only).
 * Dipanggil dari server action SETELAH transaksi sukses.
 * Kegagalan audit tidak boleh membatalkan bisnis — dicatat ke server log.
 */
export async function logAudit(input: {
  userId?: string | null;
  action: string; // CREATE | UPDATE | DELETE | CANCEL | PICK | SHIP | RESTOCK | HPP
  module: string; // order | picking | shipment | retur | finance
  recordId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        module: input.module,
        recordId: input.recordId ?? null,
        before: input.before as Prisma.InputJsonValue | undefined,
        after: input.after as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] gagal menulis jejak:", err);
  }
}
