"use client";

import { useState, useEffect } from "react";

export type PricingRegion = "IN" | "US" | "EU";

export interface RegionalPricing {
  region: PricingRegion;
  currency: string;
  symbol: string;
  proMonthly: string;
  proAnnual: string;
  proMonthlyValue: number;
}

const pricing: Record<PricingRegion, RegionalPricing> = {
  IN: {
    region: "IN",
    currency: "INR",
    symbol: "₹",
    proMonthly: "INR 1,999",
    proAnnual: "INR 19,990",
    proMonthlyValue: 1999,
  },
  US: {
    region: "US",
    currency: "USD",
    symbol: "$",
    proMonthly: "$29",
    proAnnual: "$290",
    proMonthlyValue: 29,
  },
  EU: {
    region: "EU",
    currency: "EUR",
    symbol: "€",
    proMonthly: "€27",
    proAnnual: "€270",
    proMonthlyValue: 27,
  },
};

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "CH", "GB",
];

function detectRegion(): PricingRegion {
  if (typeof window === "undefined") return "US";

  // Check timezone first — most reliable for India
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";

  // Check locale
  const locale = navigator.language || (navigator as any).userLanguage || "en-US";
  if (locale.startsWith("hi") || locale === "en-IN") return "IN";

  // Check for EU country codes via locale
  const country = locale.split("-")[1]?.toUpperCase() || "";
  if (EU_COUNTRIES.includes(country)) return "EU";

  // Default to US
  return "US";
}

export function useRegionalPricing(): RegionalPricing {
  const [region, setRegion] = useState<PricingRegion>("US");

  useEffect(() => {
    setRegion(detectRegion());
  }, []);

  return pricing[region];
}

/** Format a paise amount (INR) or cents amount (USD/EUR) for display */
export function formatPrice(region: PricingRegion, value: number): string {
  switch (region) {
    case "IN":
      return `INR ${value.toLocaleString("en-IN")}`;
    case "US":
      return `$${value}`;
    case "EU":
      return `€${value}`;
  }
}
