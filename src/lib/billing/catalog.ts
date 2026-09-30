import { planPrices, plans } from "@/config/plans";
import type { Currency, PaymentProvider, PlanPrice, ResolvedPricingContext } from "@/domain/billing/types";
import type { CountryResolution } from "@/domain/country/types";

export function resolvePlanPrice(planId: string, context: ResolvedPricingContext): PlanPrice {
  const price = planPrices.find(
    (candidate) =>
      candidate.planId === planId &&
      candidate.currency === context.currency &&
      candidate.pricingRegion === context.pricingRegion &&
      candidate.provider === context.paymentProvider
  );
  if (!price) throw new Error(`No price configured for ${planId} in ${context.countryCode}.`);
  return price;
}

export function getPricingContext(country: CountryResolution): ResolvedPricingContext {
  return country;
}

export function getPlans() {
  return plans;
}

export function getPlanPricePreview(planId: string, currency: Currency, provider: PaymentProvider): PlanPrice | undefined {
  return planPrices.find((price) => price.planId === planId && price.currency === currency && price.provider === provider);
}

export function formatMoney(amountMinor: number | undefined, currency: Currency): string {
  if (amountMinor === undefined) return "Pricing configured at launch";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency }).format(amountMinor / 100);
}
