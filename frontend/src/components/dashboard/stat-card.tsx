import { CardRoot } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Summary cards link to their related data (PRD KF-02). */
  href: string;
}

export function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <CardRoot className="gap-2 transition-colors group-hover:bg-surface-hover">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs leading-5 text-muted">{label}</span>
          <Icon aria-hidden className="size-[18px] text-accent" />
        </div>
        <p className="text-2xl font-semibold">{value}</p>
      </CardRoot>
    </Link>
  );
}
