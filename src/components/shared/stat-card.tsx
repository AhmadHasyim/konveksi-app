import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  comparison?: string;
  icon: LucideIcon;
  accent?: "indigo" | "emerald" | "blue" | "amber";
  className?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  indigo: "bg-teal-50 text-teal-600",
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
};

/**
 * KPI card modern: label → value → trend + comparison → icon.
 * Selalu sertakan konteks, bukan angka mentah.
 */
export function StatCard({
  label,
  value,
  trend,
  comparison,
  icon: Icon,
  accent = "indigo",
  className,
}: StatCardProps) {
  const TrendIcon =
    trend?.direction === "up" ? ArrowUpRight : trend?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card
      className={cn(
        "rounded-xl border border-slate-200 bg-card py-0 shadow-[0_1px_2px_0_rgb(15_23_42/0.05)]",
        className,
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] font-medium text-slate-600">{label}</p>
          <p className="truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          {trend || comparison ? (
            <p className="flex flex-wrap items-center gap-1.5 text-xs">
              {trend ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
                    trend.direction === "up" && "bg-emerald-50 text-emerald-700",
                    trend.direction === "down" && "bg-red-50 text-red-600",
                    trend.direction === "flat" && "bg-slate-100 text-slate-600",
                  )}
                >
                  <TrendIcon className="size-3.5" aria-hidden />
                  {trend.value}
                </span>
              ) : null}
              {comparison ? (
                <span className="text-slate-400">{comparison}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
            ACCENTS[accent],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
