"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { plans } from "@/config/plans";
import { useCountry } from "@/hooks/use-country";

type Currency = "INR" | "USD";

const PRICES = {
  free: {
    INR: 0,
    USD: 0,
  },
  starter: {
    INR: 299,
    USD: 3.99,
  },
  pro: {
    INR: 499,
    USD: 5.99,
  },
  career: {
    INR: 699,
    USD: 7.99,
  },
} as const;

function formatPrice(planId: string, currency: Currency) {
  const price =
    PRICES[planId as keyof typeof PRICES]?.[currency] ?? 0;

  if (currency === "INR") {
    return `₹${price.toLocaleString("en-IN")}`;
  }

  return `$${price.toFixed(2)}`;
}

export function PricingPreview() {
  const { country, ready } = useCountry();

  const [currency, setCurrency] = useState<Currency>("INR");

  useEffect(() => {
    if (!ready) return;

    setCurrency(country === "IN" ? "INR" : "USD");
  }, [country, ready]);

  const isINR = currency === "INR";

  return (
    <section
      id="pricing"
      className="border-t border-black/[0.07] bg-[#f7f3eb] px-6 py-20 sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-[1200px]">

        {/* HEADER */}
        <div className="max-w-[850px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
            Simple plans
          </p>

          <h2 className="mt-4 max-w-[850px] text-[3.3rem] font-semibold leading-[0.94] tracking-[-0.06em] text-[#171412] sm:text-[4.2rem] lg:text-[4.7rem]">
            Get the level of analysis
            <br className="hidden sm:block" />
            you need{" "}
            <span className="font-serif font-normal italic tracking-[-0.04em]">
              when you need it.
            </span>
          </h2>

          <p className="mt-5 max-w-[650px] text-[15px] leading-6 text-black/55 sm:text-base">
            Start with a free analysis. When you need deeper feedback or more
            analyses, choose a one-time pack without committing to another
            monthly subscription.
          </p>
        </div>

        {/* META */}
        <div className="mt-10 flex items-center justify-between gap-5">
          <p className="text-[12px] text-black/50">
            One-time credits. No recurring subscription.
          </p>

          <div
            className="inline-flex shrink-0 items-center rounded-full border border-black/[0.08] bg-white p-1 shadow-sm"
            aria-label="Choose currency"
          >
            <button
              type="button"
              onClick={() => setCurrency("INR")}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                isINR
                  ? "bg-[#c8ff21] text-black"
                  : "text-black/45 hover:text-black"
              }`}
              aria-pressed={isINR}
            >
              ₹ INR
            </button>

            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                !isINR
                  ? "bg-[#c8ff21] text-black"
                  : "text-black/45 hover:text-black"
              }`}
              aria-pressed={!isINR}
            >
              $ USD
            </button>
          </div>
        </div>

        {/* CARDS */}
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const formattedPrice = formatPrice(plan.id, currency);
            const isPopular = plan.id === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative flex min-h-[430px] flex-col overflow-hidden rounded-[18px] border bg-white shadow-[0_8px_25px_rgba(0,0,0,0.035)] ${
                  isPopular
                    ? "border-[#c8ff21]"
                    : "border-black/[0.08]"
                }`}
              >
                {isPopular && (
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-[#c8ff21] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-black">
                      Most popular
                    </span>
                  </div>
                )}

                <CardHeader className="pb-0">
                  <div className={isPopular ? "pr-24" : ""}>
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#171412]">
                      {plan.name}
                    </h3>

                    <p className="mt-3 min-h-[48px] text-[11px] leading-5 text-black/50">
                      {plan.description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col pt-5">
                  <div>
                    <div className="text-[30px] font-semibold leading-none tracking-[-0.05em] text-[#171412]">
                      {formattedPrice}
                    </div>

                    <p className="mt-1 text-[9px] text-black/45">
                      {plan.label}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-[10px] leading-4 text-black/60"
                      >
                        <Check
                          className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#9bc900]"
                          strokeWidth={2}
                        />

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      variant={isPopular ? "primary" : "outline"}
                      className={
                        isPopular
                          ? "!h-9 !w-full !rounded-full !border-0 !bg-[#c8ff21] !text-black !shadow-none hover:!bg-[#b9f000]"
                          : "!h-9 !w-full !rounded-full !border-black/10 !bg-white !text-black hover:!bg-black/[0.025]"
                      }
                    >
                      <Link
                        href={
                          plan.id === "free"
                            ? "/signup"
                            : `/signup?plan=${plan.id}`
                        }
                      >
                        {plan.id === "free"
                          ? "Check my resume"
                          : `Choose ${plan.name}`}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* TRUST NOTE */}
        <div className="mt-6 flex flex-col gap-2 text-[10px] text-black/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            No monthly subscription. Use your credits when you need them.
          </p>

          <p>
            Prices shown in{" "}
            <span className="font-semibold text-black/55">
              {isINR
                ? "Indian Rupees (INR)"
                : "US Dollars (USD)"}
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

export default PricingPreview;