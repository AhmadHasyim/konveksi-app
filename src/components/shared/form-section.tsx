import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Section form dengan grouping: judul → deskripsi → field grid. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <Card className={cn("rounded-xl py-0", className)}>
      <CardHeader className="border-b border-slate-100 p-5">
        <CardTitle className="text-[15px] font-semibold text-slate-900">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-1.5", className)}>{children}</div>;
}
