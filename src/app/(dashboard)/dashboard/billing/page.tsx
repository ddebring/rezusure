import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ANALYSIS_PACKS } from "@/config/analysis-packs";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { getUserUsage } from "@/lib/billing/usage";
import { BillingCheckout } from "@/components/billing/BillingCheckout";

export const metadata = { title: "Billing", robots: { index: false, follow: false } };

export default async function BillingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect(`/login?redirect=${encodeURIComponent("/dashboard/billing")}`);
  }

  let uid: string;

  try {
    uid = (await verifyFirebaseSessionCookie(token)).uid;
  } catch {
    redirect(`/login?redirect=${encodeURIComponent("/dashboard/billing")}`);
  }

  const usage = await getUserUsage(uid);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Billing</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">Resume analysis packs</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          One-time purchase. No subscription. Your first analysis is free, and additional packs unlock more opportunities to compare and improve your resume.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Free analysis</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{usage.freeAnalysesRemaining > 0 ? `${usage.freeAnalysesRemaining} remaining` : "Used"}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Paid analyses</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{usage.paidCredits} remaining</p>
            </div>
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Total used</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{usage.totalAnalysesUsed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {ANALYSIS_PACKS.map((pack) => (
          <Card key={pack.id} className="flex h-full flex-col bg-[rgba(255,255,255,0.78)]">
            <CardHeader className="pb-4">
              <div className="flex min-h-[44px] items-start justify-between gap-2">
                <CardTitle className="text-xl">{pack.title}</CardTitle>
                {pack.badge ? (
                  <span className="inline-flex rounded-full bg-[var(--accent)] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">{pack.badge}</span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between pt-0">
              <div>
                <p className="text-4xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">₹{pack.amountMinor / 100}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{pack.description}</p>
              </div>
              <div className="mt-5">
                <BillingCheckout pack={pack} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Your first analysis is free. Additional resume analyses are purchased as one-time packs, and your remaining credits are tracked securely in your account. There is no recurring subscription.
          </p>
          <div className="mt-4 flex gap-3">
            <Button asChild variant="outline">
              <a href="/dashboard">Back to dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
