import type { Plan, PlanPrice } from "@/domain/billing/types";

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Evaluate your resume and see the highest-impact fixes.",
    features: ["Resume analysis", "Core ATS feedback", "Analysis history"],
    limits: { resumeAnalysesPerMonth: 1, resumeUploadsPerMonth: 2 },
  },
  {
    id: "pro",
    name: "Pro",
    description: "Deep optimization for an active job search.",
    features: ["More analyses", "Section-level rewrites", "Keyword guidance", "Priority analysis"],
    limits: { resumeAnalysesPerMonth: 10, resumeUploadsPerMonth: 20 },
  },
  {
    id: "career",
    name: "Career",
    description: "For users actively managing multiple resume versions.",
    features: ["High analysis limits", "Advanced recommendations", "Expanded history", "Priority support"],
    limits: { resumeAnalysesPerMonth: 30, resumeUploadsPerMonth: 50 },
  },
];

// Amounts are deliberately omitted until commercial pricing is finalized.
// The billing domain resolves prices server-side; UI never accepts a client-supplied amount.
export const planPrices: PlanPrice[] = [
  { planId: "free", currency: "INR", pricingRegion: "india", provider: "razorpay" },
  { planId: "pro", currency: "INR", pricingRegion: "india", provider: "razorpay" },
  { planId: "career", currency: "INR", pricingRegion: "india", provider: "razorpay" },
  { planId: "free", currency: "USD", pricingRegion: "international", provider: "paddle" },
  { planId: "pro", currency: "USD", pricingRegion: "international", provider: "paddle" },
  { planId: "career", currency: "USD", pricingRegion: "international", provider: "paddle" },
];
