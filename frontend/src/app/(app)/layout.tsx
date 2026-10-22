import { AppSidebar } from "@/components/layout/app-sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar className="sticky top-0 h-screen" />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
