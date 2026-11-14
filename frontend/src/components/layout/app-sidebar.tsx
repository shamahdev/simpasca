"use client";

import { Avatar, Button } from "@heroui/react";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavItem } from "./nav-item";
import { isNavItemActive, navItems } from "./nav-items";

interface AppSidebarProps {
  className?: string;
  /** Highlights the matching nav item; omit to render none active. */
  pathname?: string;
}

/** Sidebar that highlights the current route. Wrap in Suspense (usePathname on dynamic routes). */
export function CurrentAppSidebar({ className }: { className?: string }) {
  return <AppSidebar className={className} pathname={usePathname()} />;
}

export function AppSidebar({ className = "", pathname }: AppSidebarProps) {
  return (
    <aside
      className={`flex w-60 shrink-0 flex-col border-r border-separator bg-surface px-3 py-5 ${className}`}
    >
      <div className="flex h-9 items-center px-2">
        <span className="text-base font-semibold">SIMPASCA</span>
      </div>

      <nav aria-label="Navigasi utama" className="mt-6 flex flex-col">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={
              pathname !== undefined && isNavItemActive(item.href, pathname)
            }
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-separator px-2 pt-3">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <Avatar.Fallback className="text-xs font-normal">SA</Avatar.Fallback>
          </Avatar>
          <span className="truncate text-sm font-semibold">Shaddam Amru</span>
        </div>
        {/* TODO: wire up sign-out once authentication (KF-01) exists. */}
        <Button variant="outline" fullWidth>
          <LogOut aria-hidden className="size-4" />
          Keluar
        </Button>
      </div>
    </aside>
  );
}
