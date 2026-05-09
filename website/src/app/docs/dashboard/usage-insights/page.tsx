import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Code,
  Calendar,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Usage Insights",
  description:
    "Track flag usage: most/least evaluated flags, evaluation trends over time, team usage breakdown, SDK version adoption. Understand how your team uses feature flags.",
};

export default function UsageInsightsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Usage Insights
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Track how your team uses feature flags across projects, environments, and SDKs.
        Usage Insights gives you the data you need to optimize flag adoption, identify
        underused or overused flags, and plan capacity.
      </p>

      {/* Overview */}
      <SectionHeading>Overview</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Usage Insights provides a high-level view of flag evaluation activity across your
        organization. Access it from the sidebar under{" "}
        <strong>Insights</strong>. The dashboard aggregates data across all projects and
        environments to give you a complete picture of flag usage.
      </p>

      {/* Key Insights */}
      <SectionHeading>Key Insights</SectionHeading>

      <div className="space-y-6 mb-8">
        <InsightCard
          icon={TrendingUp}
          title="Most Evaluated Flags"
          description="Flags with the highest evaluation volume over the selected time period. These are your critical-path flags — changes to them have the largest blast radius."
          details={[
            "Top 10 flags by request volume",
            "Compare with the previous period to see trending flags",
            "Use to prioritize monitoring and alerting on high-traffic flags",
            "High-volume flags that are stale indicate urgent cleanup needs",
          ]}
        />

        <InsightCard
          icon={TrendingDown}
          title="Least Evaluated Flags"
          description="Flags with the lowest evaluation volume. Some may be for edge-case features, but many are candidates for archival — especially if they've been in this state for weeks."
          details={[
            "Bottom 10 flags by request volume",
            "Flags with zero evaluations in the last 30 days are flagged for review",
            "Cross-reference with Flag Health to identify cleanup candidates",
            "Low-usage flags in production may indicate failed feature rollouts",
          ]}
        />

        <InsightCard
          icon={Activity}
          title="Evaluation Trends Over Time"
          description="Historical evaluation volume trends help you understand how flag usage grows with your application. Spot anomalies, seasonal patterns, and growth trajectories."
          details={[
            "Daily, weekly, and monthly aggregation views",
            "Compare current period vs previous period for growth metrics",
            "Overlay deployment events to correlate usage spikes with releases",
            "Export trend data for capacity planning and stakeholder reporting",
          ]}
        />

        <InsightCard
          icon={Users}
          title="Team Usage Breakdown"
          description="See which teams and projects are the heaviest users of feature flags. Understand adoption patterns across your organization."
          details={[
            "Break down by project to see per-team flag usage",
            "Compare evaluation volume across teams to identify power users",
            "Track new project onboarding over time",
            "Identify teams that may benefit from additional training or support",
          ]}
        />

        <InsightCard
          icon={Code}
          title="SDK Version Adoption"
          description="Track which SDKs and versions your applications are using. Identify outdated SDKs that should be upgraded to receive performance improvements, bug fixes, and new features."
          details={[
            "Distribution of SDK types: Go, Node.js, Python, Java, .NET, Ruby, React, Vue",
            "Version breakdown for each SDK type",
            "Highlight deprecated SDK versions that are no longer supported",
            "Track adoption of new SDK releases over time",
          ]}
        />
      </div>

      {/* Team Adoption Dashboard */}
      <SectionHeading>Team Adoption Dashboard</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The team adoption section helps you understand how feature flags are being used
        across your engineering organization:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Active projects</strong> — Number of projects with at least one evaluation in
          the last 30 days.
        </li>
        <li>
          <strong>Flags per project</strong> — Distribution of flag counts across projects.
          Projects with very high flag counts may benefit from cleanup.
        </li>
        <li>
          <strong>Environments used</strong> — Adoption of dev, staging, and production
          environments across projects. Teams using only production may be missing out on
          pre-release testing.
        </li>
        <li>
          <strong>Flag types used</strong> — Distribution of boolean vs string/number/JSON
          flags. Most teams start with booleans and expand to structured types as they mature.
        </li>
      </ul>

      {/* Data Retention */}
      <SectionHeading>Data Retention &amp; Privacy</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Usage Insights data is aggregated and anonymized. Individual user keys are never
        stored in the insights pipeline — only aggregate counts are retained.
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Granular data</strong> (per-flag, per-environment) retained for 90 days
        </li>
        <li>
          <strong>Aggregated data</strong> (daily rollups) retained for 2 years
        </li>
        <li>
          <strong>SDK version data</strong> retained indefinitely for adoption tracking
        </li>
        <li>
          Data is stored in your FeatureSignals database — nothing leaves your infrastructure
        </li>
      </ul>

      {/* Using Insights Effectively */}
      <SectionHeading>Using Insights Effectively</SectionHeading>
      <div className="space-y-3 mb-8">
        {[
          {
            icon: Calendar,
            title: "Monthly flag review",
            desc: "Schedule a monthly review of Usage Insights alongside Flag Health. Identify flags that are no longer needed, teams that need support, and SDKs that need upgrading.",
          },
          {
            icon: TrendingUp,
            title: "Capacity planning",
            desc: "Use evaluation trend data to forecast growth and plan infrastructure capacity. A 20% month-over-month growth in evaluations means you should plan for ~9x growth annually.",
          },
          {
            icon: Code,
            title: "SDK upgrade campaigns",
            desc: "When you release a new SDK version with important fixes, use the SDK adoption chart to track the upgrade rollout and follow up with teams still on old versions.",
          },
        ].map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.title}
              className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
            >
              <Icon size={16} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">{tip.title}</p>
                <p className="text-xs text-[var(--signal-fg-secondary)]">{tip.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/dashboard/evaluation-metrics"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Evaluation Metrics</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — deep dive into latency, cache, and error metrics
          </span>
        </li>
        <li>
          <Link
            href="/docs/dashboard/flag-health"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Flag Health</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — identify and remediate stale and zombie flags
          </span>
        </li>
        <li>
          <Link
            href="/docs/sdks/overview"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>SDK Overview</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — explore all available SDKs and their latest versions
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function InsightCard({
  icon: Icon,
  title,
  description,
  details,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  details: React.ReactNode[];
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]">
      <div className="flex items-start gap-3 mb-3">
        <Icon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-1">{title}</h3>
          <p className="text-sm text-[var(--signal-fg-secondary)]">{description}</p>
        </div>
      </div>
      <ul className="list-disc pl-9 space-y-1 text-sm text-[var(--signal-fg-primary)]">
        {details.map((detail, i) => (
          <li key={i}>{detail}</li>
        ))}
      </ul>
    </div>
  );
}
