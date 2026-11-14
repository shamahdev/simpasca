import { CardRoot } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Summary cards on the dashboard link to their related data (PRD KF-02). */
  href?: string;
  /** Short note under the value, e.g. a negative balance warning. */
  note?: string;
  tone?: "default" | "danger";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  note,
  tone = "default",
}: StatCardProps) {
  const card = (
    <CardRoot
      className={`gap-2 ${href ? "transition-colors group-hover:bg-surface-hover" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs leading-5 text-muted">{label}</span>
        <Icon aria-hidden className="size-[18px] text-accent" />
      </div>
      <p
        className={`text-2xl font-semibold ${tone === "danger" ? "text-danger" : ""}`}
      >
        {value}
      </p>
      {note && (
        <p
          className={`text-xs leading-5 ${tone === "danger" ? "text-danger" : "text-muted"}`}
        >
          {note}
        </p>
      )}
    </CardRoot>
  );

  if (!href) return card;
  return (
    <Link
      href={href}
      className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {card}
    </Link>
  );
}
