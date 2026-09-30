import type { PaymentProvider } from "@/domain/billing/types";

export interface CheckoutRequest {
  userId: string;
  planId: string;
  currency: "INR" | "USD";
  amountMinor: number;
}

export interface CheckoutSession {
  provider: PaymentProvider;
  checkoutUrl?: string;
  referenceId: string;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): Promise<boolean>;
}

/** Development adapter: proves application wiring without pretending to charge a card. */
export class UnconfiguredPaymentProviderAdapter implements PaymentProviderAdapter {
  constructor(public readonly provider: PaymentProvider) {}

  async createCheckout(): Promise<CheckoutSession> {
    throw new Error(`${this.provider} is not configured. Configure the provider adapter before enabling checkout.`);
  }

  async verifyWebhook(): Promise<boolean> {
    return false;
  }
}
