import Link from "next/link";
import { FileText, Gauge, CreditCard, Settings, Sparkles } from "lucide-react";

const items = [
  ["/dashboard", "Overview", Gauge],
  ["/dashboard/resumes", "Resumes", FileText],
  ["/dashboard/billing", "Billing", CreditCard],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export function DashboardSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col p-5">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white"><Sparkles className="h-4 w-4" /></span>
          REZUSURE
        </Link>
        <nav className="mt-8 space-y-1" aria-label="Dashboard navigation">
          {items.map(([href, label, Icon]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-900">Foundation build</p>
          <p className="mt-1 text-slate-500">Authentication and protected data flows are the next implementation milestone.</p>
        </div>
      </div>
    </aside>
  );
}
