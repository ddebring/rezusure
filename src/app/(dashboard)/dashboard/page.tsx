import Link from "next/link";
import { ArrowRight, FileText, Gauge, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <div className="space-y-6">
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your workspace</p><CardTitle className="mt-2 text-2xl">Start with your latest resume.</CardTitle></div><div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100"><Sparkles className="h-5 w-5" /></div></div></CardHeader><CardContent><p className="max-w-2xl text-sm leading-6 text-slate-600">Your saved analyses, scores, and recommendations will appear here once authentication and the resume pipeline are connected.</p><Button className="mt-5" asChild><Link href="/dashboard/resumes/new">Analyze a resume <ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Usage</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><span className="text-3xl font-semibold">—</span><span className="text-sm text-slate-500">this month</span></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 w-0 rounded-full bg-slate-900" /></div><p className="mt-3 text-sm text-slate-500">Entitlements will be derived from the server-side subscription record.</p></CardContent></Card>
    </section>
    <section className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><Gauge className="h-5 w-5" /><CardTitle className="mt-3">Resume score</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">No analysis yet.</p></CardContent></Card>
      <Card><CardHeader><FileText className="h-5 w-5" /><CardTitle className="mt-3">Saved resumes</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">0</p></CardContent></Card>
      <Card><CardHeader><Sparkles className="h-5 w-5" /><CardTitle className="mt-3">Latest action</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Upload a resume to create your first analysis.</p></CardContent></Card>
    </section>
  </div>;
}
