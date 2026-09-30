export type Currency = "INR" | "USD";
export type PaymentProvider = "razorpay" | "paddle";
export type PricingRegion = "india" | "international";
export type CountryCode = string;

export interface CountryConfig {
  countryCode: CountryCode;
  currency: Currency;
  paymentProvider: PaymentProvider;
  pricingRegion: PricingRegion;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: Record<string, number | null>;
}

export interface PlanPrice {
  planId: string;
  currency: Currency;
  amountMinor?: number;
  countryCode?: CountryCode;
  pricingRegion: PricingRegion;
  provider: PaymentProvider;
}

export interface ResolvedPricingContext extends CountryConfig {
  selectedBy: "automatic" | "explicit";
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

export interface PaymentRecord {
  id: string;
  ownerId: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  providerOrderId?: string;
  planId: string;
  currency: Currency;
  amountMinor: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: PaymentProvider;
  providerEventId: string;
  receivedAt: string;
  processedAt?: string;
  status: "received" | "processed" | "failed";
  resultCode?: string;
}
