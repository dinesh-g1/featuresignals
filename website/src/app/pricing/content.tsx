"use client";

import { Fragment, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import {
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  HeartIcon,
  DownloadIcon,
  ShieldCheckIcon,
  RocketIcon,
  QuestionIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Constants
   ========================================================================== */

const REGISTER_URL = "https://app.featuresignals.com/register";
const DOCS_QUICKSTART = "/docs/getting-started/quickstart";
const SALES_EMAIL = "/contact?reason=sales";
const ANNUAL_DISCOUNT_PCT = 17;

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const fadeUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
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
  badge?: string;
  annualLabel?: string;
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals and small teams getting started.",
    features: [
      "1 project, 2 environments, 3 team members",
      "Unlimited feature flags & evaluations",
      "AI Janitor: 25 actions/month",
      "Community support",
      "All 8 SDKs + OpenFeature",
    ],
    cta: { label: "Start Free", href: REGISTER_URL, external: true },
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month flat",
    description: "For growing engineering teams.",
    features: [
      "Unlimited projects, environments, team members",
      "AI Janitor: 200 actions/month",
      "RBAC, audit logs, approvals",
      "Webhooks & scheduling",
      "Relay proxy (1 included)",
      "Priority email support",
    ],
    cta: {
      label: "Start Pro Trial",
      href: `${REGISTER_URL}?plan=pro`,
      external: true,
    },
    highlight: true,
    badge: "Most Popular",
    annualLabel: "$290/year (save 17%)",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large teams with custom requirements.",
    features: [
      "SSO / SAML / OIDC",
      "99.9% SLA with penalties",
      "Dedicated support (4h SLA)",
      "SCIM provisioning",
      "Invoice billing (NET-30)",
      "On-prem deployment support",
      "Custom AI Janitor pools",
    ],
    cta: { label: "Contact Sales", href: SALES_EMAIL, external: true },
  },
  {
    name: "Self-Hosted",
    price: "Free",
    period: "forever",
    description: "Apache 2.0. Run on your infrastructure.",
    features: [
      "Full feature parity",
      "Unlimited everything",
      "AI Janitor included",
      "No license fees",
      "Single Go binary",
      "Deploy in 3 minutes",
    ],
    cta: { label: "Deploy Now", href: DOCS_QUICKSTART },
    badge: "100% Open Source",
  },
];

/* ==========================================================================
   Feature Comparison Table Data
   ========================================================================== */

interface FeatureRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
  selfHosted: string | boolean;
}

interface FeatureCategory {
  name: string;
  rows: FeatureRow[];
}

const featureCategories: FeatureCategory[] = [
  {
    name: "Core Platform",
    rows: [
      {
        feature: "Feature flags",
        free: "Unlimited",
        pro: "Unlimited",
        enterprise: "Unlimited",
        selfHosted: "Unlimited",
      },
      {
        feature: "Flag types (boolean, string, number, JSON)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Environments",
        free: "2",
        pro: "Unlimited",
        enterprise: "Unlimited",
        selfHosted: "Unlimited",
      },
      {
        feature: "Projects",
        free: "1",
        pro: "Unlimited",
        enterprise: "Unlimited",
        selfHosted: "Unlimited",
      },
      {
        feature: "Team members",
        free: "3",
        pro: "Unlimited",
        enterprise: "Unlimited",
        selfHosted: "Unlimited",
      },
      {
        feature: "Evaluations",
        free: "Unlimited",
        pro: "Unlimited",
        enterprise: "Unlimited",
        selfHosted: "Unlimited",
      },
    ],
  },
  {
    name: "Targeting & Rollouts",
    rows: [
      {
        feature: "Targeting operators (>, <, =, in, regex)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Segments",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Percentage rollouts",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Prerequisites",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Mutual exclusion groups",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "Experiments",
    rows: [
      {
        feature: "A/B testing",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Weighted variants",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Impression tracking",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "AI Janitor",
    rows: [
      {
        feature: "Stale flag detection",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Auto-PR generation",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Git provider support (GitHub, GitLab, Bitbucket)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "LLM flexibility (OpenAI, Anthropic, self-hosted)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Actions per month",
        free: "25",
        pro: "200",
        enterprise: "Custom pools",
        selfHosted: "Unlimited",
      },
    ],
  },
  {
    name: "Governance",
    rows: [
      {
        feature: "Roles (Admin, Member, Viewer)",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "RBAC",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Per-environment permissions",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Audit logging",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Approvals (change requests)",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "Security",
    rows: [
      {
        feature: "SSO / SAML / OIDC",
        free: false,
        pro: false,
        enterprise: true,
        selfHosted: "BYO",
      },
      {
        feature: "MFA",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: "BYO",
      },
      {
        feature: "SCIM provisioning",
        free: false,
        pro: false,
        enterprise: true,
        selfHosted: false,
      },
      {
        feature: "IP allowlisting",
        free: false,
        pro: false,
        enterprise: true,
        selfHosted: "BYO",
      },
      {
        feature: "API keys",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "JWT authentication",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "Integrations",
    rows: [
      {
        feature: "SDKs (Go, Node, Python, Java, .NET, Ruby, React, Vue)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "OpenFeature provider",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "IaC (Terraform, Pulumi)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Webhooks",
        free: false,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "CI/CD (GitHub Actions, GitLab CI)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "Deployment",
    rows: [
      {
        feature: "Cloud",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: "Self-managed",
      },
      {
        feature: "Self-hosted",
        free: "N/A",
        pro: "N/A",
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Relay proxy",
        free: false,
        pro: "1 included",
        enterprise: "Unlimited",
        selfHosted: "Self-managed",
      },
      {
        feature: "SSE streaming",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
    ],
  },
  {
    name: "Support",
    rows: [
      {
        feature: "Community (Discord, GitHub)",
        free: true,
        pro: true,
        enterprise: true,
        selfHosted: true,
      },
      {
        feature: "Email support",
        free: false,
        pro: "Priority",
        enterprise: "Dedicated 4h SLA",
        selfHosted: false,
      },
      {
        feature: "SLA",
        free: false,
        pro: false,
        enterprise: "99.9% with penalties",
        selfHosted: "Self-managed",
      },
    ],
  },
];

/* ==========================================================================
   FAQ Data
   ========================================================================== */

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "How does pricing work? Do you charge per seat?",
    answer:
      "FeatureSignals Pro is a flat $29/month — unlimited seats, unlimited projects, unlimited flags. We don't charge per seat, per flag, or per evaluation. The only metered resource is AI Janitor actions, with generous free tiers on every plan. Enterprise pricing is custom and includes additional compliance, support, and SLA guarantees.",
  },
  {
    question: "What's included in the Free plan?",
    answer:
      "The Free plan includes 1 project, 2 environments, 3 team members, unlimited feature flags, unlimited evaluations, 25 AI Janitor actions per month, community support, and access to all 8 SDKs plus OpenFeature. It's designed for individuals and small teams to experience the full platform without time limits.",
  },
  {
    question: "How does the AI Janitor credit system work?",
    answer:
      "AI Janitor actions include stale flag detection scans, automated pull request generation, and flag removal suggestions. Free includes 25 actions/month, Pro includes 200 actions/month, and Enterprise gets custom pools. Credit packs are also available on all plans: Starter (50 credits), Team (250), and Scale (1,500). Self-hosted users get unlimited AI Janitor actions since they bring their own LLM keys.",
  },
  {
    question: "Can I switch between plans?",
    answer:
      "Absolutely. You can upgrade from Free to Pro at any time — your data, flags, and configuration carry over seamlessly. Downgrading from Pro to Free is also supported, though you may need to reduce projects or team members to fit the Free plan limits. Enterprise contracts have annual terms. Self-hosted and Cloud are interoperable: switch anytime without data export.",
  },
  {
    question: "Is self-hosted really free?",
    answer:
      "Yes. FeatureSignals Self-Hosted is Apache 2.0 licensed — free forever, full feature parity, no license fees, no seat limits, no usage caps. It's a single Go binary that deploys in 3 minutes. You only pay for your own infrastructure. The AI Janitor is included; you provide your own LLM API keys (OpenAI, Anthropic, or self-hosted models).",
  },
  {
    question: "What's the difference between Pro and Enterprise?",
    answer:
      "Pro is designed for growing engineering teams that need unlimited projects, RBAC, audit logs, approvals, webhooks, and priority email support — all at a flat $29/month. Enterprise adds SSO/SAML/OIDC, SCIM provisioning, a 99.9% SLA with financial penalties, dedicated support with a 4-hour response SLA, invoice billing (NET-30), on-prem deployment support, and custom AI Janitor pools.",
  },
  {
    question: "Do you offer discounts for startups or nonprofits?",
    answer:
      "Yes. We offer a 50% discount on Pro for eligible startups (under $5M in funding, fewer than 20 employees) and free Pro plans for registered nonprofits. Contact sales@featuresignals.com to apply. We also offer academic discounts for university research groups.",
  },
  {
    question: "How does the migration from LaunchDarkly work?",
    answer:
      "FeatureSignals provides an automated migration tool that imports your feature flags, segments, targeting rules, and environments from LaunchDarkly (and other platforms). The migration preserves flag keys so your SDK code doesn't need to change. Since FeatureSignals is OpenFeature-native, you can also use the OpenFeature provider to swap providers without touching application code. See our migration guide for step-by-step instructions.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "We don't hard-cut you off. If you exceed AI Janitor credits, additional actions are queued and processed in the next billing cycle. If you exceed project or team member limits on the Free plan, you'll receive a notification asking you to upgrade. We never surprise you with overage charges — we'll reach out to discuss upgrading before anything is interrupted.",
  },
  {
    question: "Can I pay annually?",
    answer:
      "Yes. Annual billing is available on Pro at $290/year — a 17% discount over monthly billing ($29/month × 12 = $348). Enterprise contracts are annual by default with NET-30 invoicing. Self-hosted is always free. Contact sales for custom Enterprise pricing and multi-year agreements.",
  },
];

/* ==========================================================================
   Helper Components
   ========================================================================== */

function CheckListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-[var(--fgColor-default)]">
      <CheckIcon size={16} className="mt-0.5 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </li>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon size={16} className="text-emerald-500" />
    ) : (
      <XIcon size={16} className="text-[var(--fgColor-subtle)]" />
    );
  }
  if (value === "BYO") {
    return (
      <span className="text-xs font-medium text-[var(--fgColor-muted)] italic">
        BYO
      </span>
    );
  }
  return <span className="text-sm text-[var(--fgColor-default)]">{value}</span>;
}

/* ==========================================================================
   Tier Card Component
   ========================================================================== */

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isFeatured = tier.highlight;

  return (
    <motion.div
      {...fadeUpDelayed(index * 0.1)}
      className={cn(
        "relative flex flex-col p-6",
        isFeatured
          ? "premium-card-featured !shadow-accent border-2 border-[var(--fs-border-accent-strong)] md:-mt-3 md:mb-3"
          : "premium-card",
      )}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm",
              isFeatured
                ? "bg-[var(--bgColor-accent-emphasis)] text-white"
                : "bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)]",
            )}
          >
            {isFeatured && <CloudIcon size={12} />}
            {tier.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className={cn("mb-4", isFeatured && "text-center")}>
        <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
          {tier.name}
        </h3>
        <p className="text-sm text-[var(--fgColor-muted)] mt-1">
          {tier.description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[var(--fgColor-default)]">
            {tier.price}
          </span>
          {tier.period && (
            <span className="text-sm text-[var(--fgColor-muted)]">
              {tier.period}
            </span>
          )}
        </div>
        {tier.annualLabel && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {tier.annualLabel}
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-5">
        {tier.features.map((f) => (
          <CheckListItem key={f} text={f} />
        ))}
      </ul>

      {/* CTA */}
      {tier.cta.external || tier.cta.href.startsWith("mailto") ? (
        <a
          href={tier.cta.href}
          className={cn(
            isFeatured ? "btn-primary-success w-full" : "btn-secondary w-full",
          )}
        >
          {tier.cta.label}
          {tier.cta.href.includes("docs.") && <DownloadIcon size={14} />}
        </a>
      ) : (
        <Link
          href={tier.cta.href}
          className={cn(
            isFeatured ? "btn-primary-success w-full" : "btn-secondary w-full",
          )}
        >
          {tier.cta.label}
          {tier.cta.href.includes("docs.") && <DownloadIcon size={14} />}
        </Link>
      )}
    </motion.div>
  );
}

/* ==========================================================================
   Feature Comparison Table
   ========================================================================== */

function FeatureComparisonTable() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Core Platform"]),
  );

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(featureCategories.map((c) => c.name)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  const allExpanded = expandedCategories.size === featureCategories.length;

  return (
    <div className="overflow-x-auto">
      {/* Expand/Collapse All */}
      <div className="flex justify-end mb-4">
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs font-medium text-[var(--fgColor-accent)] hover:underline"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--borderColor-default)]">
            <th className="py-3 pr-4 text-sm font-semibold text-[var(--fgColor-default)] sticky left-0 bg-white z-10">
              Feature
            </th>
            <th className="py-3 px-3 text-sm font-semibold text-[var(--fgColor-default)] text-center">
              Free
            </th>
            <th className="py-3 px-3 text-sm font-semibold text-[var(--fgColor-accent)] text-center bg-[var(--bgColor-accent-muted)]/30">
              Pro
            </th>
            <th className="py-3 px-3 text-sm font-semibold text-[var(--fgColor-default)] text-center">
              Enterprise
            </th>
            <th className="py-3 px-3 text-sm font-semibold text-[var(--fgColor-done)] text-center">
              Self-Hosted
            </th>
          </tr>
        </thead>
        <tbody>
          {featureCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            return (
              <Fragment key={category.name}>
                {/* Category header row */}
                <tr
                  className={cn(
                    "border-b border-[var(--borderColor-default)] cursor-pointer transition-colors",
                    isExpanded
                      ? "bg-[var(--fs-bg-accent-subtle)] hover:bg-[var(--fs-bg-surface-hover)]"
                      : "hover:bg-[var(--fs-bg-surface-hover)]",
                  )}
                  onClick={() => toggleCategory(category.name)}
                >
                  <td colSpan={5} className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <ChevronDownIcon
                        size={14}
                        className={cn(
                          "text-[var(--fgColor-muted)] transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                      <span className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {category.name}
                      </span>
                      <span className="text-xs text-[var(--fgColor-muted)]">
                        ({category.rows.length} features)
                      </span>
                    </div>
                  </td>
                </tr>
                {/* Feature rows */}
                {isExpanded &&
                  category.rows.map((row, idx) => (
                    <tr
                      key={row.feature}
                      className={cn(
                        "border-b border-[var(--borderColor-muted)] hover:bg-[var(--bgColor-inset)] transition-colors",
                        idx % 2 === 0 && "bg-[var(--fs-bg-surface)]",
                      )}
                    >
                      <td className="py-2.5 pr-4 text-sm text-[var(--fgColor-default)] sticky left-0 bg-white">
                        {row.feature}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <FeatureValue value={row.free} />
                      </td>
                      <td className="py-2.5 px-3 text-center bg-[var(--bgColor-accent-muted)]/15">
                        <FeatureValue value={row.pro} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <FeatureValue value={row.enterprise} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <FeatureValue value={row.selfHosted} />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================================================================
   FAQ Accordion
   ========================================================================== */

function FaqAccordion() {
  return (
    <Accordion.Root type="single" collapsible className="max-w-3xl mx-auto">
      {faqItems.map((item, i) => (
        <Accordion.Item
          key={i}
          value={`faq-${i}`}
          className="premium-card mb-3 last:mb-0 border-[var(--fs-border-subtle)]"
        >
          <Accordion.Header asChild>
            <Accordion.Trigger className="flex items-center justify-between w-full py-5 text-left text-base font-semibold text-[var(--fgColor-default)] hover:text-[var(--fgColor-accent)] transition-colors group cursor-pointer">
              <span className="pr-4">{item.question}</span>
              <ChevronDownIcon
                size={16}
                className="shrink-0 text-[var(--fgColor-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <p className="pb-5 text-[var(--fgColor-muted)] leading-relaxed text-sm">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

/* ==========================================================================
   Section: Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="pricing-hero"
      className="relative py-16 sm:py-24 bg-[var(--bgColor-default)] bg-glow-orbs"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fgColor-default)]"
          {...fadeUp}
        >
          Plans that scale with your team
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-[var(--fgColor-muted)] mt-4 max-w-2xl mx-auto"
          {...fadeUpDelayed(0.1)}
        >
          From startups to enterprises. Free to start. No per-seat penalties.
        </motion.p>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Pricing Tiers
   ========================================================================== */

function PricingTiersSection() {
  return (
    <section
      id="pricing-tiers"
      className="py-16 sm:py-20 bg-[var(--bgColor-inset)]"
      aria-labelledby="tiers-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="tiers-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Choose your plan
          </h2>
          <p className="text-[var(--fgColor-muted)] mt-2">
            Transparent pricing. No hidden fees. No lock-in.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>

        {/* No lock-in promise */}
        <motion.div
          className="mt-12 text-center max-w-xl mx-auto"
          {...fadeUpDelayed(0.4)}
        >
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bgColor-success-muted)] border border-[var(--borderColor-success-muted)]">
            <HeartIcon size={16} className="text-emerald-500" />
            <p className="text-sm text-[var(--fgColor-default)]">
              <span className="font-semibold text-emerald-600">
                No lock-in. Ever.
              </span>{" "}
              Switch between Self-Hosted and Cloud anytime. All SDKs support
              OpenFeature — swap providers without changing code.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Feature Comparison Table
   ========================================================================== */

function FeatureComparisonSection() {
  return (
    <section
      id="feature-comparison"
      className="py-16 sm:py-20 bg-[var(--bgColor-default)]"
      aria-labelledby="comparison-heading"
    >
      <div className="mx-auto max-w-5xl px-6">
        <motion.div className="text-center mb-10" {...fadeUp}>
          <h2
            id="comparison-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Feature comparison
          </h2>
          <p className="text-[var(--fgColor-muted)] mt-2">
            Everything you need to evaluate, ship, and clean up — across every
            plan.
          </p>
        </motion.div>

        <motion.div {...fadeUpDelayed(0.15)}>
          <FeatureComparisonTable />
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: FAQ
   ========================================================================== */

function FaqSection() {
  return (
    <section
      id="faq"
      className="py-16 sm:py-20 bg-[var(--bgColor-inset)]"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <motion.div className="text-center mb-10" {...fadeUp}>
          <div className="inline-flex items-center gap-2 mb-4">
            <QuestionIcon size={24} className="text-[var(--fgColor-accent)]" />
          </div>
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Frequently asked questions
          </h2>
          <p className="text-[var(--fgColor-muted)] mt-2">
            Everything you need to know about FeatureSignals pricing.
          </p>
        </motion.div>

        <motion.div {...fadeUpDelayed(0.15)}>
          <FaqAccordion />
        </motion.div>

        {/* Still have questions? */}
        <motion.div className="mt-10 text-center" {...fadeUpDelayed(0.3)}>
          <p className="text-sm text-[var(--fgColor-muted)] mb-3">
            Still have questions?
          </p>
          <Link
            href="/contact?reason=sales"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)] hover:bg-[#ccebff] transition-colors"
          >
            <ChevronRightIcon size={14} />
            Contact Sales
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Open-Source Promise
   ========================================================================== */

function OpenSourcePromiseSection() {
  return (
    <section
      id="open-source-promise"
      className="relative py-20 sm:py-28 overflow-hidden bg-gradient-mesh-dark"
      aria-labelledby="oss-heading"
    >
      {/* Dotted overlay */}
      <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />


      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div {...fadeUp}>
          <ShieldCheckIcon
            size={40}
            fill="#8250df"
            className="mx-auto mb-6"
            aria-hidden="true"
          />
          <h2
            id="oss-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
          >
            The Open-Source Promise
          </h2>
          <p className="text-lg mb-12" style={{ color: "#8b949e" }}>
            We believe feature flags are infrastructure. Infrastructure should
            be open, auditable, and owned by you — not a vendor.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <DownloadIcon size={20} fill="#54aeff" />,
              title: "Apache 2.0",
              desc: "Free forever. Use it, fork it, ship it. No copyleft. No restrictions.",
            },
            {
              icon: <HeartIcon size={20} fill="#54aeff" />,
              title: "No Vendor Lock-In",
              desc: "Self-host or cloud. Switch anytime. OpenFeature-native SDKs.",
            },
            {
              icon: <ShieldCheckIcon size={20} fill="#54aeff" />,
              title: "Full Feature Parity",
              desc: "Self-hosted gets everything. No crippleware. No enterprise-only features.",
            },
            {
              icon: <RocketIcon size={20} fill="#54aeff" />,
              title: "Single Binary",
              desc: "One Go binary. Deploy in 3 minutes. No Kubernetes required.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="text-left p-5 rounded-xl glass-card-dark"
              {...fadeUpDelayed(0.1 + i * 0.1)}
            >
              <div className="mb-3">{item.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {item.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#8b949e" }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Main Export
   ========================================================================== */

export function PricingPageContent() {
  return (
    <>
      <HeroSection />
      <PricingTiersSection />
      <FeatureComparisonSection />
      <FaqSection />
      <OpenSourcePromiseSection />
    </>
  );
}
