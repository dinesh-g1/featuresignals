import Link from "next/link";
import type { Metadata } from "next";
import {
  Flag,
  Target,
  GitBranch,
  FlaskConical,
  ShieldOff,
  Code,
  Check,
  Zap,
  ArrowRight,
  Users,
  Globe,
  BarChart3,
  Activity,
  ShieldCheck,
  Brain,
  Webhook,
} from "lucide-react";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Core Features",
  description:
    "Feature flags, targeting rules, percentage rollouts, A/B testing, kill switches, GitOps — everything you need to ship with confidence.",
};

const coreFeatures = [
  {
    Icon: Flag,
    title: "Feature Flags (5 Types)",
    description:
      "Boolean, string, number, JSON, and A/B experiment flags. Every type supports per-environment overrides, targeting rules, percentage rollouts, and scheduled rotations. Set default values for safe fallbacks.",
    capabilities: [
      "Boolean toggles for simple feature gating",
      "String flags for multi-variant experiments",
      "Number flags for gradual rollout percentages",
      "JSON flags for complex configuration objects",
      "A/B experiment flags with consistent hashing",
    ],
  },
  {
    Icon: Target,
    title: "Precision Targeting",
    description:
      "Target individual users, groups, or percentages with rule-based flag evaluation. Use custom attributes, segments, and mutual exclusion groups for sophisticated experimentation.",
    capabilities: [
      "User-level targeting by ID, email, or custom key",
      "Group segmentation with AND/OR rule combinators",
      "Percentage rollouts with consistent hashing",
      "Environment-specific targeting rules",
      "Mutual exclusion groups for clean experiments",
    ],
  },
  {
    Icon: GitBranch,
    title: "Gradual Rollouts",
    description:
      "Roll out features incrementally with percentage-based traffic splits. Increase rollout percentages automatically with scheduled rotations. Roll back instantly with one click.",
    capabilities: [
      "Percentage-based traffic splitting (1%–100%)",
      "Scheduled rollout increases (e.g., 10% → 25% → 50% → 100%)",
      "Instant kill switch for emergency rollback",
      "Canary deployments with targeted user segments",
      "Automated rollback on error threshold breaches",
    ],
  },
  {
    Icon: FlaskConical,
    title: "A/B Experimentation",
    description:
      "Run experiments with confidence. Built-in statistical engine evaluates results with significance testing. Immutable flag states preserve experiment integrity.",
    capabilities: [
      "Weighted variant assignment with consistent hashing",
      "Mutual exclusion groups for non-interfering experiments",
      "Impression tracking for analytics integration",
      "Statistical significance calculation",
      "Immutable experiment states for audit compliance",
    ],
  },
  {
    Icon: ShieldOff,
    title: "Kill Switches",
    description:
      "Emergency disable any feature across all environments with a single click. The kill switch bypasses all targeting rules and immediately serves the default value.",
    capabilities: [
      "Global kill switch disables across all environments",
      "Environment-specific kill switch for targeted rollback",
      "Audit-logged kill switch activations with timestamp",
      "Automated kill on anomaly detection (AI-powered)",
      "One-click re-enable after incident resolution",
    ],
  },
  {
    Icon: Code,
    title: "GitOps Workflows",
    description:
      "Manage flags as code with Terraform provider and Git-sync capabilities. Flag changes go through your existing PR review process, with plan/apply validation.",
    capabilities: [
      "Terraform provider for infrastructure-as-code flag management",
      "Git-sync for flag definitions alongside application code",
      "PR-based flag changes with review and approval workflow",
      "Plan/apply diff preview before flag changes take effect",
      "Audit trail linking flag changes to Git commits",
    ],
  },
];

const additionalCapabilities = [
  {
    title: "Flag Dependencies",
    description:
      "Define parent-child flag relationships. When a parent flag is disabled, all dependent flags are automatically disabled too.",
    icon: GitBranch,
  },
  {
    title: "Scheduled Rotations",
    description:
      "Schedule flag state changes in advance. Automate rollout progressions, maintenance windows, and experimentation timeframes.",
    icon: Activity,
  },
  {
    title: "Realtime SSE Streaming",
    description:
      "Flag changes propagate to SDKs in real-time via Server-Sent Events. No polling needed. Sub-second propagation globally.",
    icon: Zap,
  },
  {
    title: "Environment Overrides",
    description:
      "Per-environment flag configuration with inheritance. Development, staging, production — each environment gets its own targeting rules.",
    icon: Globe,
  },
  {
    title: "Usage Analytics",
    description:
      "Track flag evaluation counts, active users per flag, and adoption rates. Identify unused flags and optimization opportunities.",
    icon: BarChart3,
  },
  {
    title: "Role-Based Access",
    description:
      "Granular permissions per environment and flag. Read-only access for developers, full control for admins, approval gates for production changes.",
    icon: Users,
  },
];

const flagTypes = [
  {
    type: "Boolean",
    example: "show-new-checkout",
    use: "Simple on/off toggles",
  },
  {
    type: "String",
    example: "checkout-variant",
    use: "Multi-variant experiments (A/B/C)",
  },
  {
    type: "Number",
    example: "discount-percentage",
    use: "Graduated rollouts and numeric config",
  },
  {
    type: "JSON",
    example: "checkout-config",
    use: "Complex configuration objects",
  },
  {
    type: "A/B Experiment",
    example: "pricing-page-test",
    use: "Statistical experiments with immutable variants",
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://featuresignals.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Features",
                item: "https://featuresignals.com/features",
              },
            ],
          }),
        }}
      />
      {/* Hero Section */}
      <SectionReveal>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

          <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
              <Flag className="h-4 w-4" />
              Enterprise Feature Flag Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
              Ship with confidence.
              <br />
              <span className="text-accent">Control everything.</span>
            </h1>
            <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              FeatureSignals gives you complete control over feature delivery —
              from simple boolean toggles to sophisticated multi-variant
              experiments, all with sub-millisecond evaluation latency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="https://app.featuresignals.com/register"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-all"
              >
                Start Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-all"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Flag Types Section */}
      <SectionReveal>
        <section className="py-14 sm:py-20 px-6 border-b border-stone-100 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
                Five flag types for every use case
              </h2>
              <p className="text-lg text-stone-600">
                From simple toggles to complex configuration objects —
                FeatureSignals supports every flag type your team needs.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Flag Type
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Example
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Best For
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {flagTypes.map((ft) => (
                    <tr
                      key={ft.type}
                      className="bg-white hover:bg-stone-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-accent/10 text-accent px-3 py-1 text-sm font-semibold">
                          {ft.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-stone-700">
                        {ft.example}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {ft.use}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center text-sm text-stone-500 mt-6">
              All flag types support per-environment overrides, targeting rules,
              percentage rollouts, and real-time SSE streaming.
            </p>
          </div>
        </section>
      </SectionReveal>

      {/* Core Features Grid */}
      <SectionReveal>
        <section className="py-14 sm:py-20 px-6 border-b border-stone-200 bg-stone-50">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
                Everything you need to ship safely
              </h2>
              <p className="text-lg text-stone-600">
                FeatureSignals combines battle-tested feature flag primitives
                with modern automation to give your team superpowers.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {coreFeatures.map(
                ({ Icon, title, description, capabilities }) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold text-stone-900">
                          {title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-stone-600">
                          {description}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-6 space-y-2.5 border-t border-stone-100 pt-6">
                      {capabilities.map((cap) => (
                        <li
                          key={cap}
                          className="flex items-start gap-2 text-sm text-stone-600"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Additional Capabilities */}
      <SectionReveal>
        <section className="py-14 sm:py-20 px-6 border-b border-stone-100 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
                More capabilities
              </h2>
              <p className="text-lg text-stone-600">
                Beyond the core primitives, FeatureSignals includes everything
                your team needs to operate at scale.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {additionalCapabilities.map(
                ({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-stone-900">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      {description}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Related Features CTA */}
      <SectionReveal>
        <section className="py-14 sm:py-20 px-6 bg-stone-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6 md:grid-cols-3">
              <Link
                href="/features/ai"
                className="group rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Brain className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  AI Janitor
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Autonomous stale flag detection and cleanup PR generation.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Learn more{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href="/features/security"
                className="group rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  Security & Governance
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  RBAC, audit logs, SSO, compliance, and approval workflows.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Learn more{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href="/features/integrations"
                className="group rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Webhook className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  Integrations
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Terraform, Slack, GitHub, Jira, Datadog, and webhooks.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Learn more{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
