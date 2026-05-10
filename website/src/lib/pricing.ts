/**
 * FeatureSignals Pricing Calculation Engine
 *
 * Computes real-time cost comparisons against competitors using verified pricing data
 * from product/wiki/private/COMPETITIVE.md and product/wiki/private/BUSINESS.md.
 */

import {
  USD,
  BASE_PRICES,
  convertINR,
  formatMonthlyPrice,
  type CurrencyDef,
} from "./currency";

export type CompetitorProvider =
  | "launchdarkly"
  | "configcat"
  | "flagsmith"
  | "unleash";

export interface CalculatorState {
  teamSize: number; // 5–500
  provider: CompetitorProvider;
  currency?: CurrencyDef;
  annual?: boolean;
}

export interface SavingsResult {
  competitor: { name: string; monthly: number; annual: number };
  featureSignals: { monthly: number; annual: number };
  savings: { annual: number; percent: number };
  formula: string;
}

/** Per-seat monthly pricing for each competitor (in USD) */
const COMPETITOR_RATES: Record<
  CompetitorProvider,
  {
    name: string;
    perSeat: number; // USD per seat per month
    baseFee: number; // flat monthly base fee (if any)
  }
> = {
  launchdarkly: {
    name: "LaunchDarkly",
    perSeat: 8.33,
    baseFee: 0, // Pure per-seat after starter
  },
  configcat: {
    name: "ConfigCat",
    perSeat: 26,
    baseFee: 0,
  },
  flagsmith: {
    name: "Flagsmith",
    perSeat: 20,
    baseFee: 45,
  },
  unleash: {
    name: "Unleash",
    perSeat: 15,
    baseFee: 80,
  },
};

/**
 * Calculate cost comparison between FeatureSignals and a competitor.
 *
 * Competitor pricing is defined in USD (industry standard). FeatureSignals
 * pricing originates in INR. All results are converted to the target currency.
 */
export function calculateSavings(state: CalculatorState): SavingsResult {
  const { teamSize, provider, currency = USD, annual = false } = state;
  const rate = COMPETITOR_RATES[provider];

  // Competitor costs (in USD)
  const competitorMonthlyUsd = rate.baseFee + rate.perSeat * teamSize;
  const competitorAnnualUsd = competitorMonthlyUsd * 12;

  // Convert competitor costs from USD to target currency
  // First convert USD → INR, then INR → target currency
  const competitorMonthlyInr = Math.round(
    competitorMonthlyUsd * USD.exchangeRate,
  );
  const competitorAnnualInr = Math.round(
    competitorAnnualUsd * USD.exchangeRate,
  );
  const competitorMonthly = convertINR(competitorMonthlyInr, currency);
  const competitorAnnual = convertINR(competitorAnnualInr, currency);

  // FeatureSignals costs (from INR base)
  const proPrice = BASE_PRICES.pro;
  const fsMonthlyInr = annual ? proPrice.annualMonthly : proPrice.monthly;
  const fsAnnualInr = annual ? proPrice.annualTotal : proPrice.monthly * 12;
  const fsMonthly = convertINR(fsMonthlyInr, currency);
  const fsAnnual = convertINR(fsAnnualInr, currency);

  const savingsAnnual = competitorAnnual - fsAnnual;
  const savingsPercent =
    competitorAnnual > 0
      ? Math.round((savingsAnnual / competitorAnnual) * 1000) / 10
      : 0;

  // Build formula string
  const fsLabel =
    currency.code === "INR"
      ? `₹${fsMonthlyInr.toLocaleString("en-IN")}/mo flat`
      : `${formatMonthlyPrice(fsMonthly, currency)} flat`;

  const formula =
    provider === "launchdarkly"
      ? `${rate.name}: $${rate.perSeat}/seat × ${teamSize} engineers = ${formatMonthlyPrice(competitorMonthly, currency)} · FeatureSignals: ${fsLabel} — unlimited seats`
      : `${rate.name}: $${rate.baseFee}/mo base + $${rate.perSeat}/seat × ${teamSize} engineers = ${formatMonthlyPrice(competitorMonthly, currency)} · FeatureSignals: ${fsLabel} — unlimited seats`;

  return {
    competitor: {
      name: rate.name,
      monthly: competitorMonthly,
      annual: competitorAnnual,
    },
    featureSignals: {
      monthly: fsMonthly,
      annual: fsAnnual,
    },
    savings: {
      annual: savingsAnnual,
      percent: savingsPercent,
    },
    formula,
  };
}

/** Format currency for display (backward compatible) */
export function formatUSD(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Provider metadata for UI display */
export const PROVIDER_META: Record<
  CompetitorProvider,
  { name: string; logoColor: string }
> = {
  launchdarkly: { name: "LaunchDarkly", logoColor: "#7b2d8e" },
  configcat: { name: "ConfigCat", logoColor: "#f27023" },
  flagsmith: { name: "Flagsmith", logoColor: "#1a73e8" },
  unleash: { name: "Unleash", logoColor: "#3366cc" },
};
