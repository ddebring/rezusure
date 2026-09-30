import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <h1 className="text-lg font-semibold text-slate-950">{title}</h1>
      </div>
      <Button variant="outline" size="sm" asChild><Link href="/dashboard/resumes/new">Analyze a resume</Link></Button>
    </header>
  );
}
