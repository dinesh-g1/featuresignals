"use client";

import { useState, useEffect, useMemo, useId } from "react";
import {
  Calculator,
  Users,
  Building,
  IndianRupee,
  DollarSign,
  ArrowRight,
  ChevronDown,
  Info,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────

/** Exchange rates: 1 unit = X INR */
const EXCHANGE_RATES = {
  USD: 83, // 1 USD = ₹83
  EUR: 90, // 1 EUR = ₹90
  INR: 1,
} as const;

const PRO_MONTHLY_INR = 2649; // ₹2,649/mo
const PRO_ANNUAL_MONTHLY_INR = 1999; // ₹1,999/mo (billed annually)
const PRO_ANNUAL_TOTAL_INR = 23988; // ₹23,988/year

const COMPETITOR_PRICING = {
  launchdarkly: { name: "LaunchDarkly", perSeat: 8.33, currency: "USD" },
  configcat: { name: "ConfigCat", perSeat: 26, currency: "USD" },
  flagsmith: { name: "Flagsmith", flatRate: 45, currency: "USD" },
  unleash: { name: "Unleash", flatRate: 80, currency: "USD" },
} as const;

type CompetitorKey = keyof typeof COMPETITOR_PRICING;
type CurrencyKey = "USD" | "INR" | "EUR";

const CURRENCY_SYMBOLS: Record<CurrencyKey, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
};

const CURRENCY_LOCALES: Record<CurrencyKey, string> = {
  USD: "en-US",
  INR: "en-IN",
  EUR: "de-DE",
};

const FEATURESIGNALS_PRICING = {
  pro: {
    monthly: PRO_MONTHLY_INR,
    annualMonthly: PRO_ANNUAL_MONTHLY_INR,
    annualTotal: PRO_ANNUAL_TOTAL_INR,
    label: "Pro — Unlimited Everything",
  },
  enterprise: {
    label: "Enterprise — Custom pricing",
    contactSales: true,
  },
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert INR to target currency */
function convertFromINR(amountInr: number, to: CurrencyKey): number {
  if (to === "INR") return amountInr;
  return Math.round(amountInr / EXCHANGE_RATES[to]);
}

/** Format a number in the given currency */
function fmtCurrency(amount: number, currency: CurrencyKey): string {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString()}`;
}

function competitorCost(
  key: CompetitorKey,
  teamSize: number,
  currency: CurrencyKey,
): number {
  const c = COMPETITOR_PRICING[key];
  let usd: number;
  if ("perSeat" in c) {
    usd = c.perSeat * teamSize;
  } else {
    usd = c.flatRate!;
  }
  // Convert from USD → INR → target currency
  const inr = Math.round(usd * EXCHANGE_RATES.USD);
  return convertFromINR(inr, currency);
}

function fsMonthlyCost(annual: boolean, currency: CurrencyKey): number {
  const inr = annual
    ? FEATURESIGNALS_PRICING.pro.annualMonthly
    : FEATURESIGNALS_PRICING.pro.monthly;
  return convertFromINR(inr, currency);
}

function calculateSavings(
  competitorAmt: number,
  fsAmt: number,
): { amount: number; pct: number } {
  const saved = competitorAmt - fsAmt;
  const pct =
    competitorAmt > 0
      ? Math.round((saved / competitorAmt) * 100)
      : 0;
  return { amount: saved, pct };
}

// ── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  prefix = "",
  duration = 600,
  className,
}: {
  value: number;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (value === display) return;
    const start = display;
    const delta = value - start;
    const startTime = performance.now();

    let raf: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + delta * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {display.toLocaleString()}
    </span>
  );
}

// ── Bar Chart ───────────────────────────────────────────────────────────────

function ComparisonBars({
  competitorLabel,
  competitorCost,
  fsLabel,
  fsCost,
  currency,
}: {
  competitorLabel: string;
  competitorCost: number;
  fsLabel: string;
  fsCost: number;
  currency: CurrencyKey;
}) {
  const max = Math.max(competitorCost, fsCost, 1);
  const competitorPct = Math.max((competitorCost / max) * 100, 8);
  const fsPct = Math.max((fsCost / max) * 100, 8);

  const fmt = (v: number) => fmtCurrency(v, currency);

  return (
    <div className="mt-6 space-y-4" aria-label="Cost comparison bar chart">
      {/* Competitor bar */}
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-[var(--signal-fg-primary)]">
            {competitorLabel}
          </span>
          <span className="tabular-nums font-semibold text-[var(--signal-fg-secondary)]">
            {fmt(competitorCost)}
          </span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[var(--signal-bg-secondary)]">
          <div
            className="h-full rounded-full bg-[var(--signal-bg-danger-emphasis)]/70 transition-all duration-500"
            style={{ width: `${competitorPct}%` }}
          />
        </div>
      </div>

      {/* FeatureSignals bar */}
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-[var(--signal-fg-primary)]">
            {fsLabel}
          </span>
          <span className="tabular-nums font-semibold text-[var(--signal-fg-success)]">
            {fmt(fsCost)}
          </span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[var(--signal-bg-secondary)]">
          <div
            className="h-full rounded-full bg-[var(--signal-bg-success-emphasis)] transition-all duration-500"
            style={{ width: `${fsPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface PricingCalculatorProps {
  className?: string;
}

export function PricingCalculator({ className }: PricingCalculatorProps) {
  const id = useId();
  const [teamSize, setTeamSize] = useState(50);
  const [competitorKey, setCompetitorKey] =
    useState<CompetitorKey>("launchdarkly");
  const [annual, setAnnual] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");

  const competitor = COMPETITOR_PRICING[competitorKey];

  const compCost = useMemo(
    () => competitorCost(competitorKey, teamSize, currency),
    [competitorKey, teamSize, currency],
  );
  const fsMonthly = useMemo(
    () => fsMonthlyCost(annual, currency),
    [annual, currency],
  );
  const save = useMemo(
    () => calculateSavings(compCost, fsMonthly),
    [compCost, fsMonthly],
  );

  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const fsLabel = annual
    ? "FeatureSignals Pro (annual)"
    : "FeatureSignals Pro (monthly)";

  // Calculate annual totals for display
  const compAnnualTotal = compCost * 12;
  const fsAnnualTotal = annual
    ? convertFromINR(PRO_ANNUAL_TOTAL_INR, currency)
    : fsMonthly * 12;

  return (
    <section
      className={cn(
        "w-full rounded-[var(--radius-xl)] border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)] sm:p-8",
        className,
      )}
      aria-labelledby={`${id}-heading`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
          <Calculator className="h-4 w-4 text-[var(--signal-fg-accent)]" />
        </div>
        <h2
          id={`${id}-heading`}
          className="text-lg font-semibold text-[var(--signal-fg-primary)]"
        >
          Pricing Calculator
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-[var(--signal-fg-secondary)]">
        See how much you&apos;d save with honest, flat-rate pricing.
      </p>

      {/* Controls */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {/* Team size */}
        <div className="space-y-2">
          <label
            htmlFor={`${id}-team-size`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-secondary)]"
          >
            <Users className="h-3.5 w-3.5" />
            Team size
          </label>
          <div className="flex items-center gap-3">
            <input
              id={`${id}-team-size`}
              type="range"
              min={1}
              max={500}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="flex-1"
              aria-valuemin={1}
              aria-valuemax={500}
              aria-valuenow={teamSize}
            />
            <span className="w-12 text-right text-sm font-semibold tabular-nums text-[var(--signal-fg-primary)]">
              {teamSize}
            </span>
          </div>
        </div>

        {/* Competitor selector */}
        <div className="space-y-2">
          <label
            htmlFor={`${id}-competitor`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-secondary)]"
          >
            <Building className="h-3.5 w-3.5" />
            Compare with
          </label>
          <div className="relative">
            <select
              id={`${id}-competitor`}
              value={competitorKey}
              onChange={(e) =>
                setCompetitorKey(e.target.value as CompetitorKey)
              }
              className="w-full appearance-none rounded-[var(--radius-small)] border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] py-2 pl-3 pr-8 text-sm text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-fg-accent)]"
            >
              {Object.entries(COMPETITOR_PRICING).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--signal-fg-tertiary)]" />
          </div>
        </div>

        {/* Annual toggle */}
        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-secondary)]">
            <Percent className="h-3.5 w-3.5" />
            Billing period
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "flex w-full items-center justify-between rounded-[var(--radius-small)] border px-4 py-2.5 text-sm transition-colors",
              annual
                ? "border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                : "border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-accent-muted)]",
            )}
            role="switch"
            aria-checked={annual}
            aria-label="Pay annually"
          >
            <span className="font-medium">
              {annual ? "Annual billing" : "Monthly billing"}
            </span>

          </button>
        </div>
      </div>

      {/* Currency toggle — 3-way segmented */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-[var(--signal-fg-tertiary)]">
          Show in:
        </span>
        <div className="inline-flex items-center rounded border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-0.5">
          {(["USD", "INR", "EUR"] as CurrencyKey[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                currency === c
                  ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
                  : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
              )}
            >
              {c === "USD" && <DollarSign className="h-3 w-3" />}
              {c === "INR" && <IndianRupee className="h-3 w-3" />}
              {c === "EUR" && <span className="text-[11px] font-bold">€</span>}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Savings callout */}
      <div className="mt-6 rounded-[var(--radius-medium)] border border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--signal-fg-success)]">
          You save{" "}
          <AnimatedNumber
            value={save.amount}
            prefix={currencySymbol}
            className="text-xl font-bold text-[var(--signal-fg-success)]"
          />{" "}
          per month vs {competitor.name}
        </p>
        <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
          That&apos;s{" "}
          <span className="font-semibold text-[var(--signal-fg-success)]">
            {save.pct}%
          </span>{" "}
          less than {competitor.name}.
        </p>
      </div>

      {/* Bar chart */}
      <ComparisonBars
        competitorLabel={competitor.name}
        competitorCost={compCost}
        fsLabel={fsLabel}
        fsCost={fsMonthly}
        currency={currency}
      />

      {/* How we calculated this */}
      <div className="mt-6 border-t border-[var(--signal-border-default)] pt-4">
        <button
          onClick={() => setShowMath(!showMath)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors hover:text-[var(--signal-fg-primary)]"
          aria-expanded={showMath}
        >
          <Info className="h-3.5 w-3.5" />
          How we calculated this
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              showMath && "rotate-180",
            )}
          />
        </button>
        {showMath && (
          <div className="mt-3 rounded-[var(--radius-small)] bg-[var(--signal-bg-secondary)] px-4 py-3 text-xs text-[var(--signal-fg-secondary)]">
            <p className="font-medium text-[var(--signal-fg-primary)]">
              The math
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <strong>{competitor.name}:</strong>{" "}
                {"perSeat" in competitor
                  ? `${competitor.perSeat} USD/seat × ${teamSize} ${teamSize === 1 ? "seat" : "seats"} = ${fmtCurrency(compCost, currency)}/mo`
                  : `Flat rate of $${competitor.flatRate} USD/mo = ${fmtCurrency(compCost, currency)}/mo`}
              </li>
              <li>
                <strong>FeatureSignals:</strong>{" "}
                {annual
                  ? `₹${PRO_ANNUAL_TOTAL_INR.toLocaleString("en-IN")}/yr (annual) ≈ ₹${PRO_ANNUAL_MONTHLY_INR.toLocaleString("en-IN")}/mo ≈ ${fmtCurrency(fsMonthly, currency)}/mo`
                  : `₹${PRO_MONTHLY_INR.toLocaleString("en-IN")}/mo flat ≈ ${fmtCurrency(fsMonthly, currency)}/mo`}{" "}
                — unlimited seats, unlimited projects.
              </li>
              <li>
                <strong>Exchange rates:</strong> 1 USD ≈ ₹{EXCHANGE_RATES.USD}, 1 EUR ≈ ₹{EXCHANGE_RATES.EUR}
              </li>
            </ul>
            <p className="mt-3 text-[var(--signal-fg-tertiary)]">
              All prices are based on publicly available pricing pages as of
              January 2026. Actual costs may vary based on contract terms.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="https://app.featuresignals.com/signup"
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-medium)] bg-[var(--signal-bg-accent-emphasis)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-dark)]"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </a>
        <span className="text-xs text-[var(--signal-fg-tertiary)]">
          No credit card required. Free plan includes unlimited flags and seats.
        </span>
      </div>
    </section>
  );
}
