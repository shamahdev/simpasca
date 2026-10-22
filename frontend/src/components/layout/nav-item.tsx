import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
}

export function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex h-9 items-center gap-3 rounded-2xl px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
        isActive
          ? "bg-accent-soft text-accent"
          : "text-foreground hover:bg-default"
      }`}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
