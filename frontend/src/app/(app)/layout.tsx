import { Suspense } from "react";
import {
  AppSidebar,
  CurrentAppSidebar,
  SidebarAccount,
} from "@/components/layout/app-sidebar";
import { getCurrentUser } from "@/lib/auth";

const sidebarClass = "sticky top-0 h-screen";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const account = (
    <Suspense fallback={<SidebarAccount name="…" />}>
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

async function CurrentAccount() {
  const user = await getCurrentUser();
  return <SidebarAccount name={user.name} />;
}
