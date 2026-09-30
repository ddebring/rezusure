import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-shell grid min-h-[620px] items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Resume intelligence</p>
          <h1 className="text-balance max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950 md:text-6xl">Turn your resume into a stronger job-search asset.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">REZUSURE analyzes your resume for ATS readiness, clarity, structure, impact, and keyword alignment—then shows exactly what to improve.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link href="/signup">Analyze my resume <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/how-it-works">See how it works</Link></Button>
          </div>
          <div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-600 sm:grid-cols-2">
            {['Structured score', 'Section-by-section feedback', 'ATS and keyword checks', 'Saved analysis history'].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</div>)}
          </div>
        </div>
        <div className="surface overflow-hidden bg-slate-950 p-5 text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-sm font-semibold">Resume analysis preview</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs">Sample</span></div>
          <div className="grid gap-6 py-6 sm:grid-cols-[150px_1fr]">
            <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-6"><div className="text-center"><div className="text-5xl font-semibold">82</div><div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Overall</div></div></div>
            <div className="space-y-4">
              {[["ATS", 91], ["Content", 84], ["Impact", 73], ["Clarity", 80]].map(([label, value]) => <div key={label as string}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-300">{label as string}</span><span className="font-semibold">{value as number}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-white" style={{ width: `${value}%` }} /></div></div>)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Highest-impact issue</p><p className="mt-2 text-sm leading-6 text-slate-200">Your experience bullets describe responsibilities more often than measurable outcomes.</p></div>
        </div>
      </div>
    </section>
  );
}
