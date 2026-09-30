import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Resume analysis", robots: { index: false, follow: false } };

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-6"><div><div className="flex flex-wrap items-center gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Analysis</p><Badge variant="outline">{id}</Badge></div><h2 className="mt-2 text-3xl font-semibold">Structured resume report</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">The production view will read validated analysis documents only; raw model output will never drive the UI directly.</p></div><section className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Overall score</CardTitle></CardHeader><CardContent><span className="text-5xl font-semibold">—</span><span className="ml-2 text-sm text-slate-500">/ 100</span></CardContent></Card><Card><CardHeader><CardTitle>Critical issues</CardTitle></CardHeader><CardContent><span className="text-3xl font-semibold">—</span></CardContent></Card><Card><CardHeader><CardTitle>Missing keywords</CardTitle></CardHeader><CardContent><span className="text-3xl font-semibold">—</span></CardContent></Card></section></div>;
}
