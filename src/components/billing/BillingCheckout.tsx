"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AnalysisPack } from "@/config/analysis-packs";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayInstance = {
  open: () => void;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
};

export function BillingCheckout({ pack, onSuccess }: { pack: AnalysisPack; onSuccess?: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pack.id }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Unable to start your purchase right now.");
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT;
      script.async = true;

      script.onload = () => {
        const razorpayCtor = (window as RazorpayWindow).Razorpay;

        if (!razorpayCtor) {
          setMessage("Razorpay checkout is not available in this browser session.");
          setIsSubmitting(false);
          return;
        }

        const instance = new razorpayCtor({
          key: payload.keyId,
          amount: payload.amountMinor,
          currency: payload.currency,
          order_id: payload.orderId,
          name: "REZUSURE",
          description: `${pack.credits} resume analyses`,
          handler: async (razorpayResponse: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }) => {
            const verifyResponse = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                packageId: pack.id,
                orderId: razorpayResponse.razorpay_order_id ?? payload.orderId,
                paymentId: razorpayResponse.razorpay_payment_id,
                signature: razorpayResponse.razorpay_signature,
              }),
            });

            const verifyPayload = await verifyResponse.json().catch(() => null);

            if (!verifyResponse.ok) {
              setMessage(verifyPayload?.error ?? "Payment verification failed.");
              setIsSubmitting(false);
              return;
            }

            setMessage(verifyPayload?.message ?? `Payment successful. ${pack.credits} analyses were added to your account.`);
            onSuccess?.();
            router.refresh();
            setIsSubmitting(false);
          },
          prefill: {
            name: "REZUSURE User",
            email: "user@rezusure.app",
          },
          theme: {
            color: "#0f172a",
          },
        });

        instance.open();
        setIsSubmitting(false);
      };

      script.onerror = () => {
        setMessage("Unable to load Razorpay Checkout. Please try again.");
        setIsSubmitting(false);
      };

      document.body.appendChild(script);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout right now.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {message ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      <Button type="button" onClick={() => void handleCheckout()} disabled={isSubmitting} className="mt-4 w-full">
        {isSubmitting ? "Processing..." : pack.cta}
      </Button>
    </>
  );
}
