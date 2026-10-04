import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  actions?: ReactNode;
  columns: DataTableColumn<T>[];
  rows: T[];
  keyOf: (row: T, index: number) => string;
  searchable?: { placeholder?: string; value?: string; onChange?: (v: string) => void };
  filters?: ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  footer?: ReactNode;
  className?: string;
}

/**
 * Pembungkus tabel konsisten: header kartu → toolbar → tabel → footer.
 * Row hover, toolbar search/filter, empty & loading state bawaan.
 * Untuk sorting/pagination lanjutan, teruskan via `footer` / props.
 */
export function DataTable<T>({
  title,
  description,
  actions,
  columns,
  rows,
  keyOf,
  searchable,
  filters,
  loading,
  emptyTitle = "Belum ada data",
  emptyDescription = "Data akan muncul di sini setelah ditambahkan.",
  emptyActionLabel,
  footer,
  className,
}: DataTableProps<T>) {
  return (
    <Card className={cn("overflow-hidden rounded-xl py-0", className)}>
      <CardHeader className="flex flex-col gap-4 p-5 pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {searchable || filters ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {searchable ? (
              <div className="relative flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder={searchable.placeholder ?? "Cari…"}
                  value={searchable.value}
                  onChange={(e) => searchable.onChange?.(e.target.value)}
                  aria-label="Cari data tabel"
                  className="rounded-lg border-slate-200 bg-card pr-3 pl-9"
                />
              </div>
            ) : null}
            {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
          </div>
        ) : null}

        {loading ? (
          <TableSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={emptyActionLabel} />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase first:pl-4 last:pr-4",
                        c.className,
                      )}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={keyOf(row, i)} className="transition-colors hover:bg-teal-50/40">
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-3 text-slate-700 first:pl-4 last:pr-4", c.className)}>
                        {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {footer ? <div className="flex items-center justify-between border-t border-slate-100 pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
