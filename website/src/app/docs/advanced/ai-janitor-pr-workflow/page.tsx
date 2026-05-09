import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitPullRequest, Check, Eye } from "lucide-react";
import Steps, { Step } from "@/components/docs/Steps";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "AI Janitor PR Workflow",
  description:
    "How AI Janitor creates pull requests to remove stale flags — PR template, review process, CI integration, and auto-merge configuration.",
};

export default function AiJanitorPrWorkflowPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor PR Workflow
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        AI Janitor generates pull requests to remove stale feature flags from your
        codebase. Each PR is structured, reviewable, and follows your team&apos;s
        existing code review process — because AI writes the diff, but humans make
        the final call.
      </p>

      {/* PR Lifecycle */}
      <SectionHeading>PR Lifecycle</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        {[
          { step: "1", title: "Detect", desc: "AI identifies stale flags and confirms they can be safely removed." },
          { step: "2", title: "Generate", desc: "AI creates a branch, removes flag checks, and opens a PR." },
          { step: "3", title: "Review", desc: "Your team reviews the PR like any other code change." },
          { step: "4", title: "Merge", desc: "PR passes CI and review, then merges. Flag is cleaned up." },
        ].map((item) => (
          <div
            key={item.step}
            className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-center"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] text-sm font-bold mx-auto shrink-0">
              {item.step}
            </span>
            <h3 className="font-semibold text-[var(--signal-fg-primary)] text-sm">
              {item.title}
            </h3>
            <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* What the PR Looks Like */}
      <SectionHeading>What the PR Looks Like</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every AI Janitor PR follows a consistent, review-friendly template. Here&apos;s
        an example of what your team will see:
      </p>

      <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] mb-6">
        <div className="flex items-center gap-2 mb-3">
          <GitPullRequest size={16} className="text-[var(--signal-fg-accent)]" />
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
            PR Title: chore: remove stale flag &quot;new-checkout&quot;
          </h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
            <p className="font-semibold text-[var(--signal-fg-primary)] mb-1">
              🤖 AI Janitor — Automated Flag Cleanup
            </p>
            <table className="w-full text-xs">
              <tbody>
                {[
                  { label: "Flag", value: "new-checkout" },
                  { label: "Status", value: "always_on — flag has been enabled at 100% for 45 days with no evaluations in the last 30 days" },
                  { label: "Confidence", value: "94% — high confidence this flag is safe to remove" },
                  { label: "Files Changed", value: "3 files across 1 repository" },
                  { label: "Active Path", value: "The flag was always ON. The PR removes the flag check and keeps the enabled code path." },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-[var(--signal-border-default)] last:border-b-0">
                    <td className="py-1 pr-3 font-medium text-[var(--signal-fg-primary)] align-top">
                      {row.label}
                    </td>
                    <td className="py-1 text-[var(--signal-fg-secondary)]">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 rounded-md bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-default)]">
            <p className="text-xs font-semibold text-[var(--signal-fg-primary)] mb-1">
              ⚠️ Review Checklist
            </p>
            <ul className="list-disc pl-5 text-xs text-[var(--signal-fg-secondary)] space-y-0.5">
              <li>Verify the flag is indeed no longer needed in production</li>
              <li>Confirm the preserved code path is the correct one</li>
              <li>Check that no tests rely on the flag being configurable</li>
              <li>Ensure the flag key is also removed from the FeatureSignals dashboard</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Steps: Creating a PR */}
      <Steps>
        <Step title="1. AI analyzes the flag">
          <p className="mb-3">
            For each stale candidate, AI Janitor examines the flag&apos;s evaluation
            history, the source code references, and the surrounding code context to
            determine:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)]">
            <li>Which code path is always taken (the &quot;active&quot; branch)</li>
            <li>Whether the flag check can be removed without side effects</li>
            <li>If any imports, variables, or functions become unused after removal</li>
            <li>Whether the removal affects test coverage</li>
          </ul>
        </Step>

        <Step title="2. Branch is created">
          <p className="mb-3">
            AI Janitor creates a new branch in your repository following the naming
            convention:
          </p>
          <CodeBlock language="bash">
            {`# Branch naming pattern (configurable)
ai-janitor/remove-{flag-key}-{timestamp}

# Example
ai-janitor/remove-new-checkout-20260115`}
          </CodeBlock>
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-2">
            The branch is created from the default branch (main/master) at the time
            of scan. If the default branch has advanced significantly since the scan,
            you may need to update the branch before merging.
          </p>
        </Step>

        <Step title="3. Flag check is removed from each file">
          <p className="mb-3">
            AI Janitor surgically removes the flag evaluation while preserving the
            active code path. Here&apos;s an example of what the diff looks like:
          </p>
          <CodeBlock language="diff" title="Example diff">
            {`// Before (with flag check)
async function checkout(user: User) {
-  const useNewCheckout = await client.boolVariation(
-    'new-checkout',
-    { key: user.id },
-    false,
-  );
-
-  if (useNewCheckout) {
-    return renderNewCheckout(user);
-  }
-  return renderLegacyCheckout(user);
+  return renderNewCheckout(user);
}

// After (flag removed, active path preserved)`}
          </CodeBlock>
        </Step>

        <Step title="4. PR is opened">
          <p className="mb-3">
            The PR includes all the information your team needs to review with confidence:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)]">
            <li>Automated labels (configurable via <InlineCode>pr_labels</InlineCode>)</li>
            <li>Link back to the AI Janitor scan report</li>
            <li>Confidence score and reasoning</li>
            <li>Checklist for human reviewers</li>
            <li>Diff for each changed file</li>
          </ul>
        </Step>
      </Steps>

      {/* Review Process */}
      <SectionHeading>Review Process</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        AI Janitor PRs integrate with your existing code review workflow:
      </p>
      <div className="space-y-3 mb-6">
        {[
          {
            icon: Eye,
            title: "Human Review Required",
            desc: "AI Janitor PRs are not special — they go through the same review process as any other PR. Required reviewers, CODEOWNERS, and branch protection rules all apply.",
          },
          {
            icon: Check,
            title: "CI/CD Gates",
            desc: "Your existing CI checks run on AI Janitor PRs just like any other PR. If tests fail, the PR won't merge. AI Janitor can be configured to monitor CI status and comment on the PR when checks pass.",
          },
          {
            icon: GitPullRequest,
            title: "Auto-Merge (Optional)",
            desc: "For teams with high confidence in AI Janitor results, you can enable auto-merge. When enabled, PRs that pass CI and have a confidence score ≥ the configured threshold are automatically merged. This is NOT recommended without extensive testing.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex gap-3 p-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <item.icon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-[var(--signal-fg-primary)] text-sm mb-0.5">
                {item.title}
              </h4>
              <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-Merge */}
      <SectionHeading>Auto-Merge Configuration</SectionHeading>
      <Callout variant="danger" title="Use with caution">
        Auto-merge skips human review for AI-generated code changes. Only enable it
        after you&apos;ve validated AI Janitor&apos;s accuracy over at least 10–20
        manual PRs in your codebase. Start with a high confidence threshold (≥ 90)
        and monitor results closely.
      </Callout>
      <p className="text-[var(--signal-fg-primary)] mb-4 mt-4">
        To enable auto-merge, configure these options in your{" "}
        <InlineCode>.ai-janitor.json</InlineCode>:
      </p>
      <CodeBlock language="json" title="Auto-merge configuration">
        {`{
  "auto_create_prs": true,
  "auto_merge_prs": true,
  "min_confidence_score": 90,
  "auto_merge_conditions": {
    "require_ci_pass": true,
    "require_no_conflicts": true,
    "require_approved_review": false,
    "max_files_changed": 10,
    "max_lines_changed": 200
  }
}`}
      </CodeBlock>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Configuration — All config options", href: "/docs/advanced/ai-janitor-configuration" },
          { label: "LLM Integration — Provider setup details", href: "/docs/advanced/ai-janitor-llm-integration" },
          { label: "AI Janitor Quickstart — Get started in 5 minutes", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "Troubleshooting — Common issues and solutions", href: "/docs/advanced/ai-janitor-troubleshooting" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors font-medium"
          >
            <ArrowRight size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
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
