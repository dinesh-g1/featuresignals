/**
 * FeatureSignals Pricing Calculation Engine
 *
 * Computes real-time cost comparisons against competitors using verified pricing data
 * from product/wiki/private/COMPETITIVE.md and product/wiki/private/BUSINESS.md.
 */

export type CompetitorProvider =
  | "launchdarkly"
  | "configcat"
  | "flagsmith"
  | "unleash";

export interface CalculatorState {
  teamSize: number; // 5–500
  provider: CompetitorProvider;
}

export interface SavingsResult {
  competitor: { name: string; monthly: number; annual: number };
  featureSignals: { monthly: number; annual: number };
  savings: { annual: number; percent: number };
  formula: string;
}

/** Per-seat monthly pricing for each competitor */
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

/** FeatureSignals Pro: flat ₹999/month (~$12 USD) */
const FS_MONTHLY_USD = 12; // ₹999 ≈ $12
const FS_MONTHLY_INR = 999;

export function calculateSavings(state: CalculatorState): SavingsResult {
  const { teamSize, provider } = state;
  const rate = COMPETITOR_RATES[provider];

  const competitorMonthly = rate.baseFee + rate.perSeat * teamSize;
  const competitorAnnual = competitorMonthly * 12;
  const fsMonthly = FS_MONTHLY_USD;
  const fsAnnual = fsMonthly * 12;
  const savingsAnnual = competitorAnnual - fsAnnual;
  const savingsPercent =
    competitorAnnual > 0
      ? Math.round((savingsAnnual / competitorAnnual) * 1000) / 10
      : 0;

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
    formula:
      provider === "launchdarkly"
        ? `${rate.name}: $${rate.perSeat}/seat × ${teamSize} engineers = $${competitorMonthly.toLocaleString()}/month`
        : `${rate.name}: $${rate.baseFee}/mo base + $${rate.perSeat}/seat × ${teamSize} engineers = $${competitorMonthly.toLocaleString()}/month`,
  };
}

/** Format currency for display */
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
