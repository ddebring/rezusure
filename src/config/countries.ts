import type { CountryConfig } from "@/domain/billing/types";

const INDIA: CountryConfig = {
  countryCode: "IN",
  currency: "INR",
  paymentProvider: "razorpay",
  pricingRegion: "india",
};

export const countryCatalog: Record<string, CountryConfig> = {
  IN: INDIA,
  US: { countryCode: "US", currency: "USD", paymentProvider: "paddle", pricingRegion: "international" },
};

export function resolveCountryConfig(countryCode: string): CountryConfig {
  return countryCatalog[countryCode.toUpperCase()] ?? {
    countryCode: countryCode.toUpperCase(),
    currency: "USD",
    paymentProvider: "paddle",
    pricingRegion: "international",
  };
}
