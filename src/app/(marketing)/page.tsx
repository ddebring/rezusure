import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { MarketingGrid } from "@/components/marketing/marketing-grid";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return <>
    <Hero />
    <main>
      <section className="container-shell py-20"><SectionHeading eyebrow="Built for iteration" title="Know what is wrong before you rewrite everything." description="REZUSURE is designed around a repeatable loop: upload, analyze, fix the highest-impact issues, and compare your progress over time." /><MarketingGrid /></section>
      <section className="border-y border-slate-200 bg-white"><div className="container-shell py-20"><SectionHeading eyebrow="Plans" title="A billing foundation built for India and international markets." description="The product resolves country, currency, pricing region, and payment provider on the server. The interface consumes one provider-agnostic pricing model." /><PricingPreview /></div></section>
      <section className="container-shell py-20"><div className="surface flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Next step</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Build a resume you can defend in an interview.</h2><p className="mt-3 max-w-xl text-slate-600">Start with a structured analysis. The product foundation is ready for the authentication and resume pipeline milestone.</p></div><Button size="lg" asChild><Link href="/signup">Get started <ArrowRight className="h-4 w-4" /></Link></Button></div></section>
    </main>
  </>;
}
