"use client";

import { motion } from "framer-motion";
import {
  CodeIcon,
  PeopleIcon,
  CloudIcon,
  RocketIcon,
  ShieldCheckIcon,
  BookIcon,
  MegaphoneIcon,
  GiftIcon,
  ArrowRightIcon,
  CheckIcon,
  GitBranchIcon,
  ServerIcon,
  TelescopeIcon,
  CommentDiscussionIcon,
} from "@primer/octicons-react";
import Link from "next/link";

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
   Partner Type Data
   ========================================================================== */

interface PartnerType {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  details: string[];
  ctaLabel: string;
  ctaHref: string;
}

const partnerTypes: PartnerType[] = [
  {
    icon: CodeIcon,
    title: "Technology Partners",
    description:
      "Build integrations that extend FeatureSignals and reach engineering teams worldwide.",
    details: [
      "SDK integrations for new languages and frameworks",
      "IaC providers (Terraform, Pulumi, Crossplane)",
      "SSO / IdP integrations (Okta, Azure AD, Google)",
      "CI/CD tools (GitHub Actions, GitLab CI, Jenkins)",
      "Monitoring & observability platforms",
    ],
    ctaLabel: "Integrate with FeatureSignals",
    ctaHref: "/contact?reason=partnerships",
  },
  {
    icon: PeopleIcon,
    title: "Solution Partners",
    description:
      "Help organizations adopt feature flags and progressive delivery at scale.",
    details: [
      "Implementation consulting and migration services",
      "DevOps and platform engineering agencies",
      "Custom training and enablement programs",
      "Managed hosting and operations",
      "Revenue sharing on referred customers",
    ],
    ctaLabel: "Become a Solution Partner",
    ctaHref: "/contact?reason=partnerships",
  },
  {
    icon: CloudIcon,
    title: "Cloud Marketplaces",
    description:
      "Make FeatureSignals available through the cloud platforms your customers already use.",
    details: [
      "AWS Marketplace (coming soon)",
      "Azure Marketplace (coming soon)",
      "Google Cloud Marketplace (planned)",
      "DigitalOcean Marketplace (planned)",
      "Simplified procurement and consolidated billing",
    ],
    ctaLabel: "List on Your Marketplace",
    ctaHref: "/contact?reason=partnerships",
  },
];

/* ==========================================================================
   Partner Benefits
   ========================================================================== */

interface Benefit {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    icon: RocketIcon,
    title: "Early Access",
    description:
      "Get early access to new features, APIs, and SDKs before they ship. Influence the product roadmap with your integration feedback.",
  },
  {
    icon: MegaphoneIcon,
    title: "Co-Marketing",
    description:
      "Joint case studies, webinars, blog posts, and social promotion. Get listed on our partners page and reach 500+ engineering teams.",
  },
  {
    icon: BookIcon,
    title: "Technical Support",
    description:
      "Dedicated partner engineering support with a Slack channel, quarterly architecture reviews, and integration testing assistance.",
  },
  {
    icon: GiftIcon,
    title: "Revenue Sharing",
    description:
      "Solution partners earn 20% recurring commission on referred customers for the first 12 months. No caps. No quotas.",
  },
];

/* ==========================================================================
   Integration Categories
   ========================================================================== */

interface IntegrationCategory {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: string[];
}

const integrationCategories: IntegrationCategory[] = [
  {
    name: "Identity Providers",
    icon: ShieldCheckIcon,
    items: [
      "Okta",
      "Azure AD",
      "Google Workspace",
      "GitHub",
      "GitLab",
      "Ping Identity",
      "OneLogin",
      "JumpCloud",
    ],
  },
  {
    name: "CI/CD",
    icon: GitBranchIcon,
    items: [
      "GitHub Actions",
      "GitLab CI",
      "Jenkins",
      "CircleCI",
      "ArgoCD",
      "Spinnaker",
      "Harness",
    ],
  },
  {
    name: "Infrastructure",
    icon: ServerIcon,
    items: ["Terraform", "Pulumi", "Ansible", "Crossplane", "AWS CDK", "CDKTF"],
  },
  {
    name: "Monitoring",
    icon: TelescopeIcon,
    items: [
      "Datadog",
      "Grafana",
      "Prometheus",
      "New Relic",
      "Sentry",
      "Honeycomb",
      "SigNoz",
    ],
  },
  {
    name: "Communication",
    icon: CommentDiscussionIcon,
    items: [
      "Slack",
      "Discord",
      "Microsoft Teams",
      "Google Chat",
      "PagerDuty",
      "Opsgenie",
    ],
  },
  {
    name: "SDKs & Runtimes",
    icon: CodeIcon,
    items: [
      "Go",
      "Node.js",
      "Python",
      "Java",
      ".NET",
      "Ruby",
      "React",
      "Vue",
      "OpenFeature",
    ],
  },
];

/* ==========================================================================
   Helper Components
   ========================================================================== */

function BenefitCard({ benefit, index }: { benefit: Benefit; index: number }) {
  return (
    <motion.div
      className="flex items-start gap-4 p-5 rounded-xl bg-white border border-[var(--signal-border-default)]"
      style={{ boxShadow: "var(--signal-shadow-sm)" }}
      {...fadeUpDelayed(index * 0.1)}
    >
      <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-[var(--signal-bg-accent-muted)]">
        <benefit.icon size={18} className="text-[var(--signal-fg-accent)]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
          {benefit.title}
        </h3>
        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
          {benefit.description}
        </p>
      </div>
    </motion.div>
  );
}

function PartnerTypeCard({
  partnerType,
  index,
}: {
  partnerType: PartnerType;
  index: number;
}) {
  const Icon = partnerType.icon;
  return (
    <motion.div
      className="flex flex-col rounded-xl border border-[var(--signal-border-default)] bg-white p-6 premium-card"
      {...fadeUpDelayed(index * 0.12)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--signal-bg-accent-muted)]">
          <Icon size={22} className="text-[var(--signal-fg-accent)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
          {partnerType.title}
        </h3>
      </div>

      <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed mb-4 flex-1">
        {partnerType.description}
      </p>

      <ul className="space-y-2 mb-5">
        {partnerType.details.map((detail) => (
          <li
            key={detail}
            className="flex items-start gap-2 text-sm text-[var(--signal-fg-primary)]"
          >
            <CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>

      <a
        href={partnerType.ctaHref}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)] hover:bg-[#ccebff] transition-colors w-full text-center mt-auto"
      >
        {partnerType.ctaLabel}
        <ArrowRightIcon size={14} />
      </a>
    </motion.div>
  );
}

/* ==========================================================================
   Section: Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="partners-hero"
      className="py-16 sm:py-24 bg-[var(--signal-bg-primary)]"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--signal-fg-primary)]"
          {...fadeUp}
        >
          Partner with FeatureSignals
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-[var(--signal-fg-secondary)] mt-4 max-w-2xl mx-auto"
          {...fadeUpDelayed(0.1)}
        >
          Unlock new opportunities by integrating with the open-source feature
          flag platform.
        </motion.p>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Partner Types
   ========================================================================== */

function PartnerTypesSection() {
  return (
    <section
      id="partner-types"
      className="py-16 sm:py-20 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="partner-types-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="partner-types-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Ways to partner
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2">
            Three paths to build with us. Choose what fits your business.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {partnerTypes.map((pt, i) => (
            <PartnerTypeCard key={pt.title} partnerType={pt} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Partner Benefits
   ========================================================================== */

function BenefitsSection() {
  return (
    <section
      id="partner-benefits"
      className="py-16 sm:py-20 bg-[var(--signal-bg-primary)]"
      aria-labelledby="benefits-heading"
    >
      <div className="mx-auto max-w-4xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="benefits-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Partner benefits
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2">
            Everything you need to build, market, and grow with FeatureSignals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {benefits.map((benefit, i) => (
            <BenefitCard key={benefit.title} benefit={benefit} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Integration Categories
   ========================================================================== */

function IntegrationCategoriesSection() {
  return (
    <section
      id="integration-categories"
      className="py-16 sm:py-20 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="integrations-heading"
    >
      <div className="mx-auto max-w-5xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="integrations-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Integration categories
          </h2>
          <p className="text-[var(--signal-fg-secondary)] mt-2">
            FeatureSignals plugs into your existing stack. Here&apos;s what we
            integrate with today.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrationCategories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                className="rounded-xl border border-[var(--signal-border-default)] bg-white p-5"
                style={{ boxShadow: "var(--signal-shadow-sm)" }}
                {...fadeUpDelayed(i * 0.08)}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--signal-bg-accent-muted)]">
                    <Icon size={14} className="text-[var(--signal-fg-accent)]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    {cat.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] border border-[var(--signal-border-subtle)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Open source note */}
        <motion.div className="mt-12 text-center" {...fadeUpDelayed(0.5)}>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            Don&apos;t see your tool? FeatureSignals is open source —{" "}
            <a
              href="https://github.com/dinesh-g1/featuresignals"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--signal-fg-accent)] hover:underline font-medium"
            >
              contribute an integration on GitHub
            </a>
            .
          </p>
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
      id="partners-cta"
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{ backgroundColor: "#25292e" }}
      aria-labelledby="partners-cta-heading"
    >
      <div className="absolute inset-0 bg-dotted-dark" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(130,80,223,0.1) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <PeopleIcon
            size={40}
            fill="#8250df"
            className="mx-auto mb-6"
            aria-hidden="true"
          />
          <h2
            id="partners-cta-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
          >
            Become a partner
          </h2>
          <p className="text-lg mb-10" style={{ color: "#8b949e" }}>
            Join our partner ecosystem and help engineering teams ship faster
            with open-source feature flags. We&apos;ll respond within 48 hours.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          {...fadeUpDelayed(0.2)}
        >
          <a
            href="/contact?reason=partnerships"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-accent-emphasis)] hover:bg-[#0757ba] transition-colors"
          >
            Become a Partner
            <ArrowRightIcon size={16} />
          </a>
          <Link
            href="/docs/integrations"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border transition-colors"
            style={{
              borderColor: "#373e47",
              boxShadow: "0 1px 0 0 #ffffff14",
            }}
          >
            Explore Integrations
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Main Export
   ========================================================================== */

export function PartnersPageContent() {
  return (
    <>
      <HeroSection />
      <PartnerTypesSection />
      <BenefitsSection />
      <IntegrationCategoriesSection />
      <FinalCtaSection />
    </>
  );
}
