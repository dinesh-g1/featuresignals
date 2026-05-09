import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  GitCompare,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Target Comparison",
  description:
    "Compare how two different users evaluate for the same flag. See differences side by side to understand why users get different variations.",
};

export default function TargetComparisonPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Target Comparison
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Compare how two different users evaluate for the same flag. See exactly which rules
        match or don&apos;t match for each user side-by-side, so you can understand why they
        receive different variations.
      </p>

      {/* What It Does */}
      <SectionHeading>What It Does</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The Target Comparison tool extends the Target Inspector by letting you compare two
        users simultaneously. This is invaluable when:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>One user sees the feature but another doesn&apos;t, and you need to understand why</li>
        <li>You want to verify that a targeting rule correctly distinguishes between user groups</li>
        <li>You&apos;re testing a new targeting rule and want to confirm it affects the right users</li>
        <li>You&apos;re debugging a percentage rollout and need to check two specific user keys</li>
      </ul>

      {/* Using Target Comparison */}
      <SectionHeading>Using Target Comparison</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To use Target Comparison, open any flag&apos;s detail page and click the{" "}
        <strong>Compare</strong> tab within the Inspect panel. You&apos;ll see:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>User A and User B inputs</strong> — Enter the key and attributes for each user.
          You can also paste JSON attribute objects for quick entry.
        </li>
        <li>
          <strong>Side-by-side rule matrix</strong> — Each targeting rule is displayed with match
          results for both users. Differences are highlighted for quick identification.
        </li>
        <li>
          <strong>Diff summary</strong> — A summary card shows whether the two users receive the
          same variation or different ones, and which rule caused the divergence.
        </li>
      </ol>

      {/* Comparison Example */}
      <SectionHeading>Comparison Example</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Here&apos;s an example comparing two users evaluating the{" "}
        <InlineCode>new-checkout</InlineCode> flag:
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* User A */}
        <div className="border border-[var(--signal-border-default)] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)]">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--signal-fg-accent)]" />
              <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">User A</span>
              <span className="text-xs text-[var(--signal-fg-secondary)] font-mono">user-123</span>
            </div>
            <div className="text-xs text-[var(--signal-fg-secondary)] mt-1">
              email: alice@company.com · country: US · tier: enterprise
            </div>
          </div>
          <div className="p-4 space-y-2">
            {[
              { rule: "Enterprise Customers", match: true },
              { rule: "US Rollout 50%", match: false },
              { rule: "Default", match: false },
            ].map((r) => (
              <div key={r.rule} className="flex items-center gap-2 text-xs">
                {r.match ? (
                  <CheckCircle size={12} className="text-[var(--signal-fg-success)] shrink-0" />
                ) : (
                  <XCircle size={12} className="text-[var(--signal-fg-secondary)] shrink-0" />
                )}
                <span className="text-[var(--signal-fg-secondary)]">{r.rule}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-[var(--signal-border-default)]">
              <span className="text-xs font-semibold text-[var(--signal-fg-primary)]">Result: </span>
              <span className="text-xs font-bold" style={{ color: "var(--signal-fg-success)" }}>ON (v2 checkout)</span>
            </div>
          </div>
        </div>

        {/* User B */}
        <div className="border border-[var(--signal-border-default)] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)]">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--signal-fg-accent)]" />
              <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">User B</span>
              <span className="text-xs text-[var(--signal-fg-secondary)] font-mono">user-789</span>
            </div>
            <div className="text-xs text-[var(--signal-fg-secondary)] mt-1">
              email: bob@startup.io · country: DE · tier: starter
            </div>
          </div>
          <div className="p-4 space-y-2">
            {[
              { rule: "Enterprise Customers", match: false },
              { rule: "US Rollout 50%", match: false },
              { rule: "Default", match: true },
            ].map((r) => (
              <div key={r.rule} className="flex items-center gap-2 text-xs">
                {r.match ? (
                  <CheckCircle size={12} className="text-[var(--signal-fg-success)] shrink-0" />
                ) : (
                  <XCircle size={12} className="text-[var(--signal-fg-secondary)] shrink-0" />
                )}
                <span className="text-[var(--signal-fg-secondary)]">{r.rule}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-[var(--signal-border-default)]">
              <span className="text-xs font-semibold text-[var(--signal-fg-primary)]">Result: </span>
              <span className="text-xs font-bold" style={{ color: "var(--signal-fg-danger)" }}>OFF (v1 checkout)</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-[var(--signal-fg-secondary)] mb-6 italic">
        User A matches the &quot;Enterprise Customers&quot; rule (tier=enterprise) and gets v2.
        User B doesn&apos;t match any rule and falls through to the default, getting v1.
      </p>

      {/* Diff Summary */}
      <SectionHeading>Diff Summary</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The diff summary highlights exactly where the two users diverge:
      </p>
      <div className="p-4 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ArrowLeftRight size={16} className="text-[var(--signal-fg-accent)]" />
          <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
            Users diverge at Rule 1: &quot;Enterprise Customers&quot;
          </span>
        </div>
        <ul className="space-y-1.5 text-sm text-[var(--signal-fg-secondary)]">
          <li>
            <strong>User A</strong> has <InlineCode>tier=enterprise</InlineCode>, which matches the
            segment definition. Rule applies → v2 served.
          </li>
          <li>
            <strong>User B</strong> has <InlineCode>tier=starter</InlineCode>, which does not match.
            Rule skipped → falls through to default → v1 served.
          </li>
        </ul>
      </div>

      {/* When to Use */}
      <SectionHeading>When to Use Target Comparison</SectionHeading>
      <div className="space-y-3 mb-8">
        {[
          {
            title: "Testing new targeting rules",
            desc: "Before enabling a new targeting rule in production, compare a user who should match against one who shouldn't. Verify the rule behaves as expected.",
          },
          {
            title: "Debugging user-reported issues",
            desc: "When a user reports they can't access a feature, compare their evaluation against a known-good user to quickly identify the difference.",
          },
          {
            title: "Validating segment definitions",
            desc: "Compare two users with different attribute values to confirm your segment conditions correctly include and exclude the right users.",
          },
          {
            title: "Rollout verification",
            desc: "For percentage rollouts, compare two users to confirm they fall into the expected buckets based on the hash assignment.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">{item.title}</p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">{item.desc}</p>
          </div>
        ))}
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
            — debug targeting for a single user
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
