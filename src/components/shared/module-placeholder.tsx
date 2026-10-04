import { Construction } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

/**
 * Placeholder modern untuk modul bisnis yang belum dibangun.
 * Tidak ada fake functionality / data fiktif.
 */
export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        actions={
          <StatusBadge tone="warning">Phase berikutnya</StatusBadge>
        }
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex size-13 items-center justify-center rounded-2xl bg-teal-50 p-3 text-teal-600">
            <Construction className="size-6" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">
            Modul {title} sedang disiapkan
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-600">
            {description} Modul ini akan tersedia pada phase berikutnya dengan
            tabel data, filter, dan alur kerja lengkap.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <a href="/dashboard" className={buttonStyles("outline", "default")}>
              Kembali ke Dashboard
            </a>
            <Button disabled title="Akan aktif saat modul tersedia">
              Minta akses awal
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
