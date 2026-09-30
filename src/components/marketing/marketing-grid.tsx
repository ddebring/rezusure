import { SearchCheck, Layers3, History, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  [SearchCheck, "Structured resume scoring", "Measure ATS readiness, content quality, structure, impact, and clarity with a consistent schema."],
  [Layers3, "Actionable section feedback", "Understand what is weak in your summary, experience, education, and skills sections."],
  [History, "Persistent analysis history", "Keep previous resumes and analyses accessible so you can iterate instead of starting over."],
  [ShieldCheck, "Security-first architecture", "Keep AI credentials, trusted billing logic, and privileged data operations server-side."],
] as const;

export function MarketingGrid() {
  return <div className="mt-12 grid gap-4 md:grid-cols-2">{items.map(([Icon, title, description]) => <Card key={title as string}><CardHeader><Icon className="h-5 w-5 text-slate-700" /><CardTitle className="mt-3">{title as string}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{description as string}</p></CardContent></Card>)}</div>;
}
