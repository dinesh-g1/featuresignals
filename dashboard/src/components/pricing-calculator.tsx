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

const INR_TO_USD = 83;

const COMPETITOR_PRICING = {
  launchdarkly: { name: "LaunchDarkly", perSeat: 8.33, currency: "USD" },
  configcat: { name: "ConfigCat", perSeat: 26, currency: "USD" },
  flagsmith: { name: "Flagsmith", flatRate: 45, currency: "USD" },
  unleash: { name: "Unleash", flatRate: 80, currency: "USD" },
} as const;

type CompetitorKey = keyof typeof COMPETITOR_PRICING;

const FEATURESIGNALS_PRICING = {
  pro: {
    monthly: 1999,
    annual: 19190,
    currency: "INR",
    label: "Pro — Unlimited Everything",
  },
  enterprise: {
    label: "Enterprise — Custom pricing",
    contactSales: true,
  },
} as const;

const _ANNUAL_DISCOUNT = 0.2; // 20% off annual

// ── Helpers ─────────────────────────────────────────────────────────────────

function competitorCost(
  key: CompetitorKey,
  teamSize: number,
): { usd: number; inr: number } {
  const c = COMPETITOR_PRICING[key];
  let usd: number;
  if ("perSeat" in c) {
    usd = c.perSeat * teamSize;
  } else {
    usd = c.flatRate!;
  }
  return { usd, inr: Math.round(usd * INR_TO_USD) };
}

function fsCost(annual: boolean): { inr: number; usd: number } {
  const inr = annual
    ? FEATURESIGNALS_PRICING.pro.annual
    : FEATURESIGNALS_PRICING.pro.monthly;
  return { inr, usd: Math.round(inr / INR_TO_USD) };
}

function savings(
  competitorCostUsd: number,
  fsCostUsd: number,
): { usd: number; pct: number } {
  const saved = competitorCostUsd - fsCostUsd;
  const pct =
    competitorCostUsd > 0 ? Math.round((saved / competitorCostUsd) * 100) : 0;
  return { usd: saved, pct };
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
  currency: "USD" | "INR";
}) {
  const max = Math.max(competitorCost, fsCost, 1);
  const competitorPct = Math.max((competitorCost / max) * 100, 8);
  const fsPct = Math.max((fsCost / max) * 100, 8);

  const fmt = (v: number) =>
    currency === "USD" ? `$${v.toLocaleString()}` : `₹${v.toLocaleString()}`;

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
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");

  const competitor = COMPETITOR_PRICING[competitorKey];
  const compCost = useMemo(
    () => competitorCost(competitorKey, teamSize),
    [competitorKey, teamSize],
  );
  const fs = useMemo(() => fsCost(annual), [annual]);
  const save = useMemo(
    () => savings(compCost.usd, fs.usd),
    [compCost.usd, fs.usd],
  );

  // Display costs in selected currency
  const displayCompCost = currency === "INR" ? compCost.inr : compCost.usd;
  const displayFsCost = currency === "INR" ? fs.inr : fs.usd;
  const displaySavings =
    currency === "INR" ? Math.round(save.usd * INR_TO_USD) : save.usd;
  const currencySymbol = currency === "USD" ? "$" : "₹";

  const fsLabel = annual
    ? "FeatureSignals Pro (annual)"
    : "FeatureSignals Pro (monthly)";

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
            aria-label="Pay annually, save 20%"
          >
            <span className="font-medium">
              {annual ? "Annual billing" : "Monthly billing"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                annual
                  ? "bg-[var(--signal-bg-success-emphasis)] text-white"
                  : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
              )}
            >
              {annual ? "Save 20%" : "Save 20%?"}
            </span>
          </button>
        </div>
      </div>

      {/* Currency toggle */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-[var(--signal-fg-tertiary)]">
          Show in:
        </span>
        <button
          onClick={() => setCurrency("USD")}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
            currency === "USD"
              ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
              : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
        >
          <DollarSign className="h-3 w-3" />
          USD
        </button>
        <button
          onClick={() => setCurrency("INR")}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
            currency === "INR"
              ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
              : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
        >
          <IndianRupee className="h-3 w-3" />
          INR
        </button>
      </div>

      {/* Savings callout */}
      <div className="mt-6 rounded-[var(--radius-medium)] border border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--signal-fg-success)]">
          You save{" "}
          <AnimatedNumber
            value={displaySavings}
            prefix={currencySymbol}
            className="text-xl font-bold text-[var(--signal-fg-success)]"
          />{" "}
          per month vs {competitor.name}
        </p>
        <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
          {annual
            ? "Annual billing saves an extra 20%."
            : "Switch to annual billing and save an additional 20%."}{" "}
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
        competitorCost={displayCompCost}
        fsLabel={fsLabel}
        fsCost={displayFsCost}
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
                  ? `${competitor.perSeat} USD/seat × ${teamSize} ${teamSize === 1 ? "seat" : "seats"} = $${compCost.usd.toLocaleString()} USD/mo`
                  : `Flat rate of $${competitor.flatRate} USD/mo`}
              </li>
              <li>
                <strong>FeatureSignals:</strong>{" "}
                {annual
                  ? `₹19,190/yr (annual) ≈ ₹${Math.round(FEATURESIGNALS_PRICING.pro.annual / 12).toLocaleString()}/mo ≈ $${fs.usd.toLocaleString()} USD/mo`
                  : `₹1,999/mo flat ≈ $${fs.usd.toLocaleString()} USD/mo`}{" "}
                — unlimited seats, unlimited projects.
              </li>
              <li>
                <strong>Currency conversion:</strong> 1 USD ≈ ₹{INR_TO_USD}
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
