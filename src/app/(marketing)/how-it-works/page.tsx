import { FileUp, ScanSearch, Wrench, History } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "How it works", description: "Learn how REZUSURE turns a resume upload into structured improvement recommendations." };

const steps = [[FileUp, "Upload", "Add your resume and preserve the original file securely."], [ScanSearch, "Analyze", "AI evaluates ATS, content, structure, impact, clarity, and keywords."], [Wrench, "Improve", "Work through the highest-impact issues and section-level suggestions."], [History, "Iterate", "Return to your history and measure changes across resume versions."]] as const;

export default function HowItWorksPage() {
  return <main className="container-shell py-24"><SectionHeading eyebrow="How it works" title="One workflow, from upload to iteration." description="The product is designed so each future feature can build on the same saved resume and analysis records." /><div className="mt-12 grid gap-4 md:grid-cols-2">{steps.map(([Icon, title, text], index) => <Card key={title}><CardHeader><div className="flex items-center justify-between"><Icon className="h-5 w-5" /><span className="text-sm text-slate-400">0{index + 1}</span></div><CardTitle className="mt-3">{title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{text}</p></CardContent></Card>)}</div></main>;
}
