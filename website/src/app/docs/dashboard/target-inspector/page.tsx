import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  ListChecks,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Target Inspector",
  description:
    "Debug targeting rules: enter a user key and attributes, see which rules match and why. Ideal for debugging why a user is or isn't receiving a flag.",
};

export default function TargetInspectorPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Target Inspector
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The Target Inspector lets you debug targeting rules by simulating how a specific user
        evaluates against a flag. Enter a user key and attributes, and see exactly which rules
        match — and why.
      </p>

      {/* What It Does */}
      <SectionHeading>What It Does</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When a user reports &quot;I&apos;m not seeing the new feature&quot; or &quot;I should have
        access but I don&apos;t,&quot; the Target Inspector is your first stop for debugging.
        Instead of reading through targeting rules and mentally computing the result, you can:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>Enter the user&apos;s key and attributes</li>
        <li>See which targeting rules evaluated to true or false</li>
        <li>Understand why a specific variation was (or wasn&apos;t) served</li>
        <li>Verify that percentage rollouts are assigning users correctly</li>
        <li>Check that prerequisite flags are satisfied</li>
      </ul>

      {/* Using the Target Inspector */}
      <SectionHeading>Using the Target Inspector</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To use the Target Inspector, open any flag&apos;s detail page and click the{" "}
        <strong>Inspect</strong> tab. You&apos;ll see:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>User Input Form</strong> — Enter the user key and any custom attributes
          (e.g., email, country, subscription tier, beta status).
        </li>
        <li>
          <strong>Rule Evaluation</strong> — Each targeting rule is displayed with its match
          result: <InlineSuccess>matched</InlineSuccess> or{" "}
          <InlineDanger>no match</InlineDanger>. The first matching rule determines the
          variation served.
        </li>
        <li>
          <strong>Final Result</strong> — The variation that would be served to this user,
          along with the reason (e.g., &quot;Matched rule: Beta Users&quot; or
          &quot;Default rule applied&quot;).
        </li>
      </ol>

      {/* Understanding Rule Evaluation */}
      <SectionHeading>Understanding Rule Evaluation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FlagEngine evaluates targeting rules <strong>top-to-bottom</strong>. The first rule
        that matches determines the served variation. If no rule matches, the flag&apos;s
        default state (ON/OFF or default value) is used.
      </p>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The Target Inspector shows you this evaluation step by step:
      </p>
      <div className="space-y-3 mb-6">
        {[
          {
            rule: "Beta Users (segment)",
            condition: "User is in segment \"beta-testers\"",
            matches: true,
            explanation: "User key \"user-456\" is a member of segment \"beta-testers\" — match!",
          },
          {
            rule: "Internal Employees",
            condition: "email ends with \"@company.com\"",
            matches: false,
            explanation: "User email \"user@example.com\" does not end with \"@company.com\" — no match.",
          },
          {
            rule: "10% Gradual Rollout",
            condition: "hash(userKey) % 100 < 10",
            matches: false,
            explanation: "Hash value 73 is not in the 0-9 range — user is in the 90% holdout group.",
          },
        ].map((row, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            {row.matches ? (
              <CheckCircle size={16} className="text-[var(--signal-fg-success)] mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="text-[var(--signal-fg-secondary)] mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Rule {i + 1}: {row.rule}
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)]">Condition: {row.condition}</p>
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: row.matches ? "var(--signal-fg-success)" : "var(--signal-fg-secondary)" }}
              >
                {row.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        In this example, the first rule matches, so the user gets the variation defined by the
        &quot;Beta Users&quot; rule. The remaining rules are skipped.
      </p>

      {/* Common Debugging Scenarios */}
      <SectionHeading>Common Debugging Scenarios</SectionHeading>
      <div className="space-y-4 mb-8">
        {[
          {
            icon: HelpCircle,
            question: "User should be in a segment but isn't",
            answer:
              'Use the Target Inspector to verify the user\'s attributes match the segment definition. Segments are evaluated based on the attributes you pass at evaluation time — check that your application is sending the correct attribute values.',
          },
          {
            icon: HelpCircle,
            question: "Percentage rollout isn't reaching the user",
            answer:
              'Percentage rollouts use hash-based assignment for consistency. The same user key will always map to the same bucket. The Target Inspector shows the hash value and which bucket the user falls into, so you can confirm whether they\'re in the rollout group.',
          },
          {
            icon: HelpCircle,
            question: "Prerequisite flag is blocking the feature",
            answer:
              "If a flag has prerequisites, the Target Inspector checks them first. If a prerequisite evaluates to OFF, the main flag defaults to OFF regardless of its own rules. The inspector shows prerequisite results explicitly.",
          },
          {
            icon: HelpCircle,
            question: "Wrong environment being evaluated",
            answer:
              "The Target Inspector uses the currently selected environment tab. Make sure you're inspecting the correct environment — targeting rules can differ between dev, staging, and production.",
          },
        ].map((scenario) => {
          const Icon = scenario.icon;
          return (
            <div
              key={scenario.question}
              className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]"
            >
              <div className="flex items-start gap-3">
                <Icon size={16} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                    {scenario.question}
                  </p>
                  <p className="text-sm text-[var(--signal-fg-secondary)]">{scenario.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <SectionHeading>Tips for Effective Debugging</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Use real user data</strong> — Copy the exact user key and attributes from your
          production logs for the most accurate debugging.
        </li>
        <li>
          <strong>Check environment first</strong> — Ensure you&apos;re inspecting the correct
          environment tab before investigating targeting rules.
        </li>
        <li>
          <strong>Verify attribute names</strong> — Attribute names are case-sensitive.{" "}
          <InlineCode>email</InlineCode> and <InlineCode>Email</InlineCode> are different attributes.
        </li>
        <li>
          <strong>Check for overriding rules</strong> — A rule higher in the list might be
          matching unexpectedly and preventing lower rules from being evaluated.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/dashboard/target-comparison"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Target Comparison</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — compare how two different users evaluate for the same flag
          </span>
        </li>
        <li>
          <Link
            href="/docs/core-concepts/targeting-and-segments"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Targeting &amp; Segments</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — learn how targeting rules and segments work
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

function InlineSuccess({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--signal-fg-success)" }}>
      <CheckCircle size={12} />
      {children}
    </span>
  );
}

function InlineDanger({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--signal-fg-secondary)" }}>
      <XCircle size={12} />
      {children}
    </span>
  );
}
