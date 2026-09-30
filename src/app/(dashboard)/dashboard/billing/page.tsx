import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Billing", robots: { index: false, follow: false } };
export default function BillingPage() { return <div className="space-y-6"><div><h2 className="text-2xl font-semibold">Billing</h2><p className="mt-1 text-sm text-slate-500">Subscriptions and payment history, backed by provider-neutral domain records.</p></div><Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Current plan</CardTitle><Badge variant="outline">Not connected</Badge></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-500">India uses Razorpay; international checkout uses Paddle. The server will resolve the provider and amount from the country-aware pricing context.</p></CardContent></Card></div>; }
