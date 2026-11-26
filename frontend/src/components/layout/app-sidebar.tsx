"use client";

import { Avatar, Button } from "@heroui/react";
import { LogOut, UserCog } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { NavItem } from "./nav-item";
import { isNavItemActive, navItems } from "./nav-items";

interface AppSidebarProps {
  className?: string;
  /** Highlights the matching nav item; omit to render none active. */
  pathname?: string;
  /** Signed-in user and sign-out button (see SidebarAccount). */
  account?: ReactNode;
}

/** Sidebar that highlights the current route. Wrap in Suspense (usePathname on dynamic routes). */
export function CurrentAppSidebar(props: Omit<AppSidebarProps, "pathname">) {
  return <AppSidebar {...props} pathname={usePathname()} />;
}

export function AppSidebar({ className = "", pathname, account }: AppSidebarProps) {
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
        {account}
      </div>
    </aside>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/** Account footer of the sidebar: who is signed in, and sign-out (UC-01). */
export function SidebarAccount({ name, canManageUsers }: { name: string; canManageUsers?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <Avatar.Fallback className="text-xs font-normal">{initials(name)}</Avatar.Fallback>
        </Avatar>
        <span className="truncate text-sm font-semibold">{name}</span>
      </div>
      {canManageUsers && (
        <LinkButton href="/pengguna" variant="ghost" fullWidth>
          <UserCog aria-hidden className="size-4" />
          Kelola akun
        </LinkButton>
      )}
      <form action={logout}>
        <Button type="submit" variant="outline" fullWidth>
          <LogOut aria-hidden className="size-4" />
          Keluar
        </Button>
      </form>
    </>
  );
}
