import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Persediaan" };

export default async function PersediaanPage() {
  await requirePermission(PERMISSION_CODES.INVENTORY_VIEW);
  return (
    <ModulePlaceholder
      title="Persediaan"
      description="Stok produk jadi, bahan baku, dan mutasi gudang."
    />
  );
}
