"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Check, Minus, ArrowRight, Crown, IndianRupee, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

// ── Multi-Currency Constants ────────────────────────────────────────────────

const EXCHANGE_RATES = {
  USD: 83, // 1 USD = ₹83
  EUR: 90, // 1 EUR = ₹90
  INR: 1,
} as const;

const PRO_MONTHLY_INR = 2649;
const PRO_ANNUAL_MONTHLY_INR = 1999;
const PRO_ANNUAL_TOTAL_INR = 23988;

type CurrencyKey = "USD" | "INR" | "EUR";

const CURRENCY_SYMBOLS: Record<CurrencyKey, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
};

function convertFromINR(amountInr: number, to: CurrencyKey): number {
  if (to === "INR") return amountInr;
  return Math.round(amountInr / EXCHANGE_RATES[to]);
}

function fmtPrice(amountInr: number, currency: CurrencyKey): string {
  const converted = convertFromINR(amountInr, currency);
  if (currency === "INR") {
    return `₹${converted.toLocaleString("en-IN")}`;
  }
  return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString()}`;
}

function fmtMonthly(amountInr: number, currency: CurrencyKey): string {
  return `${fmtPrice(amountInr, currency)}/mo`;
}

// ── Plan Feature Definitions ────────────────────────────────────────────────

interface FeatureRow {
  feature: string;
  community: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
  category?: string;
}

const FEATURES: FeatureRow[] = [
  // Flag Types
  {
    feature: "Boolean flags",
    community: true,
    pro: true,
    enterprise: true,
    category: "Flag Types",
  },
  {
    feature: "All 5 flag types",
    community: true,
    pro: true,
    enterprise: true,
    category: "Flag Types",
  },
  {
    feature: "Unlimited flags",
    community: true,
    pro: true,
    enterprise: true,
    category: "Flag Types",
  },

  // Team & Projects
  {
    feature: "Unlimited seats",
    community: true,
    pro: true,
    enterprise: true,
    category: "Team & Projects",
  },
  {
    feature: "Unlimited projects",
    community: true,
    pro: true,
    enterprise: true,
    category: "Team & Projects",
  },
  {
    feature: "3 environments",
    community: true,
    pro: "Unlimited",
    enterprise: "Unlimited",
    category: "Team & Projects",
  },

  // Core Targeting
  {
    feature: "Targeting rules",
    community: true,
    pro: true,
    enterprise: true,
    category: "Targeting",
  },
  {
    feature: "Segments",
    community: true,
    pro: true,
    enterprise: true,
    category: "Targeting",
  },
  {
    feature: "Percentage rollouts",
    community: true,
    pro: true,
    enterprise: true,
    category: "Targeting",
  },
  {
    feature: "Prerequisite flags",
    community: true,
    pro: true,
    enterprise: true,
    category: "Targeting",
  },

  // Advanced Features
  {
    feature: "A/B experimentation",
    community: false,
    pro: true,
    enterprise: true,
    category: "Advanced",
  },
  {
    feature: "Approval workflows",
    community: false,
    pro: true,
    enterprise: true,
    category: "Advanced",
  },
  {
    feature: "Webhooks",
    community: false,
    pro: true,
    enterprise: true,
    category: "Advanced",
  },
  {
    feature: "Flag scheduling",
    community: false,
    pro: true,
    enterprise: true,
    category: "Advanced",
  },
  {
    feature: "Audit logs (30 days)",
    community: false,
    pro: true,
    enterprise: true,
    category: "Advanced",
  },

  // Enterprise
  {
    feature: "Audit logs (1 year)",
    community: false,
    pro: false,
    enterprise: true,
    category: "Enterprise",
  },
  {
    feature: "SSO/SAML",
    community: false,
    pro: false,
    enterprise: true,
    category: "Enterprise",
  },
  {
    feature: "Priority support",
    community: false,
    pro: false,
    enterprise: true,
    category: "Enterprise",
  },
  {
    feature: "Self-hosted deployment",
    community: false,
    pro: false,
    enterprise: true,
    category: "Enterprise",
  },
];

const CATEGORIES = Array.from(new Set(FEATURES.map((f) => f.category!)));

// ── Plan Metadata Builder ───────────────────────────────────────────────────

function buildPlans(currency: CurrencyKey) {
  return {
    community: {
      name: "Community",
      tagline: "Free",
      price: "Free forever",
      cta: "Start Free",
      href: "https://app.featuresignals.com/signup",
      highlight: false,
    },
    pro: {
      name: "Pro",
      tagline: fmtMonthly(PRO_MONTHLY_INR, currency),
      price: `Annual: ${fmtMonthly(PRO_ANNUAL_MONTHLY_INR, currency)} (${fmtPrice(PRO_ANNUAL_TOTAL_INR, currency)}/yr)`,
      cta: "Upgrade to Pro",
      href: "/settings/billing",
      highlight: true,
    },
    enterprise: {
      name: "Enterprise",
      tagline: "Custom pricing",
      price: "Starting at ~$150/mo",
      cta: "Talk to us",
      href: "mailto:sales@featuresignals.com",
      highlight: false,
    },
  } as const;
}

type PlanKey = keyof ReturnType<typeof buildPlans>;

// ── Rendering Helpers ───────────────────────────────────────────────────────

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <Check
        className="h-4 w-4 text-[var(--signal-fg-success)]"
        aria-label="Included"
      />
    );
  }
  if (value === false) {
    return (
      <Minus
        className="h-4 w-4 text-[var(--signal-fg-tertiary)]"
        aria-label="Not included"
      />
    );
  }
  return (
    <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
      {value}
    </span>
  );
}

// ── Currency Selector ───────────────────────────────────────────────────────

function MiniCurrencySelector({
  value,
  onChange,
}: {
  value: CurrencyKey;
  onChange: (c: CurrencyKey) => void;
}) {
  return (
    <div className="inline-flex items-center rounded border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-0.5">
      {(["INR", "USD", "EUR"] as CurrencyKey[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            value === c
              ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
              : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
          )}
          aria-label={`Show prices in ${c}`}
        >
          {c === "USD" && <DollarSign className="h-3 w-3" />}
          {c === "INR" && <IndianRupee className="h-3 w-3" />}
          {c === "EUR" && <span className="text-[11px] font-bold">€</span>}
          {c}
        </button>
      ))}
    </div>
  );
}

// ── Mobile Card ─────────────────────────────────────────────────────────────

function MobilePlanCard({
  planKey,
  plans,
  isCurrentPlan,
}: {
  planKey: PlanKey;
  plans: ReturnType<typeof buildPlans>;
  isCurrentPlan: boolean;
}) {
  const plan = plans[planKey];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-5",
        plan.highlight
          ? "border-[var(--signal-border-accent-emphasis)] ring-2 ring-[var(--signal-border-accent-emphasis)]"
          : "border-[var(--signal-border-default)]",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
            {plan.name}
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            {plan.tagline}
          </p>
        </div>
        {isCurrentPlan && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-accent-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--signal-fg-accent)]">
            <Crown className="h-3 w-3" />
            Current
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--signal-fg-tertiary)]">
        {plan.price}
      </p>

      {/* Feature list */}
      <ul className="mt-4 space-y-2.5">
        {FEATURES.map((f) => (
          <li key={f.feature} className="flex items-center gap-2.5 text-sm">
            <FeatureCell value={f[planKey]} />
            <span className="text-[var(--signal-fg-primary)]">{f.feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={plan.href}
        className={cn(
          "mt-5 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-medium)] px-4 py-2.5 text-sm font-semibold transition-colors",
          plan.highlight
            ? "bg-[var(--signal-bg-accent-emphasis)] text-white hover:bg-[var(--color-accent-dark)]"
            : "border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
        )}
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

// ── Desktop Table ───────────────────────────────────────────────────────────

function DesktopTable({
  currentPlan,
  plans,
}: {
  currentPlan: PlanKey | null;
  plans: ReturnType<typeof buildPlans>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--signal-border-default)]">
            <th className="sticky left-0 bg-[var(--signal-bg-primary)] py-3 pr-4 text-sm font-semibold text-[var(--signal-fg-primary)]">
              Feature
            </th>
            {Object.entries(plans).map(([key, plan]) => (
              <th
                key={key}
                className={cn(
                  "px-4 py-3 text-center text-sm font-semibold",
                  plan.highlight && "text-[var(--signal-fg-accent)]",
                  !plan.highlight && "text-[var(--signal-fg-primary)]",
                )}
              >
                <div>{plan.name}</div>
                <div className="mt-0.5 text-xs font-normal text-[var(--signal-fg-secondary)]">
                  {plan.tagline}
                </div>
                {currentPlan === key && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal-fg-accent)]">
                    <Crown className="h-2.5 w-2.5" />
                    Current plan
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => (
            <React.Fragment key={category}>
              {/* Category header */}
              <tr>
                <td
                  colSpan={4}
                  className="bg-[var(--signal-bg-secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]"
                >
                  {category}
                </td>
              </tr>
              {FEATURES.filter((f) => f.category === category).map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-[var(--signal-border-subtle)] transition-colors hover:bg-[var(--signal-bg-secondary)]/50"
                >
                  <td className="py-2.5 pr-4 text-sm text-[var(--signal-fg-primary)]">
                    {row.feature}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex justify-center">
                      <FeatureCell value={row.community} />
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex justify-center">
                      <FeatureCell value={row.pro} />
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex justify-center">
                      <FeatureCell value={row.enterprise} />
                    </span>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface PlanComparisonProps {
  className?: string;
}

export function PlanComparison({ className }: PlanComparisonProps) {
  const id = useId();
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const plans = React.useMemo(() => buildPlans(currency), [currency]);

  const organization = useAppStore((s) => s.organization);
  const currentPlan: PlanKey | null =
    organization?.plan === "pro"
      ? "pro"
      : organization?.plan === "enterprise"
        ? "enterprise"
        : organization?.plan === "free" || organization?.plan === "trial"
          ? "community"
          : null;

  return (
    <section
      className={cn("w-full", className)}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-8 text-center">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-bold text-[var(--signal-fg-primary)]"
        >
          Honest, transparent pricing
        </h2>
        <p className="mt-2 text-sm text-[var(--signal-fg-secondary)]">
          Every plan includes unlimited flags and unlimited seats. No per-seat
          surprises.
        </p>
        {/* Mini currency selector */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-[var(--signal-fg-tertiary)]">
            Currency:
          </span>
          <MiniCurrencySelector value={currency} onChange={setCurrency} />
        </div>
      </div>

      {/* Desktop: table layout */}
      <div className="hidden lg:block">
        <DesktopTable currentPlan={currentPlan} plans={plans} />
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-4 lg:hidden">
        {Object.keys(plans).map((key) => (
          <MobilePlanCard
            key={key}
            planKey={key as PlanKey}
            plans={plans}
            isCurrentPlan={currentPlan === key}
          />
        ))}
      </div>

      {/* Bottom CTAs */}
      <div className="mt-8 flex flex-col items-center gap-2 border-t border-[var(--signal-border-default)] pt-6 sm:flex-row sm:justify-center sm:gap-4">
        {!currentPlan || currentPlan === "community" ? (
          <>
            <a
              href="https://app.featuresignals.com/signup"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] bg-[var(--signal-bg-accent-emphasis)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-dark)]"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] border border-[var(--signal-border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--signal-fg-primary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
            >
              Upgrade to Pro <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : currentPlan === "pro" ? (
          <p className="text-sm text-[var(--signal-fg-success)] font-medium">
            You&apos;re on the Pro plan — unlimited everything.
          </p>
        ) : (
          <p className="text-sm text-[var(--signal-fg-success)] font-medium">
            You&apos;re on the Enterprise plan with full access.
          </p>
        )}

        {currentPlan && (
          <p className="text-xs text-[var(--signal-fg-tertiary)]">
            Need something else?{" "}
            <a
              href="mailto:sales@featuresignals.com"
              className="text-[var(--signal-fg-accent)] underline underline-offset-2 hover:text-[var(--color-accent-dark)]"
            >
              Talk to us
            </a>
          </p>
        )}
      </div>

      {/* Honesty note */}
      <p className="mt-6 text-center text-xs text-[var(--signal-fg-tertiary)]">
        Enterprise pricing is transparent — starting at ~$150/mo. We never hide
        behind &quot;Contact Sales&quot; to inflate prices.
      </p>
    </section>
  );
}
