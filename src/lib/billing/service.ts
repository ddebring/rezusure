import type { CountryResolution } from "@/domain/country/types";
import { resolvePaymentCountry } from "@/lib/country/detector";
import { resolvePlanPrice } from "@/lib/billing/catalog";
import { UnconfiguredPaymentProviderAdapter, type PaymentProviderAdapter } from "@/lib/billing/providers";

export function getPaymentProviderAdapter(provider: CountryResolution["paymentProvider"]): PaymentProviderAdapter {
  // Replace with concrete adapters once provider credentials/config are supplied.
  return new UnconfiguredPaymentProviderAdapter(provider);
}

export async function resolveServerCheckoutContext(request: Request, planId: string) {
  const country = await resolvePaymentCountry(request);
  const price = resolvePlanPrice(planId, country);
  if (price.amountMinor === undefined) {
    throw new Error(`Commercial price is not configured for plan ${planId}.`);
  }

  return {
    country,
    price,
    provider: getPaymentProviderAdapter(country.paymentProvider),
  };
}
