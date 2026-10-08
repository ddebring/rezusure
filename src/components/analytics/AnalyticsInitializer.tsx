"use client";

import { useEffect } from "react";

import { getFirebaseAnalytics } from "@/lib/analytics";

export function AnalyticsInitializer() {
  useEffect(() => {
    void getFirebaseAnalytics();
  }, []);

  return null;
}