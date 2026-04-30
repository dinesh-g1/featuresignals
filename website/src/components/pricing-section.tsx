"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckIcon,
  StarFillIcon,
  ArrowRightIcon,
} from "@primer/octicons-react";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
  formatINR,
} from "@/lib/pricing";
import { useCalculatorContext } from "@/lib/calculator-context";

interface PricingTier {
  name: string;
  price: string;
  priceSub: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Developer",
    price: "Free",
    priceSub: "Forever",
    description: "Everything you need to start feature flagging like a pro.",
    features: [
      "Unlimited MAUs",
      "3 seats",
      "1 project",
      "2 environments",
      "8 SDKs",
      "Community support",
    ],
    cta: "Start Building",
    ctaHref: "https://app.featuresignals.com/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: formatINR(999),
    priceSub: "/month",
    description: "For growing teams that need power and automation.",
    features: [
      "Everything in Developer",
      "Unlimited seats",
      "Unlimited projects",
      "AI Janitor — auto cleanup",
      "A/B tests & experiments",
      "RBAC + Audit logs",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaHref: "https://app.featuresignals.com/upgrade",
    highlighted: true,
    badge: "Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceSub: "",
    description: "Dedicated infrastructure with air-gapped deployment options.",
    features: [
      "Everything in Pro",
      "Dedicated VPS",
      "Air-gapped deployment",
      "SAML SSO + SCIM",
      "4-hour support SLA",
      "Custom integrations",
      "On-premise available",
    ],
    cta: "Talk to Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

function CheckListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-[var(--fgColor-default)]">
      <CheckIcon
        size={16}
        fill="var(--fgColor-success)"
        className="mt-0.5 shrink-0"
      />
      <span>{text}</span>
    </li>
  );
}

export function PricingSection() {
  const { teamSize, provider } = useCalculatorContext();

  const savingsResult = useMemo(
    () => calculateSavings({ teamSize, provider }),
    [teamSize, provider],
  );

  return (
    <section
      id="pricing"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
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
            className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Pay for infrastructure. Not your success.
          </h2>
          <p className="text-lg text-[var(--fgColor-muted)] mt-3 max-w-2xl mx-auto">
            Unlimited feature flags. Unlimited seats. Sub-millisecond evaluation.
            Flat pricing that doesn&apos;t penalize growth.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`relative rounded-xl border bg-white p-6 flex flex-col ${
                tier.highlighted
                  ? "md:-mt-1 border-[var(--borderColor-accent-emphasis)]"
                  : "border-[var(--borderColor-default)]"
              }`}
              style={{
                boxShadow: tier.highlighted
                  ? "var(--shadow-floating-medium)"
                  : "var(--shadow-resting-small)",
                transform: tier.highlighted ? "translateY(-4px)" : undefined,
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bgColor-accent-emphasis)] text-white">
                    <StarFillIcon size={12} />
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Name & price */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
                  {tier.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[var(--fgColor-default)]">
                    {tier.price}
                  </span>
                  {tier.priceSub && (
                    <span className="text-sm text-[var(--fgColor-muted)]">
                      {tier.priceSub}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--fgColor-muted)] mt-1">
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-6">
                {tier.features.map((feature) => (
                  <CheckListItem key={feature} text={feature} />
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.ctaHref}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 w-full ${
                  tier.highlighted
                    ? "text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935]"
                    : "text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)]"
                }`}
                style={{
                  boxShadow: tier.highlighted
                    ? "0 1px 0 0 #1f232826"
                    : "0 1px 0 0 #1f23280a",
                }}
              >
                {tier.cta}
                {tier.highlighted && <ArrowRightIcon size={16} />}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Personalized savings line */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm text-[var(--fgColor-muted)]">
            Your savings ({teamSize} engineers):{" "}
            <span className="font-bold text-[var(--fgColor-success)]">
              {formatUSD(savingsResult.competitor.monthly)}/month → {formatINR(999)}/month
            </span>
          </p>
          <p className="text-sm font-semibold text-[var(--fgColor-success)] mt-1">
            That&apos;s {savingsResult.savings.percent}% less than{" "}
            {savingsResult.competitor.name}.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
