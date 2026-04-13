import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/urls";
import {
  ArrowRight,
  Webhook,
  Check,
  Terminal,
  Code,
  MessageSquare,
  BarChart,
  Bell,
  Shield,
} from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Integrations — Connect Your Engineering Stack | FeatureSignals",
  description:
    "Slack, GitHub, GitLab, Jira, Datadog, Grafana, Sentry, PagerDuty, and more. Webhooks with HMAC-SHA256 signatures for custom integrations.",
};

interface Integration {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  code?: { lang: string; label: string; code: string };
}

const integrationGroups: {
  category: string;
  integrations: Integration[];
}[] = [
  {
    category: "CI/CD & Version Control",
    integrations: [
      {
        id: "github",
        title: "GitHub",
        description:
          "Code reference scanning to find flag usages in your repository. PR annotations for flag changes. Automatic stale flag detection in CI pipelines.",
        icon: <Terminal className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Flag reference scanning",
          "PR annotations for changes",
          "Stale flag detection in CI",
          "GitHub Action for automated scans",
        ],
        code: {
          lang: "yaml",
          label: "GitHub Action",
          code: `name: Stale Flag Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: featuresignals/scan-action@v1
        with:
          api-key: \${{ secrets.FS_API_KEY }}
          fail-on-stale: true
          # Annotations appear as PR comments`,
        },
      },
      {
        id: "gitlab",
        title: "GitLab",
        description:
          "Similar to GitHub integration with GitLab CI/CD pipelines. Code reference scanning and MR annotations for flag changes.",
        icon: <Code className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Code reference scanning",
          "MR annotations",
          "GitLab CI/CD pipeline integration",
          "Stale flag detection",
        ],
      },
    ],
  },
  {
    category: "Communication & Incident Response",
    integrations: [
      {
        id: "slack",
        title: "Slack",
        description:
          "Real-time notifications for flag changes, approval requests, and AI-detected anomalies. Configurable channels per environment.",
        icon: (
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        ),
        features: [
          "Flag change notifications",
          "Approval request alerts",
          "AI anomaly alerts",
          "Per-environment channels",
        ],
        code: {
          lang: "text",
          label: "Slack Alert",
          code: `🚩 Flag Changed: checkout-redesign
   Environment: production
   Actor: admin@company.com
   Change: 10% → 50% rollout
   Time: 14:32 UTC
   [View in dashboard] [Request rollback]`,
        },
      },
      {
        id: "pagerduty",
        title: "PagerDuty",
        description:
          "Incident escalation with flag change context. When AI detects an anomaly correlated with a flag change, PagerDuty creates an incident with full context.",
        icon: <Bell className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Incident escalation with context",
          "Flag change correlation",
          "AI anomaly alerts",
          "On-call routing",
        ],
      },
    ],
  },
  {
    category: "Observability",
    integrations: [
      {
        id: "datadog",
        title: "Datadog",
        description:
          "Export flag evaluation metrics and AI anomaly alerts. Correlate flag changes with system performance and error rates.",
        icon: <BarChart className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Flag evaluation metrics export",
          "AI anomaly alert forwarding",
          "Change correlation with APM",
          "Custom dashboards",
        ],
        code: {
          lang: "text",
          label: "Datadog Query",
          code: `# Datadog custom query:
avg:featuresignals.flag.evaluations{env:production}
  .rollup(60)

# Correlate with error rates:
avg:featuresignals.flag.evaluations{flag:checkout}
  / avg:http.server.errors{status:5xx}`,
        },
      },
      {
        id: "grafana",
        title: "Grafana",
        description:
          "Prometheus-compatible metrics endpoint. Build custom dashboards to visualize flag evaluation patterns, anomaly rates, and system health.",
        icon: <BarChart className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Prometheus metrics endpoint",
          "Custom Grafana dashboards",
          "Alert rules based on flag metrics",
          "Multi-environment views",
        ],
      },
      {
        id: "sentry",
        title: "Sentry",
        description:
          "Correlate flag states with error events for faster debugging. Every Sentry error includes the active flag context at the time of the error.",
        icon: <Shield className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Flag state correlation with errors",
          "Active flag context in error events",
          "Faster root cause analysis",
          "Environment-specific insights",
        ],
      },
    ],
  },
  {
    category: "Project Management",
    integrations: [
      {
        id: "jira",
        title: "Jira",
        description:
          "Link flag changes to Jira issues for traceability. Create Jira issues from flag change events. Full audit trail linking flag lifecycle to project management.",
        icon: <Bell className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Flag-to-issue linking",
          "Issue creation from flag events",
          "Full audit trail",
          "Project traceability",
        ],
        code: {
          lang: "json",
          label: "Jira Link",
          code: `{
  "flag_key": "new-search",
  "jira_issue": "PROJ-1234",
  "change": "enabled: false → true",
  "actor": "dev@company.com"
}

# Sentry error includes flag context:
{ "flags": { "new-search": true } }`,
        },
      },
    ],
  },
  {
    category: "Custom Integrations",
    integrations: [
      {
        id: "webhooks",
        title: "Webhooks",
        description:
          "HTTP webhooks with HMAC-SHA256 signatures for any custom integration. Event filtering by type. Exponential retry with delivery logging. Verify authenticity of every event.",
        icon: <Webhook className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "HMAC-SHA256 signed payloads",
          "Event filtering by type",
          "Exponential retry (3 attempts)",
          "Delivery logging and dashboard",
          "Custom secret per webhook",
        ],
        code: {
          lang: "json",
          label: "Webhook Payload",
          code: `{
  "event": "flag.state.updated",
  "data": {
    "flag_key": "new-checkout",
    "environment": "production",
    "enabled": true,
    "actor": "admin@company.com"
  }
}
// Delivered with X-Signature: sha256=<hmac>`,
        },
      },
      {
        id: "api",
        title: "REST API",
        description:
          "Full REST API for any custom integration. OpenAPI specification available. API Playground for interactive testing. Agent-optimized /v1/agent/ endpoints.",
        icon: <Terminal className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Full REST API coverage",
          "OpenAPI specification",
          "Interactive API Playground",
          "Agent-optimized endpoints",
          "Consistent JSON schemas",
        ],
      },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-20">
        <SectionReveal>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
            <Webhook className="h-3.5 w-3.5" />
            Connect Your Entire Engineering Workflow
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Integrations that{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              just work
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Slack, GitHub, Jira, Datadog, and more — plus webhooks with HMAC
            signatures for any custom integration. Connect your entire
            engineering workflow.
          </p>
        </SectionReveal>
      </section>

      {/* Integrations: CI/CD, Communication, Observability */}
      {integrationGroups
        .filter(
          (g) =>
            g.category === "CI/CD & Version Control" ||
            g.category === "Communication & Incident Response" ||
            g.category === "Observability",
        )
        .map((group, groupIdx) => (
          <section
            key={group.category}
            className={`${groupIdx % 2 === 0 ? "" : "bg-slate-50"} py-10 sm:py-16`}
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <SectionReveal>
                <h2 className="mb-8 border-l-4 border-indigo-600 pl-4 text-xl font-bold text-slate-900 sm:text-2xl">
                  {group.category}
                </h2>
              </SectionReveal>

              <div className="space-y-6 sm:space-y-8">
                {group.integrations.map((integration, i) => (
                  <SectionReveal key={integration.id} delay={i * 0.05}>
                    <FeatureCard
                      icon={integration.icon}
                      title={integration.title}
                      description={integration.description}
                      features={integration.features}
                      code={integration.code}
                      reverse={i % 2 === 1}
                    />
                  </SectionReveal>
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* Mid-page CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Connect your engineering tools
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Webhooks, REST API, and 50+ integrations included in Pro and
              Enterprise.
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

      {/* Integrations: Project Management, Custom */}
      {integrationGroups
        .filter(
          (g) =>
            g.category === "Project Management" ||
            g.category === "Custom Integrations",
        )
        .map((group, groupIdx) => (
          <section
            key={group.category}
            className={`${groupIdx % 2 === 0 ? "" : "bg-slate-50"} py-10 sm:py-16`}
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
              <SectionReveal>
                <h2 className="mb-8 border-l-4 border-indigo-600 pl-4 text-xl font-bold text-slate-900 sm:text-2xl">
                  {group.category}
                </h2>
              </SectionReveal>

              <div className="space-y-6 sm:space-y-8">
                {group.integrations.map((integration, i) => (
                  <SectionReveal key={integration.id} delay={i * 0.05}>
                    <FeatureCard
                      icon={integration.icon}
                      title={integration.title}
                      description={integration.description}
                      features={integration.features}
                      code={integration.code}
                      reverse={i % 2 === 1}
                    />
                  </SectionReveal>
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* Related features */}
      <section className="border-t border-slate-100 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Explore more capabilities
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              Integrations connect your stack. Discover the core flag engine,
              AI-powered cleanup, and enterprise security.
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
                    title: "AI Capabilities",
                    description:
                      "AI flag cleanup, anomaly detection, and incident response",
                    href: "/features/ai",
                  },
                  {
                    title: "Security & Governance",
                    description:
                      "RBAC, audit logs, SSO, approvals, and compliance",
                    href: "/features/security",
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
              Connect your stack
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start free with full Pro features for 14 days. Integrations
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
