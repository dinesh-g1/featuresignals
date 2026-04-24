import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";
import {
  ArrowRight,
  Check,
  Cloud,
  GitBranch,
  MessageSquare,
  Database,
  Webhook,
  ExternalLink,
  Terminal,
  Code,
  Monitor,
  Bell,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect FeatureSignals with your existing toolchain: Terraform, Slack, GitHub, Jira, Datadog, New Relic, webhooks, and more.",
};

const integrationCategories = [
  {
    title: "Infrastructure as Code",
    description: "Manage flags alongside your infrastructure definitions.",
    integrations: [
      {
        name: "Terraform Provider",
        summary:
          "Declaratively manage flags, environments, projects, segments, and targeting rules as HCL. Full CRUD support with plan/apply workflows.",
        href: "https://registry.terraform.io/providers/featuresignals",
        external: true,
        icon: Cloud,
        features: [
          "Create, read, update, delete flags and environments",
          "Manage targeting rules and percentage rollouts",
          "Import existing resources into Terraform state",
          "Drift detection between Terraform state and live API",
        ],
      },
      {
        name: "Pulumi Provider",
        summary:
          "Manage feature flags using real programming languages (TypeScript, Python, Go, C#). Define flags as infrastructure with full type safety.",
        href: "https://docs.featuresignals.com/integrations/pulumi",
        external: true,
        icon: Code,
        features: [
          "TypeScript, Python, Go, and .NET SDKs",
          "Stack-based environment management",
          "Seamless mixing with cloud resources",
          "Preview changes before applying",
        ],
      },
      {
        name: "Kubernetes Operator",
        summary:
          "Define flags as Kubernetes Custom Resources. Sync flag state from your cluster to FeatureSignals automatically.",
        href: "https://docs.featuresignals.com/integrations/kubernetes",
        external: true,
        icon: Monitor,
        features: [
          "CRDs for flags, environments, and segments",
          "Automatic reconciliation loop",
          "Seamless with ArgoCD / Flux GitOps workflows",
          "RBAC-integrated with Kubernetes service accounts",
        ],
      },
    ],
  },
  {
    title: "Communication & Collaboration",
    description: "Keep your team informed without leaving your chat platform.",
    integrations: [
      {
        name: "Slack",
        summary:
          "Receive real-time notifications when flags are created, updated, toggled, or deleted. Approve change requests directly from Slack.",
        href: "https://docs.featuresignals.com/integrations/slack",
        external: true,
        icon: MessageSquare,
        features: [
          "Real-time flag change notifications to channels",
          "Approve/reject change requests without leaving Slack",
          "Slash commands for flag status lookups",
          "Custom notification routing by environment",
        ],
      },
      {
        name: "Discord",
        summary:
          "Webhook-based Discord integration notifies your team of flag changes, approval requests, and incident alerts.",
        href: "https://docs.featuresignals.com/integrations/discord",
        external: true,
        icon: MessageSquare,
        features: [
          "Flag lifecycle notifications",
          "Role-tagged alerts for approvals",
          "Environment-specific webhook channels",
          "Embedded flag status cards",
        ],
      },
      {
        name: "Microsoft Teams",
        summary:
          "Connect FeatureSignals to your Teams channels. Get notified of flag changes and approve requests without switching contexts.",
        href: "https://docs.featuresignals.com/integrations/teams",
        external: true,
        icon: Users,
        features: [
          "Adaptive Cards for rich flag notifications",
          "Actionable approval workflows",
          "Environment-specific channel routing",
          "Compliance-ready audit trail",
        ],
      },
    ],
  },
  {
    title: "CI/CD & Version Control",
    description:
      "Embed feature flag management into your development pipeline.",
    integrations: [
      {
        name: "GitHub",
        summary:
          "Link flags to repositories. AI Janitor opens PRs to remove stale flag code. Flag changes appear as commit status checks.",
        href: "https://docs.featuresignals.com/integrations/github",
        external: true,
        icon: GitBranch,
        features: [
          "Link flags to GitHub repositories and pull requests",
          "AI Janitor auto-generates cleanup PRs",
          "Commit status checks for flag validation",
          "GitHub Actions for flag deployment gates",
        ],
      },
      {
        name: "GitLab",
        summary:
          "Deep integration with GitLab CI/CD. Use flag status as pipeline gates, trigger canary deployments, and sync flag state with merge requests.",
        href: "https://docs.featuresignals.com/integrations/gitlab",
        external: true,
        icon: GitBranch,
        features: [
          "Merge request flag annotations",
          "CI/CD pipeline gates based on flag state",
          "Auto-sync flag definitions with repository",
          "Webhook-triggered flag promotions",
        ],
      },
      {
        name: "Bitbucket Pipelines",
        summary:
          "Use feature flags as deployment gates in Bitbucket Pipelines. Automatically promote flags through environments on merge.",
        href: "https://docs.featuresignals.com/integrations/bitbucket",
        external: true,
        icon: GitBranch,
        features: [
          "Pipeline step conditions based on flag state",
          "Automatic flag promotion on merge",
          "Pull request flag annotations",
          "Branch-based environment mapping",
        ],
      },
      {
        name: "Jenkins",
        summary:
          "Integrate feature flag checks into your Jenkins pipeline stages. Gate deployments, run canary analysis, and record flag state in build artifacts.",
        href: "https://docs.featuresignals.com/integrations/jenkins",
        external: true,
        icon: Terminal,
        features: [
          "Jenkins plugin for pipeline integration",
          "Flag state as build parameters",
          "Canary analysis stages",
          "Build artifact flag annotations",
        ],
      },
    ],
  },
  {
    title: "Monitoring & Observability",
    description:
      "Correlate flag changes with application performance and errors.",
    integrations: [
      {
        name: "Datadog",
        summary:
          "Ship flag evaluation events to Datadog as custom metrics. Correlate deployment flag changes with APM traces and dashboard anomalies.",
        href: "https://docs.featuresignals.com/integrations/datadog",
        external: true,
        icon: Database,
        features: [
          "Flag evaluation metrics as Datadog custom metrics",
          "Automatic dashboard widgets for flag state",
          "Correlate flag changes with APM traces",
          "Monitor-based alerting on flag evaluation anomalies",
        ],
      },
      {
        name: "New Relic",
        summary:
          "Send flag evaluation data to New Relic. Build dashboards that overlay flag state with application performance and error rates.",
        href: "https://docs.featuresignals.com/integrations/newrelic",
        external: true,
        icon: Bell,
        features: [
          "Custom event integration with New Relic",
          "Flag state overlay on APM dashboards",
          "Anomaly detection on flag evaluation patterns",
          "NRQL queries for flag impact analysis",
        ],
      },
      {
        name: "Grafana",
        summary:
          "Visualize flag evaluation metrics in your existing Grafana dashboards. Use our Prometheus endpoint for direct metric scraping.",
        href: "https://docs.featuresignals.com/integrations/grafana",
        external: true,
        icon: Monitor,
        features: [
          "Prometheus metrics endpoint for scraping",
          "Pre-built Grafana dashboard templates",
          "Flag state annotations on time-series graphs",
          "Alert rules based on evaluation metrics",
        ],
      },
      {
        name: "Sentry",
        summary:
          "Correlate error events with active feature flags. Know exactly which flags were active when an error occurred in production.",
        href: "https://docs.featuresignals.com/integrations/sentry",
        external: true,
        icon: Bell,
        features: [
          "Flag context in Sentry error events",
          "Breadcrumb trail of flag evaluations",
          "Flag state snapshots per error grouping",
          "Identify flag-related regressions instantly",
        ],
      },
    ],
  },
  {
    title: "Project Management",
    description: "Link flag changes to tickets, epics, and sprints.",
    integrations: [
      {
        name: "Jira",
        summary:
          "Link flags to Jira issues. Flag changes automatically update ticket status. AI Janitor PRs include Jira issue references.",
        href: "https://docs.featuresignals.com/integrations/jira",
        external: true,
        icon: Database,
        features: [
          "Two-way link between flags and Jira issues",
          "Automatic ticket transitions on flag lifecycle",
          "Jira issue references in AI Janitor PRs",
          "Sprint-level flag change reporting",
        ],
      },
      {
        name: "Linear",
        summary:
          "Connect flags to Linear issues. See flag status inline in your issue views. AI Janitor cleanup PRs reference related Linear tickets.",
        href: "https://docs.featuresignals.com/integrations/linear",
        external: true,
        icon: GitBranch,
        features: [
          "Linear issue references in flag metadata",
          "Flag status widget in Linear issue sidebar",
          "Auto-close issues when flags reach 100% rollout",
          "Team-level flag governance summaries",
        ],
      },
      {
        name: "Asana",
        summary:
          "Link flags to Asana tasks and projects. Track which features are behind which flags directly from your Asana workspace.",
        href: "https://docs.featuresignals.com/integrations/asana",
        external: true,
        icon: Database,
        features: [
          "Task-to-flag linking and synchronization",
          "Flag status in Asana custom fields",
          "Automated task updates on flag promotion",
          "Project-level flag inventory views",
        ],
      },
    ],
  },
  {
    title: "Custom Extensibility",
    description: "Extend FeatureSignals to fit your unique workflow.",
    integrations: [
      {
        name: "Webhooks",
        summary:
          "Send flag lifecycle events to any HTTP endpoint. Trigger deploys, notify incident response, or sync to your internal tools.",
        href: "https://docs.featuresignals.com/integrations/webhooks",
        external: true,
        icon: Webhook,
        features: [
          "Flag created, updated, deleted, and toggled events",
          "Approval request and resolution events",
          "Custom payload templating",
          "Retry with exponential backoff",
        ],
      },
      {
        name: "REST API + OpenAPI",
        summary:
          "Full REST API for programmatic flag management. OpenAPI 3.1 specification for client generation. Rate-limited at 10,000 req/min.",
        href: "https://docs.featuresignals.com/api-playground",
        external: true,
        icon: Terminal,
        features: [
          "Complete CRUD for flags, environments, segments",
          "OpenAPI 3.1 specification (downloadable)",
          "Interactive API playground",
          "Personal access tokens for automation",
        ],
      },
      {
        name: "SSE Streaming",
        summary:
          "Real-time Server-Sent Events stream for flag changes. Build custom dashboards, chat bots, or internal tools on top of live flag state.",
        href: "https://docs.featuresignals.com/integrations/sse",
        external: true,
        icon: Bell,
        features: [
          "Real-time flag state change stream",
          "Filterable by environment and project",
          "Reconnect with last-event ID",
          "Minimal overhead — JSON over SSE",
        ],
      },
    ],
  },
];

export default function IntegrationsPage() {
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
                name: "Integrations",
                item: "https://featuresignals.com/features/integrations",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <SectionReveal>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

          <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
            <div className="flex justify-center items-center gap-3 flex-wrap">
              <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">
                Integrations
              </span>
              <span className="bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1.5 rounded-full font-mono shadow-sm font-semibold">
                20+ Integrations
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
              Integrate with your{" "}
              <span className="text-accent">existing toolchain</span>
            </h1>

            <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              FeatureSignals plugs into the tools you already use: Terraform for
              infrastructure-as-code, Slack for approvals, GitHub for
              code-linked workflows, Datadog for observability, and webhooks for
              everything else.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="https://app.featuresignals.com/register"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-all"
              >
                Start Free — 14-Day Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="https://docs.featuresignals.com/integrations/overview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-all"
              >
                View Integration Docs
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Integration categories */}
      {integrationCategories.map((category, idx) => (
        <SectionReveal key={category.title}>
          <section
            className={`mx-auto max-w-7xl px-6 py-16 sm:py-24 ${
              idx % 2 === 1 ? "bg-stone-50 border-y border-stone-100" : ""
            }`}
          >
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
                {category.title}
              </h2>
              <p className="mt-4 text-lg text-stone-600">
                {category.description}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {category.integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.name}
                    className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-bold text-stone-900">
                        {integration.name}
                      </h3>
                    </div>

                    <p className="text-sm leading-relaxed text-stone-600 mb-4 flex-1">
                      {integration.summary}
                    </p>

                    <ul className="space-y-2 mb-6">
                      {integration.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs text-stone-600"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {integration.external ? (
                      <a
                        href={integration.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                      >
                        Learn more
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={integration.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                      >
                        Learn more
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </SectionReveal>
      ))}

      {/* Migration section */}
      <SectionReveal>
        <section className="bg-stone-900 py-16 sm:py-24 px-6">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Migrate from any provider
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-300">
              We import your flags, environments, targeting rules, and SDK
              configuration from any major provider. Preserve your exact
              evaluation logic with zero code changes.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
              {(
                [
                  {
                    name: "LaunchDarkly",
                    cmd: "fs migrate --from=launchdarkly",
                    color: "text-amber-400",
                  },
                  {
                    name: "Unleash",
                    cmd: "fs migrate --from=unleash",
                    color: "text-stone-300",
                  },
                  {
                    name: "Flagsmith",
                    cmd: "fs migrate --from=flagsmith",
                    color: "text-blue-400",
                  },
                ] as const
              ).map(({ name, cmd, color }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-stone-700 bg-stone-800 p-6 text-left"
                >
                  <h3 className={`text-lg font-bold ${color} mb-2`}>{name}</h3>
                  <div className="bg-stone-900 text-stone-300 rounded-lg p-3 font-mono text-xs border border-stone-700">
                    <span className="text-accent-light">$</span> {cmd}
                    <span className="text-stone-500"> --project</span>=core
                  </div>
                  <a
                    href="https://app.featuresignals.com/register"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-light hover:text-accent transition-colors"
                  >
                    Migrate now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-light">
                <Terminal className="h-4 w-4" />
                Integrate in minutes
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Ready to connect your toolchain?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-stone-300">
                Start a free trial with full Pro features for 14 days. Self-host
                or use our cloud. No credit card required.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://app.featuresignals.com/register"
                  className="group inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl"
                >
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
