/**
 * FeatureSignals Multi-Currency Pricing Engine
 *
 * Single source of truth for all currency operations. All base prices are
 * defined in INR (the company's primary currency) and converted to USD/EUR
 * using exchange rates that are periodically reviewed.
 */

/* ==========================================================================
   Currency Definitions
   ========================================================================== */

export interface CurrencyDef {
  code: string;
  symbol: string;
  locale: string;
  exchangeRate: number; // 1 unit of this currency = X INR
}

/** INR is the base currency — all prices originate here */
export const INR: CurrencyDef = {
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
  exchangeRate: 1,
};

export const USD: CurrencyDef = {
  code: "USD",
  symbol: "$",
  locale: "en-US",
  exchangeRate: 83, // 1 USD ≈ ₹83
};

export const EUR: CurrencyDef = {
  code: "EUR",
  symbol: "€",
  locale: "de-DE",
  exchangeRate: 90, // 1 EUR = ₹90
};

export const CURRENCIES: Record<string, CurrencyDef> = {
  INR,
  USD,
  EUR,
};

export const CURRENCY_LIST: CurrencyDef[] = [INR, USD, EUR];

export type CurrencyCode = "INR" | "USD" | "EUR";

/* ==========================================================================
   Base Prices (INR — source of truth)
   ========================================================================== */

export const BASE_PRICES = {
  free: {
    monthly: 0,
    annualMonthly: 0,
    annualTotal: 0,
  },
  pro: {
    monthly: 2649, // ₹2,649/mo ($32)
    annualMonthly: 1999, // ₹1,999/mo (billed annually)
    annualTotal: 23988, // ₹23,988/year
  },
  enterprise: {
    monthly: null, // Custom pricing
    annualMonthly: null,
    annualTotal: null,
  },
} as const;

/* ==========================================================================
   Conversion
   ========================================================================== */

/** Convert an INR amount to another currency */
export function convertINR(amountInr: number, to: CurrencyDef): number {
  if (to.code === "INR") return amountInr;
  return Math.round(amountInr / to.exchangeRate);
}

/** Convert any currency amount back to INR */
export function convertToINR(amount: number, from: CurrencyDef): number {
  if (from.code === "INR") return amount;
  return Math.round(amount * from.exchangeRate);
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/** Format a raw number as a currency string (e.g., "$32", "₹2,649", "€22") */
export function formatCurrency(amount: number, currency: CurrencyDef): string {
  // For INR, use compact Indian numbering
  if (currency.code === "INR") {
    return `${currency.symbol}${amount.toLocaleString("en-IN")}`;
  }
  // For USD/EUR, use standard formatting
  return `${currency.symbol}${amount.toLocaleString()}`;
}

/** Format a monthly price (e.g., "₹1,999/mo", "$24/mo") */
export function formatMonthlyPrice(
  amount: number,
  currency: CurrencyDef,
): string {
  return `${formatCurrency(amount, currency)}/mo`;
}

/** Format an annual total price (e.g., "₹17,988/year", "$216/year") */
export function formatAnnualTotal(
  amount: number,
  currency: CurrencyDef,
): string {
  return `${formatCurrency(amount, currency)}/year`;
}

/* ==========================================================================
   Pro Plan Price Getters
   ========================================================================== */

export interface ProPriceDisplay {
  /** Monthly price in the target currency (e.g., 24 for USD) */
  monthlyAmount: number;
  /** Annual per-month price in the target currency (e.g., 18 for USD) */
  annualMonthlyAmount: number;
  /** Annual total price in the target currency (e.g., 216 for USD) */
  annualTotalAmount: number;
  /** Formatted monthly: "$24/mo" */
  monthly: string;
  /** Formatted annual per-month: "$18/mo" */
  annualMonthly: string;
  /** Formatted annual total: "$216/year" */
  annualTotal: string;
}

/** Get Pro plan prices in the specified currency for monthly or annual billing */
export function getProPrice(
  currency: CurrencyDef,
  annual: boolean,
): ProPriceDisplay {
  const pro = BASE_PRICES.pro;
  const monthlyAmount = convertINR(pro.monthly, currency);
  const annualMonthlyAmount = convertINR(pro.annualMonthly, currency);
  const annualTotalAmount = convertINR(pro.annualTotal, currency);

  return {
    monthlyAmount,
    annualMonthlyAmount,
    annualTotalAmount,
    monthly: formatMonthlyPrice(monthlyAmount, currency),
    annualMonthly: formatMonthlyPrice(annualMonthlyAmount, currency),
    annualTotal: formatAnnualTotal(annualTotalAmount, currency),
  };
}

/** Get the Free plan display price */
export function getFreePrice(currency: CurrencyDef): string {
  return `${currency.symbol}0`;
}

/* ==========================================================================
   Enterprise
   ========================================================================== */

export const ENTERPRISE_LABEL = "Custom";
