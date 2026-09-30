import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/config/plans";

export function PricingPreview() {
  return <div className="mt-12 grid gap-4 lg:grid-cols-3">{plans.map((plan) => <Card key={plan.id}><CardHeader><CardTitle>{plan.name}</CardTitle><p className="pt-2 text-sm text-slate-500">{plan.description}</p></CardHeader><CardContent><p className="mb-5 text-sm font-semibold text-slate-900">Pricing is centrally configured and resolved by country on the server.</p><ul className="space-y-2 text-sm text-slate-600">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><Button className="mt-6 w-full" variant={plan.id === "pro" ? "default" : "outline"} asChild><Link href="/pricing">View pricing</Link></Button></CardContent></Card>)}</div>;
}
