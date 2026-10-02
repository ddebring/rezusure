"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth/AuthProvider";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
});

export default function LoginPage() {
  const router = useRouter();

  const {
    loginWithEmail,
    loginWithGoogle,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [redirectTo] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const params = new URLSearchParams(window.location.search);

    return params.get("redirect") ?? "/dashboard";
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  /*
   * Loading state
   */
  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.82)] p-8 text-center shadow-[0_20px_40px_rgba(23,20,18,0.08)]">

          {/* Full REZUSURE logo */}
          <div className="mx-auto mb-6 flex justify-center">
            <Logo />
          </div>

          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            REZUSURE
          </p>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Loading your workspace…
          </h1>
        </div>
      </div>
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const parsed = loginSchema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please check your details and try again."
      );

      return;
    }

    try {
      setIsSubmitting(true);

      await loginWithEmail(
        parsed.data.email,
        parsed.data.password
      );

      router.replace(redirectTo);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to log in right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");

    try {
      setIsSubmitting(true);

      await loginWithGoogle();

      router.replace(redirectTo);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Google sign-in failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-[0_20px_40px_rgba(23,20,18,0.08)]">

      {/* ====================================================== */}
      {/* HEADER                                                 */}
      {/* ====================================================== */}

      <CardHeader>
        <p className="eyebrow">
          Welcome back
        </p>

        <CardTitle className="mt-2 text-3xl tracking-[-0.05em]">
          Log in
        </CardTitle>

        <CardDescription>
          Continue to your REZUSURE account.
        </CardDescription>
      </CardHeader>

      {/* ====================================================== */}
      {/* CONTENT                                                 */}
      {/* ====================================================== */}

      <CardContent>

        {/* Google */}
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={() => void handleGoogleLogin()}
            disabled={isSubmitting || isLoading}
          >
            Continue with Google
          </Button>
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          <span className="h-px flex-1 bg-[var(--border)]" />

          or continue with email

          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* ================================================== */}
        {/* EMAIL LOGIN                                        */}
        {/* ================================================== */}

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-[var(--foreground)]"
              htmlFor="email"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="w-full rounded-[12px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-[var(--foreground)]"
              htmlFor="password"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="w-full rounded-[12px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="••••••••"
            />
          </div>

          {/* Error */}
          {error ? (
            <p className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? "Signing in..." : "Log in"}
          </Button>
        </form>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <Link
            className="font-medium text-[var(--foreground)]"
            href="/signup"
          >
            Create an account
          </Link>

          <Link
            className="text-[var(--muted-foreground)]"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}