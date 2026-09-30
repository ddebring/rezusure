import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Resume", robots: { index: false, follow: false } };

export default async function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resume</p><h2 className="mt-2 text-2xl font-semibold">Resume {id}</h2><p className="mt-1 text-sm text-slate-500">Data loading and ownership checks will be server-side.</p></div><Card><CardHeader><CardTitle>Resume details</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">The persisted resume document, parsed content, and analysis history will render here.</p></CardContent></Card></div>;
}
