import Link from "next/link";
import {
  FileText,
  Gauge,
  CreditCard,
  Settings,
} from "lucide-react";
import { Logo } from "../logo";

const items = [
  ["/dashboard", "Overview", Gauge],
  ["/dashboard/resumes", "Resumes", FileText],
  ["/dashboard/billing", "Billing", CreditCard],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export function DashboardSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[rgba(255,255,255,0.82)] lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col p-5">

        {/* Logo */}
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Navigation */}
        <nav
          className="mt-8 space-y-1"
          aria-label="Dashboard navigation"
        >
          {items.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

      </div>
    </aside>
  );
}