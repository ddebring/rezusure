import { SearchCheck, Layers3, History, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  [SearchCheck, "Structured resume scoring", "Measure ATS readiness, content quality, structure, impact, and clarity with a consistent schema."],
  [Layers3, "Actionable section feedback", "Understand what is weak in your summary, experience, education, and skills sections."],
  [History, "Persistent analysis history", "Keep previous resumes and analyses accessible so you can iterate instead of starting over."],
  [ShieldCheck, "Protected by default", "Your resume data stays private to your account and remains secure within your own workspace."],
] as const;

export function MarketingGrid() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-2">
      {items.map(([Icon, title, description]) => (
        <Card key={title as string} className="bg-[rgba(255,255,255,0.7)]">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--panel-strong)] text-[var(--foreground)]">
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="mt-3 text-xl">{title as string}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description as string}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
