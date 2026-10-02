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
import { useAuth } from "@/lib/auth/AuthProvider";

const signupSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long."),
    confirmPassword: z
      .string()
      .min(8, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const router = useRouter();

  const {
    signupWithEmail,
    loginWithGoogle,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const parsed = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please check the details and try again."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await signupWithEmail(
        parsed.data.email,
        parsed.data.password
      );

      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create your account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");

    try {
      setIsSubmitting(true);

      await loginWithGoogle();

      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Google sign-up failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-[0_20px_40px_rgba(23,20,18,0.08)]">
      <CardHeader>
        <p className="eyebrow">Create your account</p>

        <CardTitle className="mt-2 text-3xl tracking-[-0.05em]">
          Get started
        </CardTitle>

        <CardDescription>
          Build a stronger resume strategy with smarter, clearer
          feedback.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Google signup */}
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={() => void handleGoogleSignup()}
            disabled={isSubmitting || isLoading}
          >
            Continue with Google
          </Button>
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          <span className="h-px flex-1 bg-[var(--border)]" />

          <span>or sign up with email</span>

          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Signup form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              onChange={(event) => setEmail(event.target.value)}
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[12px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Create a password"
            />
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-[var(--foreground)]"
              htmlFor="confirmPassword"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              className="w-full rounded-[12px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Repeat your password"
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
            {isSubmitting
              ? "Creating account..."
              : "Create account"}
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Already have an account?{" "}
          <Link
            className="font-medium text-[var(--foreground)]"
            href="/login"
          >
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}