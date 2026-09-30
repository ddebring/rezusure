export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled";
export type EntitlementKey = "resumeAnalyses" | "resumeStorage" | "history" | "advancedRecommendations";

export interface UsageRecord {
  ownerId: string;
  periodKey: string;
  resumeAnalysesUsed: number;
  resumeUploadsUsed: number;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  ownerId: string;
  planId: string;
  provider: "razorpay" | "paddle";
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}
