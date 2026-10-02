"use client";

import { useEffect, useState } from "react";

export type SupportedCountry = "IN" | "US" | "OTHER";
export type Currency = "INR" | "USD";

interface CountryState {
  country: SupportedCountry;
  currency: Currency;
  ready: boolean;
}

function detectCountry(): SupportedCountry {
  if (typeof window === "undefined") {
    return "IN";
  }

  const language =
    navigator.language ||
    (navigator.languages && navigator.languages[0]) ||
    "";

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  const normalizedLanguage = language.toLowerCase();

  if (
    normalizedLanguage.includes("-in") ||
    normalizedLanguage === "hi" ||
    normalizedLanguage.startsWith("hi-") ||
    timezone === "Asia/Kolkata" ||
    timezone === "Asia/Calcutta"
  ) {
    return "IN";
  }

  if (
    normalizedLanguage.includes("-us") ||
    timezone.startsWith("America/")
  ) {
    return "US";
  }

  return "OTHER";
}

export function useCountry(): CountryState {
  const [state, setState] = useState<CountryState>({
    country: "IN",
    currency: "INR",
    ready: false,
  });

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(
      "rezusure-currency"
    ) as Currency | null;

    if (savedCurrency === "INR" || savedCurrency === "USD") {
      setState({
        country: detectCountry(),
        currency: savedCurrency,
        ready: true,
      });

      return;
    }

    const country = detectCountry();

    setState({
      country,
      currency: country === "IN" ? "INR" : "USD",
      ready: true,
    });
  }, []);

  return state;
}

export function saveCurrency(currency: Currency) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("rezusure-currency", currency);
}