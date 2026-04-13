import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/urls";
import {
  ArrowRight,
  Brain,
  Sparkles,
  ShieldCheck,
  Search,
  Check,
  Zap,
} from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "AI Capabilities — AI-Powered Flag Lifecycle | FeatureSignals",
  description:
    "AI where it solves real problems. Flag cleanup, anomaly detection, and incident response — human-in-the-loop, never autonomous.",
};

const aiFeatures = [
  {
    id: "cleanup",
    title: "AI Flag Cleanup",
    subtitle: "Solve the #1 pain point: stale flag accumulation",
    description:
      "AI scans your codebase, identifies stale flags, analyzes usage patterns across environments, and generates cleanup pull requests. Human reviews and approves — never autonomous production changes.",
    icon: <Search className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "Codebase scanning for flag references",
      "Staleness detection based on category thresholds",
      "Usage pattern analysis across environments",
      "Auto-generated cleanup PRs with dead code removal",
      "CI/CD integration to prevent new stale flags",
    ],
    code: {
      lang: "cli",
      label: "AI Scan",
      code: `# AI scans your codebase for stale flags
featuresignals ai:scan --dir ./src --api-key $FS_API_KEY

# Results:
# ⚠  old-banner: STALE (last eval: 45 days ago)
#    → Found 3 references in ./src/components/
#    → Suggested action: Remove flag + dead code
#    → PR ready: featuresignals create-pr old-banner

# Generate cleanup PR (human reviews before merge)
featuresignals ai:create-pr old-banner --review`,
    },
  },
  {
    id: "anomaly",
    title: "AI Anomaly Detection",
    subtitle: "Catch problems before they impact users",
    description:
      "Monitors evaluation patterns in real-time, detects anomalies in flag behavior, and alerts with root cause analysis. Identifies evaluation spikes, configuration errors, and targeting misconfigurations.",
    icon: <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "Real-time evaluation pattern monitoring",
      "Statistical anomaly detection (sigma-based)",
      "Alert with root cause analysis",
      "Dashboard insights and trend visualization",
      "Correlation with recent flag changes",
    ],
    code: {
      lang: "alert",
      label: "Detection Alert",
      code: `{
  "alert": "anomaly_detected",
  "flag_key": "checkout-redesign",
  "metric": "evaluation_rate",
  "baseline": "1200/min",
  "current": "8500/min",
  "deviation": "6.1σ",
  "possible_cause": "Targeting rule change at 14:32 UTC",
  "actor": "deploy-bot-3",
  "suggested_action": "Review targeting rules, check error rates"
}`,
    },
  },
  {
    id: "incident",
    title: "AI Incident Response",
    subtitle: "Correlate, suggest, human approves",
    description:
      "Correlates flag changes with error rates, latency spikes, and system metrics. When incidents occur, AI suggests the most likely flag culprit and recommends rollback. Human approves the action.",
    icon: <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "Flag change correlation with error rates",
      "Latency spike detection post-change",
      "Rollback suggestions with impact analysis",
      "One-click approval workflow",
      "Full audit trail preserved",
    ],
    code: {
      lang: "incident",
      label: "Incident Response",
      code: `# AI incident correlation:
⚠ Incident detected: Error rate spike on /api/checkout
  → 42% increase in 5xx errors (last 5 min)
  → Correlated flag change: "checkout-redesign"
    Changed by: admin@company.com at 14:32 UTC
    Rollout: 10% → 50%
  → Suggested action: Rollback to 10%
    [Approve rollback] [Investigate further]

# Human approves → AI executes rollback
# Full audit trail preserved`,
    },
  },
];

const principles = [
  {
    title: "Human-in-the-Loop",
    description:
      "AI suggests, human approves. Never autonomous production changes.",
  },
  {
    title: "No Gimmicks",
    description:
      "No AI chatbots, no auto-generated flag descriptions, no autonomous toggling.",
  },
  {
    title: "Agent-Ready APIs",
    description:
      "Consistent JSON schemas, _meta fields, and /v1/agent/ endpoints optimized for AI.",
  },
];

export default function AIPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 py-16 text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Brain className="h-4 w-4" />
              AI Where It Solves Real Problems
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              AI-powered flag lifecycle management
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              AI that solves the #1 pain point in feature flags: stale flag
              cleanup. No gimmicks. No chatbots. Just infrastructure that works.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* AI Features: Cleanup & Anomaly */}
      {aiFeatures
        .filter((f) => f.id === "cleanup" || f.id === "anomaly")
        .map((feature, i) => (
          <section
            key={feature.id}
            id={feature.id}
            className={`mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 ${i % 2 === 0 ? "" : "bg-slate-50"}`}
          >
            <SectionReveal>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-indigo-600 sm:text-xl">
                  {feature.subtitle}
                </h2>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.05}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                features={feature.features}
                code={feature.code}
                reverse={i % 2 === 1}
              />
            </SectionReveal>
          </section>
        ))}

      {/* Mid-page CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Let AI handle flag cleanup
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              AI suggests, human approves. Start free with AI features included
              in Pro and Enterprise.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* AI Feature: Incident Response */}
      {aiFeatures
        .filter((f) => f.id === "incident")
        .map((feature, i) => (
          <section
            key={feature.id}
            id={feature.id}
            className={`mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 ${i % 2 === 0 ? "" : "bg-slate-50"}`}
          >
            <SectionReveal>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-indigo-600 sm:text-xl">
                  {feature.subtitle}
                </h2>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.05}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                features={feature.features}
                code={feature.code}
                reverse={i % 2 === 1}
              />
            </SectionReveal>
          </section>
        ))}

      {/* AI Principles */}
      <section className="border-t border-slate-100 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionReveal>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Our AI philosophy
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
                AI is infrastructure, not a gimmick. We use it where it solves
                real problems, and keep humans in control of production changes.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {principles.map(({ title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <Check className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Related features */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Explore more capabilities
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              AI is just one piece of the platform. Discover the core flag
              engine, enterprise security, and 50+ integrations.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  {
                    title: "Core Features",
                    description:
                      "Flag engine, targeting, rollouts, A/B testing, kill switches",
                    href: "/features",
                  },
                  {
                    title: "Security & Governance",
                    description:
                      "RBAC, audit logs, SSO, approvals, and compliance",
                    href: "/features/security",
                  },
                  {
                    title: "Integrations",
                    description: "Slack, GitHub, Jira, Datadog, and more",
                    href: "/features/integrations",
                  },
                ] as const
              ).map(({ title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Final CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              See AI capabilities in action
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start free with full Pro features for 14 days. AI features
              included in Pro and Enterprise.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
