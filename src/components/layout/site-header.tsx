"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Logo } from "../logo";

export function SiteHeader() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  return (
    <header className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.82)] backdrop-blur-sm">


<div className="container-shell flex h-16 items-center justify-between gap-3">
  <Logo />

  {/* rest of header */}

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Main navigation"
        >
          <Link
            className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            href="/#how-it-works"
          >
            How it works
          </Link>

          <Link
            className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            href="/#resume-checker"
          >
            Resume Checker
          </Link>

          <Link
            className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            href="/#pricing"
          >
            Pricing
          </Link>

          <Link
            className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            href="/#faq"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>

              {user?.email ? (
                <span className="hidden text-sm text-[var(--muted-foreground)] md:inline">
                  {user.email}
                </span>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.error("Logout click failed:", e);
                  }
                }}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>

              <Button size="sm" asChild>
                <Link href="/signup">
                  Get started <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}