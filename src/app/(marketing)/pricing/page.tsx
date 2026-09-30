import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/config/plans";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pricing", description: "Country-aware REZUSURE plans for India and international markets." };

export default function PricingPage() {
  return <main className="container-shell py-24"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing</p><h1 className="mt-3 text-5xl font-semibold tracking-tight">Plans are resolved by your selected pricing region.</h1><p className="mt-5 text-lg leading-8 text-slate-600">India is wired for Razorpay and INR; international markets are wired for Paddle and USD. Final commercial amounts are intentionally not hard-coded until pricing is finalized.</p></div><div className="mt-12 grid gap-4 lg:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className={plan.id === "pro" ? "ring-2 ring-slate-900" : ""}><CardHeader><CardTitle>{plan.name}</CardTitle><p className="pt-2 text-sm text-slate-500">{plan.description}</p></CardHeader><CardContent><div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800">Price configured centrally by region</div><ul className="mt-5 space-y-2 text-sm text-slate-600">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><Button className="mt-6 w-full" asChild><Link href="/signup">Choose {plan.name}</Link></Button></CardContent></Card>)}</div></main>;
}
