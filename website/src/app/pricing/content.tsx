"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Building2,
  Server,
  Heart,
  HelpCircle,
} from "lucide-react";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { BillingToggle } from "@/components/ui/billing-toggle";
import {
  INR,
  USD,
  getProPrice,
  getFreePrice,
  ENTERPRISE_LABEL,
  convertINR,
  formatCurrency,
  formatMonthlyPrice,
  formatAnnualTotal,
  type CurrencyDef,
} from "@/lib/currency";

/** GitHub logo — inline SVG (no brand icon in lucide-react) */
function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
import { cn } from "@/lib/utils";
import {
  type CompetitorProvider,
  calculateSavings,
  PROVIDER_META,
} from "@/lib/pricing";

/* ==========================================================================
   Constants
   ========================================================================== */

const REGISTER_URL = "https://app.featuresignals.com/register";
const DOCS_QUICKSTART =
  "https://docs.featuresignals.com/getting-started/quickstart";
const CONTACT_SALES = "/contact?reason=sales";

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const fadeUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/* ==========================================================================
   Pricing Tiers Data
   ========================================================================== */

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: { label: string; href: string; external?: boolean };
  highlight?: boolean;
  annualSubtitle?: string;
  icon: React.ReactNode;
}

/** Build tier data dynamically based on selected currency and billing period */
function buildTiers(currency: CurrencyDef, annual: boolean): Tier[] {
  const pro = getProPrice(currency, annual);
  const freePrice = getFreePrice(currency);

  const freePeriod =
    currency.code === "INR" ? "/month forever" : "/month forever";
  const proPeriod = annual ? "/mo (billed annually)" : "/month flat";

  return [
    {
      name: "Free",
      price: freePrice,
      period: freePeriod,
      description:
        "For individuals and small teams getting started. Up to 50 flags. No credit card required.",
      features: [
        "Up to 50 feature flags",
        "1 project, 2 environments, 3 team members",
        "All 8 SDKs + OpenFeature",
        "Community support",
        "Apache 2.0 license",
        "Self-hosted is free forever",
      ],
      cta: { label: "Start Free", href: REGISTER_URL, external: true },
      icon: <Zap size={20} className="text-emerald-500" />,
    },
    {
      name: "Pro",
      price: annual ? pro.annualMonthly : pro.monthly,
      period: proPeriod,
      description: "For growing engineering teams. Unlimited everything.",
      features: [
        "Unlimited projects & environments",
        "Unlimited team members",
        "AI Janitor: stale flag removal",
        "RBAC & audit logs",
        "Webhooks & integrations",
        "Email support",
      ],
      cta: {
        label: "Start Free Trial",
        href: `${REGISTER_URL}?plan=pro`,
        external: true,
      },
      highlight: true,
      annualSubtitle: annual
        ? pro.annualTotal
        : `${pro.annualMonthly} · ${pro.annualTotal}`,
      icon: <Zap size={20} className="text-[var(--signal-fg-accent)]" />,
    },
    {
      name: "Enterprise",
      price: ENTERPRISE_LABEL,
      period: "",
      description: "For large teams with custom requirements.",
      features: [
        "Everything in Pro",
        "SSO (SAML/OIDC) & SCIM",
        "99.9% uptime SLA",
        "Dedicated support engineer",
        "On-prem / air-gapped deployment",
        "Invoice billing (NET-30)",
      ],
      cta: { label: "Talk to Us", href: CONTACT_SALES, external: true },
      icon: <Building2 size={20} className="text-[var(--signal-fg-info)]" />,
    },
  ];
}

/* ==========================================================================
   FAQ Data
   ========================================================================== */

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "What happens if I exceed the Free plan limits?",
    answer:
      "You'll be prompted to upgrade. We never auto-charge you. If you exceed AI Janitor credits on Free, additional actions are queued for the next cycle. If you exceed project or team member limits, we'll reach out and ask you to upgrade — nothing is ever interrupted without warning.",
  },
  {
    question: "Can I self-host the Pro features?",
    answer:
      "Yes. Pro features are available in the self-hosted version under Apache 2.0. The self-hosted binary includes the full feature set — RBAC, audit logs, webhooks, AI Janitor — everything. You only need to bring your own LLM API keys for the AI Janitor. No license fees. No phone-home.",
  },
  {
    question: "What's included in Enterprise?",
    answer:
      "Enterprise includes SSO (SAML/OIDC), SCIM provisioning, a 99.9% uptime SLA with financial penalties, a dedicated support engineer with 4-hour response SLA, on-premises and air-gapped deployment support, invoice billing (NET-30), and custom AI Janitor pools. We'll quote you upfront — typically $150–500/month depending on scale. No hidden fees.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "Annual billing is ₹23,988/year (effectively ₹1,999/month). Same features as monthly. You can switch anytime from billing settings.",
  },
  {
    question: "What currencies do you support?",
    answer:
      "We display pricing in INR (₹), USD ($), and EUR (€). Our base prices are set in INR and converted at transparent exchange rates: 1 USD = ₹83, 1 EUR = ₹90. You can toggle between currencies using the selector at the top of the pricing page. Actual billing happens in INR for Indian customers and USD for international customers.",
  },

  {
    question: "Is there a free trial for Enterprise?",
    answer:
      "Yes. We offer a 30-day pilot with full Enterprise features — SSO, SCIM, dedicated support, SLA, everything. No credit card required. At the end of the pilot, we'll discuss your needs and provide an upfront quote. No obligation to continue.",
  },
  {
    question: "How does the AI Janitor credit system work?",
    answer:
      "AI Janitor actions include stale flag detection scans, automated pull request generation, and flag removal suggestions. Free includes 25 actions/month, Pro includes 200 actions/month, and Enterprise gets custom pools. Credit packs are available on all plans: Starter (50 credits), Team (250), and Scale (1,500). Self-hosted users get unlimited AI Janitor actions since they bring their own LLM keys.",
  },
  {
    question: "Can I switch between Cloud and Self-Hosted?",
    answer:
      "Absolutely. Cloud and Self-Hosted are fully interoperable. Export your data anytime and import it into a self-hosted instance — or vice versa. All SDKs support OpenFeature, so you can swap providers without changing application code. No vendor lock-in, ever.",
  },
  {
    question: "Do you offer discounts for startups or nonprofits?",
    answer:
      "Yes. We offer a 50% discount on Pro for eligible startups (under $5M in funding, fewer than 20 employees) and free Pro plans for registered nonprofits. Contact sales@featuresignals.com to apply. We also offer academic discounts for university research groups.",
  },
  {
    question: "How does migration from LaunchDarkly or other platforms work?",
    answer:
      "FeatureSignals provides an automated migration tool that imports your feature flags, segments, targeting rules, and environments from LaunchDarkly, ConfigCat, Flagsmith, and other platforms. The migration preserves flag keys so your SDK code doesn't need to change. Since FeatureSignals is OpenFeature-native, you can also use the OpenFeature provider to swap providers incrementally. See our migration guide for step-by-step instructions.",
  },
];

/* ==========================================================================
   Helper Components
   ========================================================================== */

function CheckListItem({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-sm",
        muted
          ? "text-[var(--signal-fg-tertiary)]"
          : "text-[var(--signal-fg-primary)]",
      )}
    >
      <Check
        size={16}
        className={cn(
          "mt-0.5 shrink-0",
          muted ? "text-[var(--signal-fg-tertiary)]" : "text-emerald-500",
        )}
      />
      <span>{text}</span>
    </li>
  );
}

/* ==========================================================================
   Section: Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="pricing-hero"
      className="relative py-16 sm:py-24 bg-[var(--signal-bg-primary)] bg-glow-orbs overflow-hidden"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        {/* Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--signal-fg-primary)]"
          {...fadeUp}
        >
          Simple, transparent pricing.
          <br />
          <span className="text-[var(--signal-fg-accent)]">No surprises.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl text-[var(--signal-fg-secondary)] mt-5 max-w-2xl mx-auto"
          {...fadeUpDelayed(0.1)}
        >
          Flat-rate pricing. Unlimited seats. No per-MAU billing. No hidden
          fees. Never.
        </motion.p>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
          {...fadeUpDelayed(0.2)}
        >
          {[
            { icon: <Shield size={14} />, label: "SOC 2" },
            { icon: <Check size={14} />, label: "OpenFeature" },
            { icon: <GithubIcon size={14} />, label: "Apache 2.0" },
            { icon: <Heart size={14} />, label: "No dark patterns" },
          ].map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--signal-bg-success-muted)] text-emerald-700 border border-[var(--signal-border-success-muted)]"
            >
              {badge.icon}
              {badge.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Pricing Tiers
   ========================================================================== */

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isHighlighted = tier.highlight;

  return (
    <motion.div
      {...fadeUpDelayed(index * 0.1)}
      className={cn(
        "relative flex flex-col rounded-xl p-6",
        isHighlighted
          ? "border-2 border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-primary)] md:-mt-2 md:mb-2"
          : "border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]",
      )}
      style={{
        boxShadow: isHighlighted
          ? "var(--signal-shadow-lg)"
          : "var(--signal-shadow-sm)",
      }}
    >
      {/* Pro trial indicator — honest, not a "Most Popular" badge */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]">
            7-day free trial · No credit card
          </span>
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-2.5 mb-3">
        {tier.icon}
        <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
          {tier.name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-5">
        {tier.description}
      </p>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[var(--signal-fg-primary)] tabular-nums">
            {tier.price}
          </span>
          {tier.period && (
            <span className="text-sm text-[var(--signal-fg-secondary)]">
              {tier.period}
            </span>
          )}
        </div>
        {tier.annualSubtitle && (
          <p className="text-xs text-[var(--signal-fg-secondary)] mt-1.5">
            {tier.annualSubtitle}
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {tier.features.map((f) => (
          <CheckListItem key={f} text={f} />
        ))}
      </ul>

      {/* CTA */}
      {tier.cta.external || tier.cta.href.startsWith("mailto") ? (
        <a
          href={tier.cta.href}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 w-full",
            isHighlighted
              ? "h-12 px-8 text-base bg-[var(--signal-bg-success-emphasis)] text-white shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)]"
              : "h-11 px-6 bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
        >
          {tier.cta.label}
          {tier.name === "Enterprise" && <ArrowRight size={14} />}
        </a>
      ) : (
        <Link
          href={tier.cta.href}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 w-full",
            isHighlighted
              ? "h-12 px-8 text-base bg-[var(--signal-bg-success-emphasis)] text-white shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)]"
              : "h-11 px-6 bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
        >
          {tier.cta.label}
        </Link>
      )}

      {/* Free trial note for Pro */}
      {isHighlighted && (
        <p className="text-xs text-center text-[var(--signal-fg-tertiary)] mt-3">
          7-day free trial. No credit card required.
        </p>
      )}
    </motion.div>
  );
}

function PricingTiersSection({
  currency,
  annual,
  onCurrencyChange,
  onAnnualChange,
}: {
  currency: CurrencyDef;
  annual: boolean;
  onCurrencyChange: (c: CurrencyDef) => void;
  onAnnualChange: (a: boolean) => void;
}) {
  const tiers = useMemo(() => buildTiers(currency, annual), [currency, annual]);

  return (
    <section
      id="pricing-tiers"
      className="py-16 sm:py-20 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="tiers-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div className="text-center mb-8" {...fadeUp}>
          <h2
            id="tiers-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Choose your plan
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2 max-w-xl mx-auto">
            Every price is exact. No asterisks. No &ldquo;starting at&rdquo;
            unless it&rsquo;s literally the starting price.
          </p>
        </motion.div>

        {/* Sticky control bar — currency selector + billing toggle */}
        <motion.div
          className="sticky top-0 z-30 flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 py-4 bg-[var(--signal-bg-secondary)]/90 backdrop-blur-sm"
          {...fadeUpDelayed(0.05)}
        >
          <CurrencySelector value={currency} onChange={onCurrencyChange} />
          <BillingToggle annual={annual} onChange={onAnnualChange} />
        </motion.div>

        {/* 3-column pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>

        {/* Self-Hosted banner — prominent, separate */}
        <motion.div className="mt-8 max-w-4xl mx-auto" {...fadeUpDelayed(0.35)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] shadow-[var(--signal-shadow-sm)]">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--signal-bg-info-muted)] flex items-center justify-center">
              <Server size={20} className="text-[var(--signal-fg-info)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[var(--signal-fg-primary)]">
                Self-Hosted — Free Forever
              </h3>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                Apache 2.0 license. Full feature parity. Single Go binary.
                Deploy in 3 minutes. No license fees, no phone-home, no limits.
              </p>
            </div>
            <a
              href={DOCS_QUICKSTART}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[var(--signal-fg-info)] bg-[var(--signal-bg-info-muted)] hover:bg-[#ede0ff] transition-colors shrink-0"
            >
              <GithubIcon size={14} />
              Deploy Now
            </a>
          </div>
        </motion.div>

        {/* No lock-in promise */}
        <motion.div
          className="mt-10 text-center max-w-xl mx-auto"
          {...fadeUpDelayed(0.45)}
        >
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]">
            <Heart size={16} className="text-emerald-500" />
            <p className="text-sm text-[var(--signal-fg-primary)]">
              <span className="font-semibold text-emerald-600">
                No dark patterns. Open source core. No vendor lock-in.
              </span>{" "}
              Switch between Cloud and Self-Hosted anytime. Export your data.
              Leave anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Enterprise Transparency
   ========================================================================== */

function EnterpriseTransparencySection() {
  return (
    <section
      id="enterprise-transparency"
      className="py-12 sm:py-16 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="enterprise-transparency-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-6 max-w-3xl mx-auto"
          {...fadeUp}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--signal-bg-info-muted)] flex items-center justify-center">
              <Building2 size={20} className="text-[var(--signal-fg-info)]" />
            </div>
            <div>
              <h3
                id="enterprise-transparency-heading"
                className="text-base font-bold text-[var(--signal-fg-primary)]"
              >
                Enterprise pricing transparency
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 leading-relaxed">
                We tell you the price upfront. Typically $150–500/month
                depending on scale, SSO requirements, and deployment model. No
                &ldquo;call for pricing&rdquo; games — we quote within one
                business day. Enterprise includes SSO (SAML/OIDC), SCIM
                provisioning, 99.9% uptime SLA, dedicated support engineer, and
                on-prem / air-gapped deployment options.{" "}
                <Link
                  href={CONTACT_SALES}
                  className="text-[var(--signal-fg-accent)] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  Talk to us
                  <ArrowRight size={14} />
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Cost Comparison Calculator
   ========================================================================== */

function CostComparisonCalculator({
  currency,
  annual,
}: {
  currency: CurrencyDef;
  annual: boolean;
}) {
  const [teamSize, setTeamSize] = useState(50);
  const [provider, setProvider] = useState<CompetitorProvider>("launchdarkly");

  const savingsResult = useMemo(
    () => calculateSavings({ teamSize, provider, currency, annual }),
    [teamSize, provider, currency, annual],
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTeamSize(Number(e.target.value));
    },
    [],
  );

  const savingsPercentFormatted =
    savingsResult.savings.percent > 0
      ? `${savingsResult.savings.percent}%`
      : "0%";

  return (
    <section
      id="cost-comparison"
      className="py-16 sm:py-20 bg-[var(--signal-bg-primary)]"
      aria-labelledby="comparison-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <motion.div className="text-center mb-10" {...fadeUp}>
          <h2
            id="comparison-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            See how much you&rsquo;d save
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2">
            Honest comparison against real competitor pricing — updated
            regularly.
          </p>
        </motion.div>

        {/* Calculator card */}
        <motion.div
          className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 sm:p-8 shadow-[var(--signal-shadow-md)]"
          {...fadeUpDelayed(0.1)}
        >
          {/* Team size slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="team-size-slider"
                className="text-sm font-semibold text-[var(--signal-fg-primary)]"
              >
                Team size
              </label>
              <span className="text-sm font-bold text-[var(--signal-fg-accent)] tabular-nums">
                {teamSize} engineers
              </span>
            </div>
            <input
              id="team-size-slider"
              type="range"
              min={5}
              max={500}
              step={5}
              value={teamSize}
              onChange={handleSliderChange}
              className="w-full"
              aria-label={`Team size: ${teamSize} engineers`}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[var(--signal-fg-tertiary)]">
                5
              </span>
              <span className="text-xs text-[var(--signal-fg-tertiary)]">
                500
              </span>
            </div>
          </div>

          {/* Competitor selector */}
          <div className="mb-6">
            <label
              htmlFor="competitor-select"
              className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-2"
            >
              Compare against
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PROVIDER_META) as CompetitorProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
                    provider === p
                      ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] shadow-[var(--signal-shadow-xs)]"
                      : "border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)]",
                  )}
                >
                  {PROVIDER_META[p].name}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="rounded-lg bg-[var(--signal-bg-secondary)] p-5 border border-[var(--signal-border-subtle)]">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-[var(--signal-fg-tertiary)] mb-1">
                  FeatureSignals Pro{annual ? " (annual)" : ""}
                </p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(
                    savingsResult.featureSignals.monthly,
                    currency,
                  )}
                  <span className="text-sm font-normal text-emerald-600">
                    /mo
                  </span>
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                  {formatCurrency(
                    savingsResult.featureSignals.annual,
                    currency,
                  )}
                  /year
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--signal-fg-tertiary)] mb-1">
                  {savingsResult.competitor.name}
                </p>
                <p className="text-2xl font-bold text-[var(--signal-fg-primary)] tabular-nums">
                  {formatCurrency(savingsResult.competitor.monthly, currency)}
                  <span className="text-sm font-normal text-[var(--signal-fg-secondary)]">
                    /mo
                  </span>
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                  {formatCurrency(savingsResult.competitor.annual, currency)}
                  /year
                </p>
              </div>
            </div>

            {/* Savings highlight */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <ArrowRight size={14} className="text-white -rotate-45" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Save{" "}
                  <span className="tabular-nums">
                    {formatCurrency(savingsResult.savings.annual, currency)}
                  </span>
                  /year ({savingsPercentFormatted})
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {savingsResult.formula}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-[var(--signal-fg-tertiary)] mt-4 text-center">
            Based on publicly available pricing as of January 2026. We update
            this regularly. If you find an error,{" "}
            <a
              href="mailto:sales@featuresignals.com"
              className="text-[var(--signal-fg-accent)] hover:underline"
            >
              let us know
            </a>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Trust & Transparency
   ========================================================================== */

const trustPrinciples = [
  {
    icon: <Users size={22} />,
    title: "No per-seat pricing",
    description:
      "Your bill shouldn't grow just because your team does. Pro is $32/month flat — whether you have 5 engineers or 500.",
  },
  {
    icon: <Zap size={22} />,
    title: "No MAU-based billing",
    description:
      "We don't penalize you for having successful products. Unlimited evaluations. Unlimited feature flags. No overages.",
  },
  {
    icon: <GithubIcon size={22} />,
    title: "Open source core",
    description:
      "The core feature flag engine is Apache 2.0. Free forever. Auditable. Forkable. No proprietary lock-in.",
  },
  {
    icon: <Server size={22} />,
    title: "Self-host without limits",
    description:
      "Run it on your own infrastructure. Same features. No phone-home. No license fees. Single Go binary, deploy in 3 minutes.",
  },
  {
    icon: <Shield size={22} />,
    title: "No vendor lock-in",
    description:
      "OpenFeature native. Export your data anytime. Leave anytime. All SDKs support OpenFeature — swap providers without changing code.",
  },
];

function TrustSection() {
  return (
    <section
      id="trust"
      className="py-16 sm:py-20 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-5xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="trust-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Why our pricing is different
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2 max-w-xl mx-auto">
            Feature flag infrastructure should be transparent, fair, and
            predictable. Here&rsquo;s how we&rsquo;re different.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trustPrinciples.map((principle, i) => (
            <motion.div
              key={principle.title}
              className="flex gap-4 p-5 rounded-xl bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] shadow-[var(--signal-shadow-sm)]"
              {...fadeUpDelayed(0.1 + i * 0.08)}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--signal-bg-accent-muted)] flex items-center justify-center">
                <span className="text-[var(--signal-fg-accent)]">
                  {principle.icon}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--signal-fg-primary)] mb-1">
                  {principle.title}
                </h3>
                <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                  {principle.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: FAQ
   ========================================================================== */

function FaqAccordion() {
  return (
    <Accordion.Root type="single" collapsible className="max-w-3xl mx-auto">
      {faqItems.map((item, i) => (
        <Accordion.Item
          key={i}
          value={`faq-${i}`}
          className="mb-3 last:mb-0 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)] overflow-hidden"
        >
          <Accordion.Header asChild>
            <Accordion.Trigger className="flex items-center justify-between w-full px-5 py-4 text-left text-sm font-semibold text-[var(--signal-fg-primary)] hover:text-[var(--signal-fg-accent)] transition-colors group cursor-pointer">
              <span className="pr-4">{item.question}</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-[var(--signal-fg-secondary)] transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <p className="px-5 pb-5 text-[var(--signal-fg-secondary)] leading-relaxed text-sm">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function FaqSection() {
  return (
    <section
      id="faq"
      className="py-16 sm:py-20 bg-[var(--signal-bg-primary)]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <motion.div className="text-center mb-10" {...fadeUp}>
          <div className="inline-flex items-center gap-2 mb-4">
            <HelpCircle size={24} className="text-[var(--signal-fg-accent)]" />
          </div>
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Frequently asked questions
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2">
            Honest answers. No marketing spin.
          </p>
        </motion.div>

        <motion.div {...fadeUpDelayed(0.15)}>
          <FaqAccordion />
        </motion.div>

        {/* Still have questions? */}
        <motion.div className="mt-10 text-center" {...fadeUpDelayed(0.3)}>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-3">
            Still have questions?
          </p>
          <Link
            href={CONTACT_SALES}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)] hover:bg-[#ccebff] transition-colors"
          >
            <ChevronRight size={14} />
            Contact Sales
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Final CTA
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="relative py-20 sm:py-28 overflow-hidden bg-gradient-mesh-dark"
      aria-labelledby="final-cta-heading"
    >
      {/* Dotted overlay */}
      <div
        className="absolute inset-0 bg-dots-dark pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <h2
            id="final-cta-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4"
          >
            Start free. No credit card. No time limit.
          </h2>
          <p className="text-lg mb-10 text-white/60">
            Or compare us against your current provider below.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          {...fadeUpDelayed(0.1)}
        >
          <a
            href={REGISTER_URL}
            className="inline-flex items-center justify-center gap-2 h-12 px-8 text-base font-semibold rounded-lg bg-[var(--signal-bg-success-emphasis)] text-white shadow-[var(--signal-shadow-md)] hover:opacity-90 transition-all"
          >
            Start Free
            <ArrowRight size={16} />
          </a>
          <a
            href="#cost-comparison"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 text-base font-semibold rounded-lg text-white border border-white/50 hover:border-white/60 hover:bg-white/10 transition-all"
          >
            Compare vs Your Current Provider
            <ChevronRight size={16} />
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          {...fadeUpDelayed(0.2)}
        >
          {[
            { icon: <GithubIcon size={12} />, label: "Apache 2.0" },
            { icon: <Shield size={12} />, label: "SOC 2" },
            { icon: <Check size={12} />, label: "OpenFeature" },
            { icon: <Server size={12} />, label: "Self-Hosted Free" },
          ].map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/30"
            >
              {badge.icon}
              {badge.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Main Export
   ========================================================================== */

export function PricingPageContent() {
  const [currency, setCurrency] = useState<CurrencyDef>(USD);
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <HeroSection />
      <PricingTiersSection
        currency={currency}
        annual={annual}
        onCurrencyChange={setCurrency}
        onAnnualChange={setAnnual}
      />
      <EnterpriseTransparencySection />
      <CostComparisonCalculator currency={currency} annual={annual} />
      <TrustSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
