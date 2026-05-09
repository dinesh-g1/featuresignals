import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Clock,
  Archive,
  AlertTriangle,
  Calendar,
  BarChart3,
  Skull,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Flag Health",
  description:
    "Monitor flag health: stale flags, flags with no evaluations, flags approaching expiration, flags with high error rates. Keep your codebase clean with actionable health insights.",
};

export default function FlagHealthPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Flag Health
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Flag Health monitors the lifecycle of every feature flag in your
        project, surfacing stale flags, flags approaching expiration, flags with
        no evaluations, and flags with elevated error rates — so you can keep
        your codebase clean and your flag debt low.
      </p>

      {/* What is Flag Health */}
      <SectionHeading>What is Flag Health?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Feature flags are meant to be temporary. Over time, flags that are never
        cleaned up accumulate as <strong>technical debt</strong> — cluttering
        your codebase, slowing down evaluation, and increasing the risk of
        accidental exposure. Flag Health provides automated analysis of every
        flag in your project to help you identify and remediate problematic
        flags before they become liabilities.
      </p>

      {/* Health Indicators */}
      <SectionHeading>Health Indicators</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Each flag receives health scores across several dimensions. Flags with
        issues are surfaced in the Flag Health dashboard with specific,
        actionable recommendations:
      </p>

      <div className="space-y-4 mb-8">
        <HealthCard
          icon={Clock}
          title="Stale Flags"
          severity="warning"
          description="Flags that haven't been evaluated in the configured time window (default: 30 days). Stale flags may indicate features that have been fully rolled out and whose flags were never removed from the code."
          actions={[
            "Verify the feature is fully released and stable",
            "Remove the flag from your codebase",
            "Archive the flag in FlagEngine",
          ]}
        />

        <HealthCard
          icon={Skull}
          title="Zombie Flags"
          severity="danger"
          description="Flags that are permanently ON or OFF in all environments (100% rollout or 0%) and haven't changed state in 60+ days. These are flags that have effectively become dead code — the flag check in your code always returns the same value."
          actions={[
            "Remove the flag check from your code — it no longer serves a purpose",
            "Delete the old code path that's no longer reachable",
            "Archive the flag in FlagEngine",
          ]}
        />

        <HealthCard
          icon={BarChart3}
          title="No Evaluations"
          severity="info"
          description="Flags that exist in FlagEngine but have never received a single evaluation request. These may be newly created flags that haven't been deployed yet, or abandoned experiments."
          actions={[
            "Check if the flag is referenced in your codebase",
            "If the flag is for a future feature, set an expiration date as a reminder",
            "If the flag is abandoned, archive it",
          ]}
        />

        <HealthCard
          icon={Calendar}
          title="Approaching Expiration"
          severity="warning"
          description="Flags with an expiration date set within the next 7 days. Expiration dates are optional metadata you can set on any flag to remind your team to clean it up by a target date."
          actions={[
            "Review whether the feature rollout is on track",
            "Extend the expiration if more time is needed",
            "Begin cleanup if the feature is fully released",
          ]}
        />

        <HealthCard
          icon={AlertTriangle}
          title="High Error Rate"
          severity="danger"
          description="Flags where more than 1% of evaluation requests result in errors. This may indicate a misconfigured flag, a broken SDK integration, or a flag referencing a deleted segment."
          actions={[
            "Check the Target Inspector to see if the flag evaluates correctly",
            "Verify that referenced segments and prerequisites still exist",
            "Review SDK logs for detailed error messages",
          ]}
        />
      </div>

      {/* Using the Flag Health Dashboard */}
      <SectionHeading>Using the Flag Health Dashboard</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The Flag Health dashboard is accessible from the sidebar under{" "}
        <strong>Health</strong>. The dashboard provides:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Health summary</strong> — Total counts by health category:
          healthy, stale, zombie, no evaluations, expiring, and error flags.
        </li>
        <li>
          <strong>Flag list</strong> — Sortable, filterable list of all flags
          with their health status. Click any flag to see detailed health
          information and recommendations.
        </li>
        <li>
          <strong>Trend charts</strong> — See how your flag health has changed
          over time. A growing number of stale flags indicates a cleanup gap.
        </li>
        <li>
          <strong>Bulk actions</strong> — Archive multiple stale or zombie flags
          in one operation, or extend expiration dates in bulk.
        </li>
      </ul>

      {/* Health Score */}
      <SectionHeading>Health Score</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Each flag receives a composite <strong>Health Score</strong> from 0 to
        100, calculated from the indicators above. The score helps you
        prioritize which flags to address first:
      </p>
      <div className="space-y-2 mb-6">
        {[
          {
            range: "80–100",
            label: "Healthy",
            color: "--signal-fg-success",
            bg: "--signal-bg-success-muted",
          },
          {
            range: "50–79",
            label: "Needs Attention",
            color: "--signal-fg-warning",
            bg: "--signal-bg-warning-muted",
          },
          {
            range: "0–49",
            label: "At Risk",
            color: "--signal-fg-danger",
            bg: "--signal-bg-danger-muted",
          },
        ].map((tier) => (
          <div
            key={tier.label}
            className="flex items-center gap-3 p-2 rounded-md"
            style={{ backgroundColor: `var(${tier.bg})` }}
          >
            <span
              className="text-sm font-mono font-bold"
              style={{ color: `var(${tier.color})` }}
            >
              {tier.range}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: `var(${tier.color})` }}
            >
              {tier.label}
            </span>
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <SectionHeading>Best Practices for Flag Hygiene</SectionHeading>
      <div className="space-y-3 mb-8">
        {[
          {
            icon: Zap,
            title: "Set expiration dates on every flag",
            desc: "When you create a flag, set an expiration date 30–60 days out. This creates a forcing function to either clean up the flag or consciously extend it. Flags without expiration dates tend to live forever.",
          },
          {
            icon: Archive,
            title: "Archive flags as soon as they're removed from code",
            desc: "The flag removal process isn't complete until the flag is archived in FlagEngine. An archived flag still appears in audit logs but is hidden from active lists and always returns its default value.",
          },
          {
            icon: Heart,
            title: "Review Flag Health weekly",
            desc: "Make flag health review part of your team's weekly routine. Five minutes a week prevents months of accumulated flag debt. The AI Janitor can automate this review with scheduled PRs.",
          },
        ].map((practice) => {
          const Icon = practice.icon;
          return (
            <div
              key={practice.title}
              className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
            >
              <Icon
                size={16}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  {practice.title}
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)]">
                  {practice.desc}
                </p>
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
            href="/docs/dashboard/usage-insights"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Usage Insights</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — track evaluation trends and SDK adoption
          </span>
        </li>
        <li>
          <Link
            href="/docs/advanced/ai-janitor"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>AI Janitor</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — automate stale flag detection and cleanup PRs
          </span>
        </li>
        <li>
          <Link
            href="/docs/core-concepts/flag-lifecycle"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Flag Lifecycle</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — understand the full lifecycle from creation to cleanup
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

interface HealthCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  severity: "info" | "warning" | "danger";
  description: string;
  actions: string[];
}

const severityStyles: Record<
  HealthCardProps["severity"],
  { border: string; bg: string; fg: string }
> = {
  info: {
    border: "--signal-border-accent-muted",
    bg: "--signal-bg-accent-muted",
    fg: "--signal-fg-accent",
  },
  warning: {
    border: "--signal-border-warning-emphasis",
    bg: "--signal-bg-warning-muted",
    fg: "--signal-fg-warning",
  },
  danger: {
    border: "--signal-border-danger-emphasis",
    bg: "--signal-bg-danger-muted",
    fg: "--signal-fg-danger",
  },
};

function HealthCard({
  icon: Icon,
  title,
  severity,
  description,
  actions,
}: HealthCardProps) {
  const styles = severityStyles[severity];
  return (
    <div
      className="p-4 rounded-lg border-l-4"
      style={{
        borderLeftColor: `var(${styles.fg})`,
        borderColor: `var(${styles.border})`,
        backgroundColor: `var(--signal-bg-primary)`,
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <span style={{ color: `var(${styles.fg})` }}>
          <Icon size={18} className="mt-0.5 shrink-0" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
            {title}
          </p>
          <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <div className="ml-9">
        <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] mb-1 uppercase tracking-wide">
          Recommended Actions
        </p>
        <ul className="list-disc pl-4 space-y-0.5">
          {actions.map((action, i) => (
            <li key={i} className="text-xs text-[var(--signal-fg-primary)]">
              {action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
