import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { filterMenu, MENU_ITEMS } from "@/components/layout/menu";
import { requireUser } from "@/lib/permissions";

interface GroupIndexPageProps {
  groupHref: "/master" | "/pengaturan";
  title: string;
  description: string;
}

async function GroupIndex({ groupHref, title, description }: GroupIndexPageProps) {
  const user = await requireUser();
  const group = filterMenu(MENU_ITEMS, user.permissions).find(
    (m) => m.href === groupHref,
  );
  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(group?.children ?? []).map((c) => (
            <Link key={c.href} href={c.href} className="group">
              <Card className="transition-colors group-hover:border-teal-300">
                <CardHeader className="p-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <c.icon className="size-5" aria-hidden />
                    {c.title}
                    <ArrowRight
                      className="text-muted-foreground ml-auto size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </CardTitle>
                  <CardDescription>Buka sub-modul</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
}

export const metadata: Metadata = {
  title: "Master Data",
  description: "Master data produk, bahan baku, karyawan, dan supplier.",
};

export default function MasterIndexPage() {
  return (
    <GroupIndex
      groupHref="/master"
      title="Master Data"
      description="Kelola data induk produk, bahan baku, karyawan, dan supplier."
    />
  );
}
