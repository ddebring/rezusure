"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";

export function DashboardHeader({ title }: { title: string }) {
  const { logout } = useAuth();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[rgba(255,255,255,0.82)] px-5 md:px-8">
      <div>
        <h1 className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h1>
        <SignedInEmail />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" asChild>
          <Link href="/dashboard/resumes/new">Analyze a resume</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await logout();
            } catch (e) {
              console.error("Logout click failed:", e);
            }
          }}
          className="cursor-pointer"
          disabled={false}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}

function SignedInEmail() {
  const { user } = useAuth();
  if (!user?.email) return null;
  return <div className="text-sm text-slate-600">{user.email}</div>;
}
