import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { PERMISSION_CODES } from "@/lib/constants/permissions";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "HR & Payroll" };

export default async function HrPage() {
  await requirePermission(PERMISSION_CODES.PAYROLL_VIEW);
  return (
    <ModulePlaceholder
      title="HR & Payroll"
      description="Absensi, penggajian, bonus, dan target sales."
    />
  );
}
