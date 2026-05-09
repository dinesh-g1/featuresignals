import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Prerequisites",
  description:
    "Chain feature flags so one depends on another being enabled first — prerequisite flag dependencies.",
};

export default function PrerequisitesPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Prerequisites
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Prerequisites let you chain feature flags together so one flag depends on another being
        enabled first. Think of it as a dependency graph for your feature flags — flag B only
        activates if flag A is already ON.
      </p>

      {/* What Are Prerequisites */}
      <SectionHeading>What Are Prerequisite Flags?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A prerequisite is a flag that must evaluate to <strong>enabled</strong> (return a
        non-default value) before the dependent flag can activate. If any prerequisite is not
        met, the dependent flag returns its default value — regardless of its own enabled
        state, targeting rules, or percentage rollout configuration.
      </p>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A flag can have multiple prerequisites. <strong>All</strong> prerequisites must be met
        for the flag to evaluate normally — it&apos;s an AND relationship, not OR.
      </p>

      {/* When to Use */}
      <SectionHeading>When to Use Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Infrastructure dependencies.</strong> A feature requires a new database
          migration or a third-party service that is gated behind its own ops toggle. The
          feature flag should depend on the infrastructure flag.
        </li>
        <li>
          <strong>Feature hierarchies.</strong> A premium analytics dashboard ("analytics v2")
          depends on the base analytics feature being enabled. If base analytics is off,
          analytics v2 should not activate.
        </li>
        <li>
          <strong>Platform migrations.</strong> You&apos;re moving from service A to service B.
          The new-service flag depends on the migration-complete ops flag. No one gets routed to
          the new service until the migration is confirmed.
        </li>
        <li>
          <strong>Compliance gates.</strong> A feature that handles PII requires a
          data-retention feature to be enabled. The prerequisite enforces the dependency at
          runtime.
        </li>
      </ul>

      {/* How It Works */}
      <SectionHeading>How It Works</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Prerequisites are checked early in the evaluation order — after the flag existence check,
        environment enabled check, and mutual exclusion, but before targeting rules. This means
        the engine doesn&apos;t waste cycles evaluating complex targeting rules for a flag whose
        prerequisites aren&apos;t met.
      </p>
      <CodeBlock
        language="text"
        code={`1. Flag exists?                → No: NOT_FOUND
2. Flag environment enabled?    → No: DISABLED
3. Mutual exclusion group?      → Check group winner
4. Prerequisites met?           → No: PREREQUISITE_FAILED (return default)
                                   Yes: continue
5. Targeting rules match?       → Yes: TARGETED
6. Percentage rollout?          → In bucket: ROLLOUT / Out: FALLTHROUGH
7. None of the above            → FALLTHROUGH`}
      />

      {/* Example */}
      <SectionHeading>Example: Infrastructure Dependency</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Let&apos;s walk through a real scenario. Your team is introducing a new search backend
        powered by Elasticsearch. The rollout plan:
      </p>

      <SimpleTable>
        <thead>
          <tr>
            <Th>Flag</Th>
            <Th>Type</Th>
            <Th>Role</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td><InlineCode>elasticsearch-migration-done</InlineCode></Td>
            <Td>Ops toggle</Td>
            <Td>Infrastructure gate — flipped ON after the migration is verified</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>new-search-backend</InlineCode></Td>
            <Td>Release toggle</Td>
            <Td>Feature flag for the new search experience</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <p className="text-[var(--signal-fg-primary)] mb-4">
        The <InlineCode>new-search-backend</InlineCode> flag has{" "}
        <InlineCode>elasticsearch-migration-done</InlineCode> as a prerequisite. Here&apos;s
        what happens:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Deploy the feature code.</strong> Both flags exist.{" "}
          <InlineCode>elasticsearch-migration-done</InlineCode> is OFF.{" "}
          <InlineCode>new-search-backend</InlineCode> is ON. Despite being ON,{" "}
          <InlineCode>new-search-backend</InlineCode> returns its default value (old search
          path) because its prerequisite is not met.
        </li>
        <li>
          <strong>Run the migration.</strong> Elasticsearch is populated and verified. The ops
          team flips <InlineCode>elasticsearch-migration-done</InlineCode> to ON.
        </li>
        <li>
          <strong>Feature activates.</strong> Now that the prerequisite is met,{" "}
          <InlineCode>new-search-backend</InlineCode> evaluates normally. If its targeting rules
          or rollout conditions match, users start seeing the new search experience.
        </li>
        <li>
          <strong>Clean up.</strong> After a few weeks, the old search path is removed. The{" "}
          <InlineCode>elasticsearch-migration-done</InlineCode> flag is deprecated (it&apos;s
          permanently ON). The <InlineCode>new-search-backend</InlineCode> flag is removed from
          the codebase.
        </li>
      </ol>

      {/* Configuring Prerequisites */}
      <SectionHeading>Configuring Prerequisites</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Set prerequisites when creating or updating a flag. The prerequisites array contains
        flag keys that must be enabled first:
      </p>
      <CodeBlock
        language="bash"
        code={`curl -X PATCH https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/$FLAG_ID \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prerequisites": ["elasticsearch-migration-done"]
  }'`}
      />

      {/* Best Practices */}
      <SectionHeading>Best Practices</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Keep dependency chains short.</strong> Deep chains (A → B → C → D) are hard
          to reason about and debug. Prefer 1–2 levels of prerequisites.
        </li>
        <li>
          <strong>Use ops toggles as infrastructure gates.</strong> Separate infrastructure
          concerns from feature concerns. An ops toggle communicating &quot;the migration is
          done&quot; is clearer than a release toggle pulling double duty.
        </li>
        <li>
          <strong>Document the dependency.</strong> Add a description to the dependent flag
          explaining why it requires the prerequisite. This helps during cleanup.
        </li>
        <li>
          <strong>Avoid circular dependencies.</strong> The API rejects circular prerequisite
          chains at write time, but it&apos;s good practice to plan your dependency graph before
          creating flags.
        </li>
        <li>
          <strong>Clean up prerequisites when they&apos;re no longer needed.</strong> After the
          infrastructure migration is complete and the old code path is removed, update the
          dependent flag to remove the prerequisite.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Mutual Exclusion — Prevent conflicting flags", href: "/docs/core-concepts/mutual-exclusion" },
          { label: "Feature Flags — Flag types and structure", href: "/docs/core-concepts/feature-flags" },
          { label: "Flag Lifecycle — Manage flags through their lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
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
