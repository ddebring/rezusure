import type { CountryConfig } from "@/domain/billing/types";

export interface CountryDetectionRequest {
  headers: Headers;
  explicitCountryCode?: string;
}

export interface CountryDetector {
  detect(request: CountryDetectionRequest): Promise<string>;
}

export type CountryResolution = CountryConfig & {
  selectedBy: "automatic" | "explicit";
  source: "cookie" | "trusted-header" | "provider" | "development";
};
