import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  Flag,
  Users,
  BarChart3,
  GitBranch,
  ArrowRight,
  Target,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard Overview",
  description:
    "Overview of the FlagEngine dashboard: sidebar navigation, project/environment context, flag management, and analytics.",
};

const features = [
  {
    icon: Flag,
    title: "Flag CRUD",
    description:
      "Create, read, update, and delete feature flags from the dashboard. Each flag supports boolean, string, number, and JSON variations across multiple environments.",
  },
  {
    icon: Target,
    title: "Targeting Rules Editor",
    description:
      "Define precise targeting rules with an intuitive rule builder. Combine user attributes, segments, and percentage rollouts to control exactly who sees what.",
  },
  {
    icon: Users,
    title: "Segment Management",
    description:
      "Create reusable user segments based on attributes like email domain, country, subscription tier, or custom properties. Apply segments across multiple flags.",
  },
  {
    icon: BarChart3,
    title: "Evaluation Metrics",
    description:
      "Monitor request volume, latency percentiles, cache hit rates, and error rates. Identify performance regressions and usage patterns at a glance.",
  },
  {
    icon: Settings,
    title: "Team Management",
    description:
      "Invite team members, assign roles (Admin, Editor, Viewer), and manage organization-wide settings. RBAC ensures everyone has the right level of access.",
  },
];

const sidebarItems = [
  { label: "Flags", description: "Manage feature flags and toggles" },
  { label: "Segments", description: "Define reusable user segments" },
  { label: "Environments", description: "Configure dev, staging, and production" },
  { label: "Metrics", description: "Monitor evaluation performance" },
  { label: "Team", description: "Invite members and manage roles" },
  { label: "Settings", description: "API keys, webhooks, and org config" },
];

export default function DashboardOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Dashboard Overview
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The FlagEngine dashboard is your control center for managing feature flags,
        configuring targeting rules, monitoring evaluation performance, and collaborating
        with your team — all from a single interface.
      </p>

      {/* Sidebar Navigation */}
      <SectionHeading>Sidebar Navigation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The sidebar is organized into logical sections that map to your workflow.
        Each section is scoped to the currently selected project and environment:
      </p>
      <div className="space-y-2 mb-6">
        {sidebarItems.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]"
          >
            <LayoutDashboard size={16} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">{item.label}</p>
              <p className="text-xs text-[var(--signal-fg-secondary)]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project & Environment Context */}
      <SectionHeading>Project &amp; Environment Context</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals uses a hierarchical organization model:{" "}
        <strong>Organization → Project → Environment</strong>. The dashboard
        always operates within a specific project and environment context:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Organization</strong> — Top-level tenant boundary. All projects, flags, and team
          members belong to a single organization.
        </li>
        <li>
          <strong>Project</strong> — A logical grouping of flags. Use separate projects for
          different applications, services, or teams.
        </li>
        <li>
          <strong>Environment</strong> — A deployment stage (dev, staging, production). Each
          environment has independent flag states and targeting rules.
        </li>
      </ul>
      <p className="text-[var(--signal-fg-secondary)] text-sm mb-6">
        Use the project selector in the header and the environment tabs throughout the dashboard
        to switch context. All data — flags, segments, metrics — is scoped to the active project
        and environment.
      </p>

      {/* Core Features */}
      <SectionHeading>Core Features</SectionHeading>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                    {feature.title}
                  </p>
                  <p className="text-sm text-[var(--signal-fg-secondary)]">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Getting Around */}
      <SectionHeading>Getting Around</SectionHeading>
      <div className="p-4 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] mb-8">
        <div className="flex items-start gap-3">
          <GitBranch size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Environment tabs are your primary navigation tool
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Each flag detail page and the flags list includes tabs for dev, staging, and
              production. Toggle between environments to see and manage flag states independently.
              A flag can be <strong>ON</strong> in dev, <strong>OFF</strong> in staging, and
              controlled by a gradual rollout in production — all from the same view.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/dashboard/managing-flags"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Managing Flags</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — create, edit, toggle, and archive flags
          </span>
        </li>
        <li>
          <Link
            href="/docs/dashboard/env-comparison"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Environment Comparison</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — compare flag states across environments
          </span>
        </li>
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
