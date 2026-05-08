"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Check,
  DownloadIcon,
  CloudIcon,
  Heart,
} from "lucide-react";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
} from "@/lib/pricing";
import { useCalculatorContext } from "@/lib/calculator-context";
import { useRegionalPricing } from "@/lib/use-regional-pricing";

function CheckListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]">
      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </li>
  );
}

export function PricingSection() {
  const { teamSize, provider } = useCalculatorContext();

  const pricing = useRegionalPricing();

  const savingsResult = useMemo(
    () => calculateSavings({ teamSize, provider }),
    [teamSize, provider],
  );

  return (
    <section
      id="pricing"
      className="py-16 sm:py-20 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Transparent pricing. No surprises. No lock-in.
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 max-w-2xl mx-auto">
            Two ways to run FeatureSignals. Same platform. Same features. Pick
            what works.
          </p>
        </motion.div>

        {/* Three pricing cards + Self-Hosted */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {/* Free */}
          <PricingCard
            title="Free"
            price="Free"
            period="forever"
            description="For individuals and small teams getting started."
            features={[
              "1 project",
              "2 environments",
              "3 team members",
              "Unlimited feature flags",
              "Unlimited evaluations",
              "AI Janitor: 25 actions/mo",
              "Community support",
              "All 8 SDKs + OpenFeature",
            ]}
            cta={{
              label: "Sign Up Free",
              href: "https://app.featuresignals.com/register",
            }}
            variant="outline"
            delay={0}
          />

          {/* Pro */}
          <PricingCard
            title="Pro"
            price={pricing.proMonthly}
            period="per month"
            description="For growing engineering teams. Unlimited everything."
            features={[
              "Unlimited projects",
              "Unlimited environments",
              "Unlimited team members",
              "Unlimited feature flags",
              "Unlimited evaluations",
              "AI Janitor: 200 actions/mo",
              "RBAC, audit logs, approvals",
              "Webhooks & scheduling",
              "Relay proxy (1 included)",
              "Priority email support",
            ]}
            cta={{
              label: "Start Pro Trial",
              href: "https://app.featuresignals.com/register?plan=pro",
            }}
            variant="featured"
            delay={0.1}
            annualLabel={pricing.proAnnual + "/year (save 17%)"}
          />

          {/* Enterprise */}
          <PricingCard
            title="Enterprise"
            price="Custom"
            period=""
            description="For large teams with custom requirements."
            features={[
              "Everything in Pro",
              "SSO / SAML / OIDC",
              "99.9% SLA with penalties",
              "Dedicated support (4h SLA)",
              "SCIM provisioning",
              "Invoice billing (NET-30)",
              "On-prem deployment support",
              "Custom AI Janitor pools",
            ]}
            cta={{ label: "Contact Sales", href: "/contact?reason=sales" }}
            variant="outline"
            delay={0.2}
          />

          {/* Self-Hosted */}
          <PricingCard
            title="Self-Hosted"
            price="Free"
            period="forever"
            description="Apache 2.0. Run on your infrastructure."
            features={[
              "Full feature parity",
              "Unlimited everything",
              "AI Janitor included",
              "No license fees",
              "No vendor lock-in",
              "Single Go binary",
              "Deploy in 3 minutes",
            ]}
            cta={{
              label: "Deploy Now",
              href: "https://docs.featuresignals.com/getting-started/quickstart",
            }}
            variant="outline"
            delay={0.3}
            badge="100% Open Source"
          />
        </div>

        {/* No lock-in promise */}
        <motion.div
          className="mt-12 text-center max-w-xl mx-auto"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]">
            <Heart size={16} className="text-emerald-500" />
            <p className="text-sm text-[var(--signal-fg-primary)]">
              <span className="font-semibold text-emerald-600">
                No lock-in. Ever.
              </span>{" "}
              Switch between Self-Hosted and Cloud anytime. All SDKs support
              OpenFeature — swap providers without changing code.
            </p>
          </div>
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-4">
            Compare: {savingsResult.competitor.name} at{" "}
            <span className="font-semibold">
              {formatUSD(savingsResult.competitor.monthly)}/month
            </span>{" "}
            for {teamSize} engineers. FeatureSignals Pro:{" "}
            <span className="font-bold text-emerald-600">
              {formatUSD(29)}/month
            </span>
            . That&apos;s{" "}
            <span className="font-bold text-emerald-600">
              {Math.round(
                (1 -
                  pricing.proMonthlyValue / savingsResult.competitor.monthly) *
                  100,
              )}
              % less
            </span>
            .
          </p>

          {/* AI Janitor credit packs info */}
          <p className="text-xs text-[var(--signal-fg-secondary)] mt-4">
            💡 AI Janitor credit packs available on all plans: Starter (50
            credits) INR 249 · Team (250) INR 899 · Scale (1,500) INR 3,999
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function PricingCard({
  title,
  price,
  period,
  description,
  features,
  cta,
  variant,
  delay,
  annualLabel,
  badge,
}: {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  variant: "featured" | "outline";
  delay: number;
  annualLabel?: string;
  badge?: string;
}) {
  const isFeatured = variant === "featured";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col rounded-xl p-6 ${
        isFeatured
          ? "border-2 border-[var(--signal-border-accent-emphasis)] bg-white md:-mt-3 md:mb-3"
          : "border border-[var(--signal-border-default)] bg-white"
      }`}
      style={{
        boxShadow: isFeatured
          ? "var(--signal-shadow-lg)"
          : "var(--signal-shadow-sm)",
      }}
    >
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--signal-bg-accent-emphasis)] text-white shadow-sm">
            <CloudIcon size={12} />
            Most Popular
          </span>
        </div>
      )}
      {badge && !isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)] shadow-sm">
            {badge}
          </span>
        </div>
      )}

      <div className={`mt-1 mb-4 ${isFeatured ? "text-center" : ""}`}>
        <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
          {description}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[var(--signal-fg-primary)]">
            {price}
          </span>
          {period && (
            <span className="text-sm text-[var(--signal-fg-secondary)]">
              /{period}
            </span>
          )}
        </div>
        {annualLabel && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {annualLabel}
          </p>
        )}
      </div>

      <ul className="space-y-2.5 flex-1 mb-5">
        {features.map((f) => (
          <CheckListItem key={f} text={f} />
        ))}
      </ul>

      {cta.href.startsWith("http") || cta.href.startsWith("mailto") ? (
        <a
          href={cta.href}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors w-full text-center ${
            isFeatured
              ? "text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139]"
              : "text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] hover:bg-[#eff2f5] border border-[var(--signal-border-default)]"
          }`}
        >
          {cta.label}
          {cta.href.includes("docs.") && <DownloadIcon size={14} />}
        </a>
      ) : (
        <Link
          href={cta.href}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors w-full text-center ${
            isFeatured
              ? "text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139]"
              : "text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] hover:bg-[#eff2f5] border border-[var(--signal-border-default)]"
          }`}
        >
          {cta.label}
        </Link>
      )}
    </motion.div>
  );
}
