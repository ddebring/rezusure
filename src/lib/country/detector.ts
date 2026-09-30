import { getServerEnv } from "@/lib/env/server";
import type { CountryDetectionRequest, CountryDetector, CountryResolution } from "@/domain/country/types";
import { resolveCountryConfig } from "@/config/countries";

const COUNTRY_COOKIE = "rezusure-country";
const TRUSTED_COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "x-country"];
const TRUSTED_IP_HEADERS = ["x-vercel-forwarded-for", "cf-connecting-ip", "x-forwarded-for", "x-real-ip"];

class DefaultCountryDetector implements CountryDetector {
  async detect(request: CountryDetectionRequest): Promise<string> {
    const env = getServerEnv();
    if (env.COUNTRY_DETECTION_MODE === "development") return env.DEV_COUNTRY.toUpperCase();

    for (const header of TRUSTED_COUNTRY_HEADERS) {
      const value = request.headers.get(header);
      if (value && /^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
    }

    if (env.COUNTRY_DETECTION_MODE === "provider" && env.COUNTRY_GEOIP_URL) {
      const rawIp = TRUSTED_IP_HEADERS.map((header) => request.headers.get(header)).find(Boolean);
      const clientIp = rawIp?.split(",")[0]?.trim();
      const providerUrl = env.COUNTRY_GEOIP_URL.replace("{ip}", encodeURIComponent(clientIp ?? ""));
      const response = await fetch(providerUrl, {
        headers: env.COUNTRY_GEOIP_API_KEY ? { Authorization: `Bearer ${env.COUNTRY_GEOIP_API_KEY}` } : undefined,
        cache: "no-store",
      });
      if (response.ok) {
        const payload: unknown = await response.json();
        if (typeof payload === "object" && payload !== null && "countryCode" in payload) {
          const code = payload.countryCode;
          if (typeof code === "string" && /^[A-Za-z]{2}$/.test(code)) return code.toUpperCase();
        }
      }
    }

    throw new Error("Server-side country detection is not configured or did not return a country.");
  }
}

async function detectTrustedCountry(request: Request): Promise<CountryResolution> {
  const env = getServerEnv();
  const code = await new DefaultCountryDetector().detect({ headers: request.headers });
  const source = env.COUNTRY_DETECTION_MODE === "development" ? "development" : env.COUNTRY_DETECTION_MODE === "provider" ? "provider" : "trusted-header";
  return { ...resolveCountryConfig(code), selectedBy: "automatic", source };
}

export async function resolveCountry(request: Request): Promise<CountryResolution> {
  const cookieValue = request.headers.get("cookie")?.match(new RegExp(`${COUNTRY_COOKIE}=([^;]+)`))?.[1];

  if (cookieValue && /^[A-Za-z]{2}$/.test(cookieValue)) {
    return { ...resolveCountryConfig(cookieValue), selectedBy: "explicit", source: "cookie" };
  }

  return detectTrustedCountry(request);
}

// Checkout must call this function instead of resolveCountry(). The explicit
// display-country cookie is intentionally ignored for payment eligibility,
// provider selection, and currency validation.
export async function resolvePaymentCountry(request: Request): Promise<CountryResolution> {
  return detectTrustedCountry(request);
}

export { COUNTRY_COOKIE };
