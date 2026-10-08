import type { PaymentProvider, PricingRegion, Currency, PlanPrice } from "@/domain/billing/types";

export type Plan = {
  id: "free" | "starter" | "pro" | "career";
  name: string;
  description: string;
  priceUSD: number;
  priceINR: number;
  analyses: number;
  label: string;
  features: string[];
  popular?: boolean;
};

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description:
      "Find out what's holding your resume back before you apply.",
    priceUSD: 0,
    priceINR: 0,
    analyses: 1,
    label: "Free analysis",
    features: [
      "1 resume analysis",
      "Core ATS feedback",
      "Resume score",
      "Key improvement areas",
    ],
  },

  {
    id: "starter",
    name: "Starter",
    description:
      "A focused analysis when you need a clear direction.",
    priceUSD: 3.99,
    priceINR: 349,
    analyses: 10,
    label: "One-time analysis pack",
    features: [
      "10 resume analyses",
      "ATS compatibility feedback",
      "Keyword gap analysis",
      "Section-level recommendations",
    ],
  },

  {
    id: "pro",
    name: "Pro",
    description:
      "Tailor your resume to the jobs that matter.",
    priceUSD: 6.99,
    priceINR: 599,
    analyses: 25,
    label: "One-time analysis pack",
    popular: true,
    features: [
      "25 resume analyses",
      "Advanced ATS analysis",
      "Section-level recommendations",
      "Keyword guidance",
      "Priority improvement insights",
    ],
  },

  {
    id: "career",
    name: "Career",
    description:
      "Keep improving across your entire job search.",
    priceUSD: 9.99,
    priceINR: 849,
    analyses: 50,
    label: "One-time analysis pack",
    features: [
      "50 resume analyses",
      "Advanced recommendations",
      "Multiple resume versions",
      "Expanded analysis history",
      "Priority support",
    ],
  },
];

/**
 * Centralized billing prices.
 *
 * Amounts are stored in the smallest currency unit:
 * INR → paise
 * USD → cents
 *
 * India:
 *   Razorpay + INR
 *
 * International:
 *   Paddle + USD
 */
export const planPrices: PlanPrice[] = [
  // ---------------------------------------------------------------------------
  // FREE
  // ---------------------------------------------------------------------------

  {
    planId: "free",
    currency: "INR",
    amountMinor: 0,
    pricingRegion: "india",
    provider: "razorpay",
  },

  {
    planId: "free",
    currency: "USD",
    amountMinor: 0,
    pricingRegion: "international",
    provider: "paddle",
  },

  // ---------------------------------------------------------------------------
  // STARTER
  // ---------------------------------------------------------------------------

  {
    planId: "starter",
    currency: "INR",
    amountMinor: 34900,
    pricingRegion: "india",
    provider: "razorpay",
  },

  {
    planId: "starter",
    currency: "USD",
    amountMinor: 399,
    pricingRegion: "international",
    provider: "paddle",
  },

  // ---------------------------------------------------------------------------
  // PRO
  // ---------------------------------------------------------------------------

  {
    planId: "pro",
    currency: "INR",
    amountMinor: 59900,
    pricingRegion: "india",
    provider: "razorpay",
  },

  {
    planId: "pro",
    currency: "USD",
    amountMinor: 699,
    pricingRegion: "international",
    provider: "paddle",
  },

  // ---------------------------------------------------------------------------
  // CAREER
  // ---------------------------------------------------------------------------

  {
    planId: "career",
    currency: "INR",
    amountMinor: 84900,
    pricingRegion: "india",
    provider: "razorpay",
  },

  {
    planId: "career",
    currency: "USD",
    amountMinor: 999,
    pricingRegion: "international",
    provider: "paddle",
  },
];