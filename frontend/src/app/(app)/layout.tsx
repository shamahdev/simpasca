import { LogIn } from "lucide-react";
import { Suspense } from "react";
import {
  AppSidebar,
  CurrentAppSidebar,
  SidebarAccount,
} from "@/components/layout/app-sidebar";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentUser, isSuperadmin } from "@/lib/auth";
import { hasPublicReadAccount } from "@/lib/data/api";
import { redirectToLogin } from "@/lib/session";

const sidebarClass = "sticky top-0 h-screen print:hidden";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  // Without a public account a visitor can read nothing, so keep the old gate
  // instead of rendering pages whose every table fails.
  if (!user && !hasPublicReadAccount()) redirectToLogin();

  const account = user ? (
    <SidebarAccount name={user.name} canManageUsers={isSuperadmin(user)} />
  ) : (
    <>
      <p className="text-xs text-muted">Data bantuan bencana terbuka untuk publik.</p>
      <LinkButton href="/login" variant="outline" fullWidth>
        <LogIn aria-hidden className="size-4" />
        Masuk petugas
      </LinkButton>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Prerendered sidebar without highlight; the active item streams in. */}
      <Suspense fallback={<AppSidebar className={sidebarClass} account={account} />}>
        <CurrentAppSidebar className={sidebarClass} account={account} />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
