import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Feature Flags",
  description:
    "Learn what feature flags are, how they work, and why they are essential for modern software development and continuous delivery.",
};

export default function FeatureFlagsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Feature Flags
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        A feature flag (also called a feature toggle) is a mechanism that lets you enable or disable
        functionality in your application without deploying new code. FeatureSignals supports
        multiple flag types for different use cases.
      </p>

      {/* Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Lightbulb size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Open in Flag Engine
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Manage your feature flags directly in the{" "}
              <a
                href="https://app.featuresignals.com/flags"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                Flag Engine →
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Flag Types */}
      <SectionHeading>Flag Types</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Use Case</Th>
          </tr>
        </thead>
        <tbody>
          <Tr><Td><InlineCode>boolean</InlineCode></Td><Td><InlineCode>true</InlineCode> / <InlineCode>false</InlineCode></Td><Td>Simple on/off toggles</Td></Tr>
          <Tr><Td><InlineCode>string</InlineCode></Td><Td>Any text</Td><Td>Config values, UI variants</Td></Tr>
          <Tr><Td><InlineCode>number</InlineCode></Td><Td>Integer or float</Td><Td>Limits, thresholds, tuning</Td></Tr>
          <Tr><Td><InlineCode>json</InlineCode></Td><Td>Any JSON object</Td><Td>Complex configuration</Td></Tr>
          <Tr><Td><InlineCode>ab</InlineCode></Td><Td>Variant assignment</Td><Td>A/B experiments with weighted variants</Td></Tr>
        </tbody>
      </SimpleTable>

      {/* Flag Structure */}
      <SectionHeading>Flag Structure</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Every flag has these properties:</p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Property</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr><Td><InlineCode>key</InlineCode></Td><Td>Unique identifier used in SDK code (immutable)</Td></Tr>
          <Tr><Td><InlineCode>name</InlineCode></Td><Td>Human-readable display name</Td></Tr>
          <Tr><Td><InlineCode>description</InlineCode></Td><Td>Optional description</Td></Tr>
          <Tr><Td><InlineCode>flag_type</InlineCode></Td><Td>One of: <InlineCode>boolean</InlineCode>, <InlineCode>string</InlineCode>, <InlineCode>number</InlineCode>, <InlineCode>json</InlineCode>, <InlineCode>ab</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>default_value</InlineCode></Td><Td>Value returned when the flag is disabled</Td></Tr>
          <Tr><Td><InlineCode>category</InlineCode></Td><Td>Toggle category: <InlineCode>release</InlineCode>, <InlineCode>experiment</InlineCode>, <InlineCode>ops</InlineCode>, or <InlineCode>permission</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>status</InlineCode></Td><Td>Lifecycle status: <InlineCode>active</InlineCode>, <InlineCode>rolled_out</InlineCode>, <InlineCode>deprecated</InlineCode>, or <InlineCode>archived</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>tags</InlineCode></Td><Td>Array of strings for organization</Td></Tr>
          <Tr><Td><InlineCode>prerequisites</InlineCode></Td><Td>Other flags that must be enabled first</Td></Tr>
          <Tr><Td><InlineCode>mutual_exclusion_group</InlineCode></Td><Td>Group name for mutually exclusive flags</Td></Tr>
          <Tr><Td><InlineCode>expires_at</InlineCode></Td><Td>Auto-disable after this timestamp</Td></Tr>
        </tbody>
      </SimpleTable>

      {/* Flag States */}
      <SectionHeading>Flag States</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A flag&apos;s configuration is <strong>per-environment</strong>. The same flag can be ON in{" "}
        <InlineCode>dev</InlineCode> and OFF in <InlineCode>production</InlineCode>. Each environment
        state controls:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Enabled/Disabled</strong> — master toggle
        </li>
        <li>
          <strong>Targeting Rules</strong> — conditional value delivery
        </li>
        <li>
          <strong>Percentage Rollout</strong> — gradual rollout to a percentage of users
        </li>
        <li>
          <strong>Variants</strong> — A/B experiment variant weights (for <InlineCode>ab</InlineCode> type)
        </li>
        <li>
          <strong>Scheduled Enable/Disable</strong> — automatic toggling at a future time
        </li>
      </ul>

      {/* Evaluation Flow */}
      <SectionHeading>Evaluation Flow</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When an SDK evaluates a flag, the engine follows this order:
      </p>
      <CodeBlock
        language="text"
        code={`1. Flag exists?              → No: NOT_FOUND
2. Flag expired?             → Yes: DISABLED (default value)
3. Environment state enabled? → No: DISABLED (default value)
4. Mutual exclusion winner?  → No: MUTUALLY_EXCLUDED (default value)
5. Prerequisites met?        → No: PREREQUISITE_FAILED (default value)
6. Targeting rules match?    → Yes: TARGETED or ROLLOUT (rule value)
7. Percentage rollout?       → In bucket: ROLLOUT / Out: FALLTHROUGH
8. A/B variant assignment?   → Yes: VARIANT (variant value)
9. None of the above         → FALLTHROUGH (default/state value)`}
      />

      {/* Default Values */}
      <SectionHeading>Default Values</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Default values work at two levels:
      </p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Flag-level default</strong> — Defined when creating the flag. Returned when the
          flag is disabled.
        </li>
        <li>
          <strong>Environment-level default</strong> — Optional override per environment. Takes
          precedence when set.
        </li>
        <li>
          <strong>SDK fallback</strong> — The value you pass to{" "}
          <InlineCode>boolVariation(..., fallback)</InlineCode>. Used when the flag doesn&apos;t
          exist or there&apos;s a network error.
        </li>
      </ol>

      {/* Best Practices */}
      <SectionHeading>Best Practices</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Use descriptive keys</strong> — <InlineCode>enable-dark-mode</InlineCode> is better
          than <InlineCode>flag-1</InlineCode>
        </li>
        <li>
          <strong>Set a category</strong> — Classify each flag as release, experiment, ops, or
          permission to set lifecycle expectations (see{" "}
          <Link
            href="/docs/core-concepts/toggle-categories"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Toggle Categories
          </Link>
          )
        </li>
        <li>
          <strong>Track status</strong> — Move flags through{" "}
          <InlineCode>active</InlineCode> → <InlineCode>rolled_out</InlineCode> →{" "}
          <InlineCode>deprecated</InlineCode> → <InlineCode>archived</InlineCode> as they progress
        </li>
        <li>
          <strong>Set expiration dates</strong> — Prevent stale flags from accumulating
        </li>
        <li>
          <strong>Use tags</strong> — Organize flags by team, feature area, or release
        </li>
        <li>
          <strong>Start with boolean</strong> — Only use complex types when needed
        </li>
        <li>
          <strong>Clean up</strong> — Delete flags after full rollout
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Toggle Categories", href: "/docs/core-concepts/toggle-categories" },
          { label: "Projects & Environments", href: "/docs/core-concepts/projects-and-environments" },
          { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
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

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
