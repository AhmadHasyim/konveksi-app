import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

/**
 * Empty state ramah: ikon → judul → deskripsi → aksi.
 * Jangan pernah hanya menampilkan "No data".
 */
export function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <Card className="rounded-xl border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <Icon className="size-6" aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        {actionLabel ? (
          actionHref ? (
            <a href={actionHref} className={buttonStyles("primary", "default", "mt-5")}>
              {actionLabel}
            </a>
          ) : (
            <Button className="mt-5" onClick={onAction}>
              {actionLabel}
            </Button>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
