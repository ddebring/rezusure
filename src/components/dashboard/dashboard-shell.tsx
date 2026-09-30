import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({ children, title = "Overview" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar />
      <div className="min-w-0 flex-1">
        <DashboardHeader title={title} />
        <main className="container-shell py-8">{children}</main>
      </div>
    </div>
  );
}
