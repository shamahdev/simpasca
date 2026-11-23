import { LogIn } from "lucide-react";
import { Suspense } from "react";
import {
  AppSidebar,
  CurrentAppSidebar,
  SidebarAccount,
} from "@/components/layout/app-sidebar";
import { LinkButton } from "@/components/ui/link-button";
import { getCurrentUser } from "@/lib/auth";

const sidebarClass = "sticky top-0 h-screen";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const account = (
    <Suspense fallback={<div className="h-20" />}>
      <CurrentAccount />
    </Suspense>
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

/** Staff see who is signed in; visitors (warga) read everything and get a way to sign in. */
async function CurrentAccount() {
  const user = await getCurrentUser();
  if (user) return <SidebarAccount name={user.name} />;
  return (
    <>
      <p className="text-xs text-muted">Data bantuan bencana terbuka untuk publik.</p>
      <LinkButton href="/login" variant="outline" fullWidth>
        <LogIn aria-hidden className="size-4" />
        Masuk petugas
      </LinkButton>
    </>
  );
}
