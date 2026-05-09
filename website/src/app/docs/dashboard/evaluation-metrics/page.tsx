import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Activity,
  Gauge,
  Clock,
  Server,
  AlertTriangle,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Evaluation Metrics",
  description:
    "Understand evaluation metrics: request volume, latency percentiles (p50, p95, p99), cache hit rate, error rate. Monitor and optimize flag delivery performance.",
};

export default function EvaluationMetricsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Evaluation Metrics
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Understand the performance and health of your feature flag evaluations. Monitor request
        volume, latency percentiles, cache hit rates, and error rates to ensure flags are
        delivered fast and reliably.
      </p>

      {/* Metrics Dashboard */}
      <SectionHeading>Metrics Dashboard</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The evaluation metrics dashboard provides a real-time view of how your flags are
        performing. Access it from the sidebar under{" "}
        <strong>Metrics</strong>. The dashboard is scoped to the current project and
        environment, with support for custom time ranges.
      </p>

      {/* Key Metrics */}
      <SectionHeading>Key Metrics</SectionHeading>

      <div className="space-y-6 mb-8">
        <MetricCard
          icon={Activity}
          title="Request Volume"
          description="The total number of flag evaluation requests over the selected time period. This metric helps you understand the load on your evaluation infrastructure and identify usage patterns."
          details={[
            "Measured in requests per second (RPS) or total requests per period",
            "Break down by flag, environment, or SDK to identify top consumers",
            "Spikes may indicate a deployment or incident — correlate with your release timeline",
            "Use to right-size your infrastructure and set rate-limit thresholds",
          ]}
        />

        <MetricCard
          icon={Clock}
          title="Latency Percentiles (p50, p95, p99)"
          description="Evaluation latency measures how long it takes for the server to process a flag evaluation request and return a result. Latency is measured end-to-end on the server side."
          details={[
            <span key="p50"><strong>p50 (median)</strong> — Half of all evaluations complete faster than this value. Represents the typical user experience.</span>,
            <span key="p95"><strong>p95</strong> — 95% of evaluations are faster than this. A good indicator of real-world performance that excludes extreme outliers.</span>,
            <span key="p99"><strong>p99</strong> — 99% of evaluations are faster than this. Tracks tail latency; important for high-throughput applications where even 1% slow requests matter.</span>,
            <span key="target">FeatureSignals targets <strong>&lt;1ms p99</strong> evaluation latency (excluding network). The evaluation engine is optimized in Go for the hot path.</span>,
          ]}
        />

        <MetricCard
          icon={Database}
          title="Cache Hit Rate"
          description="The percentage of evaluations served from the in-memory ruleset cache versus those that required a database lookup. A high cache hit rate is essential for low-latency evaluations."
          details={[
            "Target: >99% cache hit rate under normal operation",
            "Cache misses occur after rule updates, flag toggles, or cache invalidation events",
            "Low cache hit rate may indicate frequent configuration changes or cache configuration issues",
            "The cache uses PG LISTEN/NOTIFY for cross-instance invalidation, ensuring all server instances stay synchronized",
          ]}
        />

        <MetricCard
          icon={AlertTriangle}
          title="Error Rate"
          description="The percentage of evaluation requests that result in an error. Errors include timeouts, invalid API keys, missing flags, and internal server errors."
          details={[
            "Target: <0.01% error rate (one error per 10,000 requests)",
            "Client errors (4xx) — invalid API keys, missing flags, malformed requests. These count against your error budget but don't indicate a server problem",
            "Server errors (5xx) — internal failures. Any 5xx rate above 0% warrants immediate investigation",
            "The error rate dashboard breaks down errors by type, flag, and SDK version for quick root-cause analysis",
          ]}
        />
      </div>

      {/* Time Range & Granularity */}
      <SectionHeading>Time Range &amp; Granularity</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The metrics dashboard supports multiple time ranges to help you analyze both
        real-time and historical performance:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li><strong>Last 1 hour</strong> — Minute-level granularity for real-time monitoring</li>
        <li><strong>Last 24 hours</strong> — Hourly granularity for daily trends</li>
        <li><strong>Last 7 days</strong> — Hourly granularity for weekly patterns</li>
        <li><strong>Last 30 days</strong> — Daily granularity for long-term trends</li>
        <li><strong>Custom range</strong> — Select any date range; granularity adjusts automatically</li>
      </ul>

      {/* Filtering & Grouping */}
      <SectionHeading>Filtering &amp; Grouping</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Slice and dice metrics to focus on what matters:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li><strong>By flag</strong> — View metrics for a single flag to identify performance issues specific to one feature.</li>
        <li><strong>By environment</strong> — Compare dev, staging, and production metrics to catch problems before they reach users.</li>
        <li><strong>By SDK</strong> — See which SDK versions are generating traffic. Identify outdated SDKs that should be upgraded.</li>
        <li><strong>By SDK type</strong> — Compare server-side vs client-side evaluation patterns.</li>
      </ul>

      {/* Performance Best Practices */}
      <SectionHeading>Performance Best Practices</SectionHeading>
      <div className="space-y-3 mb-8">
        {[
          {
            icon: Gauge,
            title: "Monitor p99 latency",
            desc: "Set alerts on p99 latency exceeding 5ms to catch performance regressions early. While FeatureSignals targets <1ms p99, network latency adds overhead — measure from your application, not just the server.",
          },
          {
            icon: Server,
            title: "Keep SDKs updated",
            desc: "Newer SDK versions include performance improvements and bug fixes. Check the SDK adoption chart in Usage Insights to see which versions your team is running.",
          },
          {
            icon: Database,
            title: "Cache strategically",
            desc: "Server SDKs maintain an in-memory cache of flag rules. Configure the polling interval balance between freshness and load. The default 30-second interval works for most use cases.",
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
            href="/docs/dashboard/flag-health"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Flag Health</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — monitor stale flags and flag-level health indicators
          </span>
        </li>
        <li>
          <Link
            href="/docs/dashboard/usage-insights"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Usage Insights</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — track flag evaluation trends and SDK adoption
          </span>
        </li>
        <li>
          <Link
            href="/docs/architecture/evaluation-engine"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Evaluation Engine Architecture</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — understand how the evaluation engine works under the hood
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

function MetricCard({
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
