/**
 * Browser-based currency localization.
 * Detects the user's region from navigator.language / Intl and shows
 * prices in their local currency using approximate exchange rates.
 *
 * Since the site is statically exported we cannot use server-side
 * IP geolocation — everything runs client-side.
 */

/* ── Exchange rates relative to 1 INR (April 2026 approx.) ── */
export const FX: Record<
  string,
  { rate: number; symbol: string; locale: string; code: string }
> = {
  INR: { rate: 1, symbol: "₹", locale: "en-IN", code: "INR" },
  USD: { rate: 0.0119, symbol: "$", locale: "en-US", code: "USD" },
  EUR: { rate: 0.0109, symbol: "€", locale: "de-DE", code: "EUR" },
  // Commented out — will enable when we expand to these regions:
  // GBP: { rate: 0.0094, symbol: "£", locale: "en-GB", code: "GBP" },
  // AUD: { rate: 0.0184, symbol: "A$", locale: "en-AU", code: "AUD" },
  // CAD: { rate: 0.0167, symbol: "C$", locale: "en-CA", code: "CAD" },
  // SGD: { rate: 0.016, symbol: "S$", locale: "en-SG", code: "SGD" },
  // AED: { rate: 0.044, symbol: "د.إ", locale: "ar-AE", code: "AED" },
  // BRL: { rate: 0.068, symbol: "R$", locale: "pt-BR", code: "BRL" },
  // JPY: { rate: 1.79, symbol: "¥", locale: "ja-JP", code: "JPY" },
  // KRW: { rate: 16.8, symbol: "₩", locale: "ko-KR", code: "KRW" },
  // ZAR: { rate: 0.22, symbol: "R", locale: "en-ZA", code: "ZAR" },
  // CHF: { rate: 0.01, symbol: "CHF ", locale: "de-CH", code: "CHF" },
};

/** Base Pro price in INR — all currencies derive from this */
export const BASE_PRICE_INR = 999;

/** Map country-code (uppercased) → currency code.
 *  Only EU, IN, and US enabled. Commented entries will be
 *  uncommented when we expand to those regions. */
const COUNTRY_FX: Record<string, string> = {
  /* ── India ── */
  IN: "INR",
  /* ── United States ── */
  US: "USD",
  /* ── Eurozone countries ── */
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  // Commented out — enable when we expand:
  // GB: "GBP",
  // AU: "AUD",
  // CA: "CAD",
  // SG: "SGD",
  // AE: "AED",
  // BR: "BRL",
  // JP: "JPY",
  // KR: "KRW",
  // ZA: "ZAR",
  // CH: "CHF",
};

/** Try to detect currency from browser signals */
export function detectCurrency(): string {
  // navigator.language → country subtag
  const lang = navigator.language; // "en-US", "de-DE", "en-IN", …
  const parts = lang.split("-");
  if (parts.length >= 2) {
    const country = parts[parts.length - 1].toUpperCase();
    if (COUNTRY_FX[country]) return COUNTRY_FX[country];
  }

  // Fallback: Intl resolved locale
  try {
    const nf = new Intl.NumberFormat(undefined, { style: "currency" });
    const locale = nf.resolvedOptions().locale;
    const lp = locale.split("-");
    if (lp.length >= 2) {
      const c = lp[lp.length - 1].toUpperCase();
      if (COUNTRY_FX[c]) return COUNTRY_FX[c];
    }
  } catch {
    /* ignore */
  }

  return "INR";
}

/** Format an INR amount into the detected currency */
export function fmtINR(amountINR: number, curCode?: string): string {
  const cur = curCode ?? detectCurrency();
  const fx = FX[cur] ?? FX.INR;
  if (amountINR === 0) return `${fx.symbol}0`;
  const converted = Math.round(amountINR * fx.rate);
  return `${fx.symbol}${converted.toLocaleString(fx.locale)}`;
}

/** Build a localized "Pro" price string: "$12/month" etc. */
export function proPriceLabel(curCode?: string): string {
  const cur = curCode ?? detectCurrency();
  const fx = FX[cur] ?? FX.INR;
  if (cur === "INR") return "₹999/month";
  const converted = Math.round(999 * fx.rate);
  return `${fx.symbol}${converted.toLocaleString(fx.locale)}/month`;
}
