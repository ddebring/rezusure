import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings", robots: { index: false, follow: false } };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Account</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Email</p>
              <p className="mt-2 text-base font-medium text-[var(--foreground)]">Your account email is used to sign in securely.</p>
            </div>
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Privacy</p>
              <p className="mt-2 text-base font-medium text-[var(--foreground)]">Your resumes and analyses remain private to your workspace.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Your resume data is private to your account and protected by secure authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
