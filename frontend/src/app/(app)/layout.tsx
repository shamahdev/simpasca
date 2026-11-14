import { Suspense } from "react";
import { AppSidebar, CurrentAppSidebar } from "@/components/layout/app-sidebar";

const sidebarClass = "sticky top-0 h-screen";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      {/* Prerendered sidebar without highlight; the active item streams in. */}
      <Suspense fallback={<AppSidebar className={sidebarClass} />}>
        <CurrentAppSidebar className={sidebarClass} />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
