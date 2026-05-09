import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Mutual Exclusion",
  description:
    "Prevent conflicting feature flags from being enabled simultaneously with mutual exclusion groups.",
};

export default function MutualExclusionPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Mutual Exclusion
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Mutual exclusion prevents two or more feature flags from being enabled for the same user
        at the same time. It&apos;s the guardrail that keeps concurrent experiments from
        interfering with each other.
      </p>

      {/* What Are Mutual Exclusion Groups */}
      <SectionHeading>What Are Mutual Exclusion Groups?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A mutual exclusion group is a named set of flags where only <strong>one</strong> can
        evaluate to a non-default value for any given user. Flags in the group are evaluated in
        priority order (by position in the group). The first flag that matches its targeting
        rules and is enabled wins — all subsequent flags in the group return their default
        values.
      </p>

      {/* When to Use */}
      <SectionHeading>When to Use Mutual Exclusion</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Overlapping experiments.</strong> If two A/B tests modify the same UI surface
          or backend path, running them simultaneously can produce misleading results. Mutual
          exclusion ensures each user only participates in one experiment.
        </li>
        <li>
          <strong>Conflicting feature variants.</strong> When you&apos;re testing two mutually
          exclusive implementations of the same feature, you need to guarantee a user only sees
          one.
        </li>
        <li>
          <strong>Resource-constrained rollouts.</strong> If you&apos;re gradually rolling out
          multiple features that share a scarce resource (database capacity, API rate limits),
          mutual exclusion prevents a user from being in multiple rollout cohorts simultaneously.
        </li>
      </ul>

      {/* Warning Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Important
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Mutual exclusion only applies when flags are in the <strong>same group</strong>{" "}
              and have the same group name. Flags in different groups (or not in any group) are
              evaluated independently.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <SectionHeading>How It Works</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Mutual exclusion is checked early in the evaluation order — after the flag existence
        check and environment enabled check, but before targeting rules. This ensures that the
        exclusion group logic runs efficiently and doesn&apos;t waste time evaluating targeting
        rules for flags that will be excluded.
      </p>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Here&apos;s the evaluation flow with mutual exclusion:
      </p>
      <CodeBlock
        language="text"
        code={`1. Flag exists?                → No: NOT_FOUND
2. Flag environment enabled?    → No: DISABLED
3. Mutual exclusion group?      → Yes: check if another flag in the same group
                                   has already won for this user
                                   → If another flag won: MUTUALLY_EXCLUDED
                                   → If no other flag won: continue
4. Prerequisites met?           → No: PREREQUISITE_FAILED
5. Targeting rules match?       → Yes: TARGETED (rule value)
6. Percentage rollout?          → In bucket: ROLLOUT / Out: FALLTHROUGH
7. A/B variant assignment?      → Yes: VARIANT
8. None of the above            → FALLTHROUGH`}
      />

      {/* Example */}
      <SectionHeading>Example: Two Conflicting Experiments</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Imagine you&apos;re running two experiments simultaneously:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Flag</Th>
            <Th>Experiment</Th>
            <Th>Group</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td><InlineCode>checkout-redesign</InlineCode></Td>
            <Td>Complete UI overhaul of the checkout flow</Td>
            <Td><InlineCode>checkout-experiments</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><InlineCode>checkout-one-click</InlineCode></Td>
            <Td>One-click purchase for returning customers</Td>
            <Td><InlineCode>checkout-experiments</InlineCode></Td>
          </Tr>
        </tbody>
      </SimpleTable>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Both flags are in the <InlineCode>checkout-experiments</InlineCode> mutual exclusion
        group. When a user starts checkout:
      </p>
      <ol className="list-decimal pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Evaluate <InlineCode>checkout-redesign</InlineCode></strong> — If the user is
          targeted (e.g., 50% rollout), they get the redesigned checkout.{" "}
          <InlineCode>checkout-one-click</InlineCode> is now <strong>excluded</strong> for this
          user.
        </li>
        <li>
          <strong>Evaluate <InlineCode>checkout-one-click</InlineCode></strong> — The engine
          sees that <InlineCode>checkout-redesign</InlineCode> already won in the{" "}
          <InlineCode>checkout-experiments</InlineCode> group. It returns{" "}
          <InlineCode>MUTUALLY_EXCLUDED</InlineCode> and the default value (OFF).
        </li>
      </ol>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        This guarantees each user sees exactly one checkout experiment at a time, preserving the
        integrity of both tests.
      </p>

      {/* Configuring Mutual Exclusion */}
      <SectionHeading>Configuring Mutual Exclusion</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Set the <InlineCode>mutual_exclusion_group</InlineCode> property when creating or
        updating a flag. All flags with the same group name are mutually exclusive:
      </p>
      <CodeBlock
        language="bash"
        code={`curl -X PATCH https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/$FLAG_ID \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mutual_exclusion_group": "checkout-experiments"
  }'`}
      />

      {/* Best Practices */}
      <SectionHeading>Best Practices</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Name groups descriptively.</strong>{" "}
          <InlineCode>checkout-experiments</InlineCode> is clearer than{" "}
          <InlineCode>group-1</InlineCode>.
        </li>
        <li>
          <strong>Keep groups focused.</strong> Only add flags that genuinely conflict. Overly
          broad groups can unintentionally suppress valid experiments.
        </li>
        <li>
          <strong>Be deliberate about order.</strong> Flags are evaluated in priority order
          within the group. If one experiment is higher priority, put it first.
        </li>
        <li>
          <strong>Document the group.</strong> Add a comment or description explaining why the
          flags are mutually exclusive. Future you (and your teammates) will thank you.
        </li>
        <li>
          <strong>Remove flags from the group after the experiment ends.</strong> Archiving
          a flag doesn&apos;t automatically remove it from the mutual exclusion group.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
          { label: "Prerequisites — Chain flags together", href: "/docs/core-concepts/prerequisites" },
          { label: "Feature Flags — Flag types and structure", href: "/docs/core-concepts/feature-flags" },
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
  return (
    <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
