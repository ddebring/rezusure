"use client";

import Link from "next/link";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { firebaseAuth } from "@/lib/firebase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);

      await sendPasswordResetEmail(
        firebaseAuth,
        normalizedEmail
      );

      setMessage(
        "If an account exists for this email, you’ll receive a password reset link shortly."
      );
    } catch (submitError) {
      console.error("Password reset error:", submitError);

      // Keep the response generic so we don't reveal
      // whether an email is registered.
      setMessage(
        "If an account exists for this email, you’ll receive a password reset link shortly."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-[0_20px_40px_rgba(23,20,18,0.08)]">
      <CardHeader>
        <p className="eyebrow">Account recovery</p>

        <CardTitle className="mt-2 text-3xl tracking-[-0.05em]">
          Reset your password
        </CardTitle>

        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Enter the email address associated with your REZUSURE account and
          we&apos;ll send you a secure password reset link.
        </p>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              placeholder="you@example.com"
              required
              className="w-full rounded-[12px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {message ? (
            <p className="rounded-[12px] border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-[var(--foreground)]">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Remember your password?{" "}
          <Link
            className="font-medium text-[var(--foreground)]"
            href="/login"
          >
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}