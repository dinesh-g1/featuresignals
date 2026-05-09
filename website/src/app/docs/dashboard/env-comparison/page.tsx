import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  GitCompare,
  Circle,
  CircleDot,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Environment Comparison",
  description:
    "Compare flag states across environments side-by-side. See which flags are on/off in dev vs staging vs production.",
};

export default function EnvComparisonPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Environment Comparison
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Compare feature flag states across dev, staging, and production side-by-side to
        catch configuration drift before it reaches your users.
      </p>

      {/* Overview */}
      <SectionHeading>Overview</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The Environment Comparison view shows all your flags in a matrix format with each
        environment as a column. At a glance, you can see:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>Which flags are ON or OFF in each environment</li>
        <li>Flags that differ between environments (configuration drift)</li>
        <li>Flags that are ON in production but OFF in staging (potential risk)</li>
        <li>Flags that are ON in dev but OFF everywhere else (in-progress features)</li>
      </ul>

      {/* Using the Comparison View */}
      <SectionHeading>Using the Comparison View</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To access the comparison view, navigate to{" "}
        <strong>Flags</strong> in the sidebar and click the{" "}
        <strong>Compare</strong> tab, or go directly to the comparison page from the
        environment selector dropdown. The view displays:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[var(--signal-border-default)] rounded-md">
          <thead className="bg-[var(--signal-bg-secondary)]">
            <tr>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">Flag</th>
              <th className="text-center px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">Dev</th>
              <th className="text-center px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">Staging</th>
              <th className="text-center px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">Production</th>
              <th className="text-center px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--signal-border-default)]">
            <tr className="hover:bg-[var(--signal-bg-secondary)] transition-colors">
              <td className="px-4 py-2.5 font-medium text-[var(--signal-fg-primary)]">new-checkout</td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-danger)" }}>
                  <Circle size={14} /> OFF
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--signal-bg-warning-muted)]" style={{ color: "var(--signal-fg-warning)" }}>
                  <AlertTriangle size={12} /> Drift
                </span>
              </td>
            </tr>
            <tr className="hover:bg-[var(--signal-bg-secondary)] transition-colors">
              <td className="px-4 py-2.5 font-medium text-[var(--signal-fg-primary)]">dark-mode</td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--signal-bg-success-muted)]" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={12} /> Synced
                </span>
              </td>
            </tr>
            <tr className="hover:bg-[var(--signal-bg-secondary)] transition-colors">
              <td className="px-4 py-2.5 font-medium text-[var(--signal-fg-primary)]">ai-recommendations</td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-success)" }}>
                  <CheckCircle size={14} /> ON
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-danger)" }}>
                  <Circle size={14} /> OFF
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--signal-fg-danger)" }}>
                  <Circle size={14} /> OFF
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--signal-bg-accent-muted)]" style={{ color: "var(--signal-fg-accent)" }}>
                  <CircleDot size={12} /> In Progress
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--signal-fg-secondary)] mb-8 italic">
        Example comparison view showing three flags across environments.
      </p>

      {/* Status Indicators */}
      <SectionHeading>Status Indicators</SectionHeading>
      <div className="space-y-3 mb-6">
        {[
          {
            label: "Synced",
            description: "The flag has the same state (ON or OFF) across all environments.",
            bgVar: "--signal-bg-success-muted",
            fgVar: "--signal-fg-success",
            icon: CheckCircle,
          },
          {
            label: "Drift",
            description: "The flag state differs between environments. This is expected for in-progress features but should be investigated if unintended.",
            bgVar: "--signal-bg-warning-muted",
            fgVar: "--signal-fg-warning",
            icon: AlertTriangle,
          },
          {
            label: "In Progress",
            description: "The flag is ON in dev but OFF in staging and production — likely an active feature under development.",
            bgVar: "--signal-bg-accent-muted",
            fgVar: "--signal-fg-accent",
            icon: CircleDot,
          },
        ].map((status) => {
          const Icon = status.icon;
          return (
            <div
              key={status.label}
              className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                style={{ backgroundColor: `var(${status.bgVar})` }}
              >
                <Icon size={14} style={{ color: `var(${status.fgVar})` }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">{status.label}</p>
                <p className="text-xs text-[var(--signal-fg-secondary)]">{status.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtering the Comparison View */}
      <SectionHeading>Filtering the Comparison View</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When you have many flags, use filters to focus on what matters:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Show only drift</strong> — Hide flags that are synced across all environments,
          surfacing only flags with configuration differences.
        </li>
        <li>
          <strong>Flag type</strong> — Filter to show only boolean, string, number, or JSON flags.
        </li>
        <li>
          <strong>Tags</strong> — Filter by tag to focus on flags owned by a specific team or sprint.
        </li>
        <li>
          <strong>Search</strong> — Search by flag key or name to find a specific flag.
        </li>
      </ul>

      {/* Best Practices */}
      <SectionHeading>Best Practices</SectionHeading>
      <div className="p-4 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] mb-8">
        <div className="flex items-start gap-3">
          <GitCompare size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Review drift regularly
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Make environment comparison part of your pre-release checklist. Before deploying to
              production, review the comparison view to ensure production flags match your
              intended configuration. Unintentional drift is a leading cause of &quot;it works in
              staging but not production&quot; incidents.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/dashboard/target-inspector"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Target Inspector</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — debug targeting rules for specific users
          </span>
        </li>
        <li>
          <Link
            href="/docs/dashboard/target-comparison"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Target Comparison</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — compare how two users evaluate for the same flag
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
