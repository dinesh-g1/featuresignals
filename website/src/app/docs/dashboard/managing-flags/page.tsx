import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Search,
  Archive,
  ToggleLeft,
  ToggleRight,
  Layers,
  Filter,
  GripVertical,
  Target,
  BarChart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Managing Flags",
  description:
    "How to create, edit, toggle, and archive flags in FlagEngine. Covers flag creation form, flag detail view, environment tabs, bulk operations, search and filter.",
};

export default function ManagingFlagsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Managing Flags
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Everything you need to create, edit, toggle, search, and archive feature
        flags in the FlagEngine dashboard.
      </p>

      {/* Creating a Flag */}
      <SectionHeading>Creating a Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To create a new feature flag, click the{" "}
        <InlineCode>Create Flag</InlineCode> button in the top-right of the
        flags list. The creation form requires the following fields:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[var(--signal-border-default)] rounded-md">
          <thead className="bg-[var(--signal-bg-secondary)]">
            <tr>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Field
              </th>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Required
              </th>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--signal-border-default)]">
            {[
              {
                field: "Key",
                required: "Yes",
                desc: "Unique identifier used in SDK calls (e.g., new-checkout). Must be lowercase, alphanumeric with hyphens.",
              },
              {
                field: "Name",
                required: "Yes",
                desc: "Human-readable display name shown in the dashboard.",
              },
              {
                field: "Description",
                required: "No",
                desc: "Optional context about what the flag controls and why it exists.",
              },
              {
                field: "Type",
                required: "Yes",
                desc: "boolean, string, number, or JSON. Determines the kind of value the flag returns.",
              },
              {
                field: "Tags",
                required: "No",
                desc: "Key-value labels for organization and filtering (e.g., team:checkout, sprint:Q1).",
              },
            ].map((row) => (
              <tr
                key={row.field}
                className="hover:bg-[var(--signal-bg-secondary)] transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-[var(--signal-fg-primary)]">
                  {row.field}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.required}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        After creation, the flag appears in the flags list with a default state
        of <strong className="text-[var(--signal-fg-primary)]">OFF</strong> in
        all environments.
      </p>

      {/* Flag Detail View */}
      <SectionHeading>Flag Detail View</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Click any flag in the list to open its detail view. The detail page is
        organized into tabs that give you full control over the flag&apos;s
        behavior:
      </p>
      <div className="space-y-3 mb-6">
        {[
          {
            icon: ToggleRight,
            title: "Toggle",
            description:
              "Turn the flag ON or OFF for the current environment. The toggle takes effect immediately — no deploy required. For boolean flags, this is a simple switch. For string/number/JSON flags, you set the exact value to serve.",
          },
          {
            icon: Target,
            title: "Targeting",
            description:
              "Define rules that determine which users receive which variation. Combine individual user targeting, segment membership, and percentage rollouts. Rules are evaluated top-to-bottom; the first match wins.",
          },
          {
            icon: Layers,
            title: "Environments",
            description:
              "Each environment (dev, staging, production) has independent flag state and targeting rules. Use the environment tabs to switch context. A flag can be ON in dev for testing while remaining OFF in production.",
          },
          {
            icon: BarChart,
            title: "Metrics",
            description:
              "View evaluation volume, latency, and error rate for this specific flag. Drill down by environment and time range to understand usage patterns.",
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.title}
              className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
            >
              <Icon
                size={16}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  {tab.title}
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)]">
                  {tab.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Environment Tabs */}
      <SectionHeading>Environment Tabs</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Environment tabs appear at the top of the flag detail view and the flags
        list. They let you quickly switch between dev, staging, and production
        to see and manage flag states independently:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Dev</strong> — Use for local development and testing. Flags
          are typically ON here so developers can validate new features.
        </li>
        <li>
          <strong>Staging</strong> — Mirror of production configuration. Use for
          pre-release validation and QA.
        </li>
        <li>
          <strong>Production</strong> — Controls what real users see. Target
          with care — changes here affect live traffic.
        </li>
      </ul>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Each environment has its own API key (Server or Client type). Make sure
        your application uses the correct key for the environment it&apos;s
        running in.
      </p>

      {/* Toggling Flags */}
      <SectionHeading>Toggling Flags</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Toggling a flag is instantaneous. On the flag detail page:
      </p>
      <ol className="list-decimal pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Select the target environment tab (dev, staging, or production).
        </li>
        <li>
          For <strong>boolean</strong> flags, flip the toggle switch. The change
          takes effect immediately for all new evaluations.
        </li>
        <li>
          For <strong>string/number/JSON</strong> flags, enter the desired value
          and click Save.
        </li>
        <li>
          If targeting rules are enabled, the toggle acts as the{" "}
          <strong>default rule</strong> — it applies to any user who
          doesn&apos;t match a targeting rule.
        </li>
      </ol>
      <div className="p-4 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] mb-8">
        <div className="flex items-start gap-3">
          <ToggleLeft
            size={18}
            className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Instant rollback
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              If a feature causes issues in production, flip the flag OFF.
              There&apos;s no rollback, no hotfix, and no deployment — the
              feature disappears instantly for all users. This is the core value
              of feature flags: decoupling deployment from release.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <SectionHeading>Search and Filter</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The flags list includes powerful search and filter capabilities to help
        you find flags quickly, even with hundreds of flags in a project:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Search</strong> — Full-text search across flag key, name, and
          description. Results update as you type.
        </li>
        <li>
          <strong>Tag filters</strong> — Filter by one or more tags (e.g.,{" "}
          <InlineCode>team:payments</InlineCode>,{" "}
          <InlineCode>sprint:Q1</InlineCode>).
        </li>
        <li>
          <strong>Status filters</strong> — Show only enabled flags, disabled
          flags, or archived flags.
        </li>
        <li>
          <strong>Type filters</strong> — Filter by flag type: boolean, string,
          number, or JSON.
        </li>
        <li>
          <strong>Sort</strong> — Sort by name, creation date, last modified, or
          evaluation volume.
        </li>
      </ul>

      {/* Bulk Operations */}
      <SectionHeading>Bulk Operations</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When you need to make changes across multiple flags, use bulk
        operations. Select flags using the checkboxes in the flags list, then
        choose an action:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Bulk toggle</strong> — Turn multiple flags ON or OFF in a
          specific environment with a single click.
        </li>
        <li>
          <strong>Bulk archive</strong> — Archive multiple flags that are no
          longer needed. Archived flags are hidden by default but can be
          restored.
        </li>
        <li>
          <strong>Bulk tag</strong> — Add or remove tags across multiple flags
          at once.
        </li>
      </ul>

      {/* Archiving Flags */}
      <SectionHeading>Archiving Flags</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When a flag has served its purpose — the feature is fully rolled out and
        the old code path is removed — archive it to keep your flags list clean:
      </p>
      <ol className="list-decimal pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>Open the flag detail page.</li>
        <li>
          Click the <strong>Archive</strong> button in the header actions.
        </li>
        <li>Confirm the archive action.</li>
      </ol>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Archived flags are hidden from the main list but remain accessible via
        the archived filter. Evaluations for archived flags always return the
        default value. You can restore an archived flag at any time if you need
        to reference it or reactivate it.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/dashboard/env-comparison"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Environment Comparison</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — compare flag states side-by-side across environments
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
            — debug why a specific user is or isn&apos;t receiving a flag
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
            — monitor stale flags and technical debt
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

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}
