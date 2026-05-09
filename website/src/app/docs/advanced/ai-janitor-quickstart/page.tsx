import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb, CheckCircle, Zap } from "lucide-react";
import Steps, { Step } from "@/components/docs/Steps";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "AI Janitor Quickstart",
  description:
    "Get started with AI Janitor in 5 minutes — connect your Git provider, run your first scan, and review stale flag cleanup recommendations.",
};

export default function AiJanitorQuickstartPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor Quickstart
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Get the AI Janitor cleaning up stale feature flags in 5 minutes. Connect a Git
        provider, run your first scan, and review automated cleanup recommendations —
        no configuration required to start.
      </p>

      {/* Prerequisites */}
      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>A FeatureSignals account with at least one project and a few feature flags</li>
        <li>Admin access to a Git repository (GitHub, GitLab, or Bitbucket)</li>
        <li>Your source code contains references to FeatureSignals flags</li>
      </ul>

      <Callout variant="info" title="Free to start">
        AI Janitor is available on all plans, including Community Edition. The first
        10 scans per month are free. Higher scan limits are available on Pro and
        Enterprise plans.
      </Callout>

      {/* Steps */}
      <Steps>
        <Step title="1. Open AI Janitor">
          <p className="mb-3">
            Navigate to <strong>AI Janitor</strong> in the FeatureSignals sidebar.
            If this is your first time, you&apos;ll see the onboarding wizard.
          </p>
          <div className="p-4 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-[var(--signal-fg-accent)]" />
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                No sidebar item? Make sure your account has the <strong>AI Janitor</strong>{" "}
                feature enabled. Contact support if you need access.
              </p>
            </div>
          </div>
        </Step>

        <Step title="2. Connect a Git provider">
          <p className="mb-3">
            AI Janitor needs access to your source code to find flag references and
            generate cleanup PRs. Click <strong>Connect Repository</strong> and choose
            your Git provider:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>
              <strong>GitHub</strong> — OAuth app authorization, 60-second setup
            </li>
            <li>
              <strong>GitLab</strong> — Personal access token or OAuth
            </li>
            <li>
              <strong>Bitbucket</strong> — App password or OAuth consumer
            </li>
          </ul>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-3">
            AI Janitor requests <strong>read-only</strong> access to your repository by
            default. Write access is only needed if you want it to create PRs automatically.
            You can review and adjust permissions during setup.
          </p>
          <CodeBlock language="bash">
            {`# Permissions needed (GitHub example)
# Read-only (required for scanning):
#   - Repository contents (read)
#   - Repository metadata (read)
#   - Pull requests (read)
#
# Write (optional, for PR creation):
#   - Pull requests (write)`}
          </CodeBlock>
        </Step>

        <Step title="3. Select repositories to scan">
          <p className="mb-3">
            After connecting your Git provider, select one or more repositories that
            contain references to your FeatureSignals feature flags. You can scan:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>A single repository (start here for your first scan)</li>
            <li>Multiple repositories in a project or organization</li>
            <li>All repositories matching a name pattern</li>
          </ul>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            Start with one repository to get familiar with the results before scaling
            to your entire org.
          </p>
        </Step>

        <Step title="4. Run your first scan">
          <p className="mb-3">
            Click <strong>Run Scan</strong>. AI Janitor will:
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>
              <strong>Analyze your flags</strong> — Identify stale candidates based on
              evaluation inactivity, always-on/always-off behavior, and lifecycle status.
            </li>
            <li>
              <strong>Scan your source code</strong> — Search for flag key references
              across your selected repositories.
            </li>
            <li>
              <strong>Generate recommendations</strong> — For each stale flag, determine
              whether it can be safely removed and what the active code path should be.
            </li>
          </ol>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            First scans typically complete in 1–3 minutes depending on repository size.
            Subsequent scans are faster — AI Janitor caches previous analysis results.
          </p>
        </Step>

        <Step title="5. Review the results">
          <p className="mb-3">
            The scan results page shows all stale flags found across your repositories.
            Each result includes:
          </p>
          <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-3">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                  <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Column</th>
                  <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { col: "Flag Key", desc: "The feature flag identified as stale" },
                  { col: "Confidence", desc: "AI confidence score (0–100%) that the flag can be safely removed" },
                  { col: "Status", desc: "always_on, always_off, not_evaluated, or zombie (no code references)" },
                  { col: "Files", desc: "Number of source code files referencing this flag" },
                  { col: "Recommendation", desc: "What the AI suggests: remove, investigate, or keep" },
                ].map((row) => (
                  <tr
                    key={row.col}
                    className="border-b border-[var(--signal-border-default)] last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-[var(--signal-fg-primary)] font-medium">
                      {row.col}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout variant="warning" title="Review before acting">
            AI recommendations are suggestions — not mandates. Always review the
            confidence score, check the flagged files, and use your judgment before
            generating a cleanup PR. False positives are possible, especially for
            flags with complex conditional logic.
          </Callout>
        </Step>

        <Step title="6. Generate a cleanup PR (optional)">
          <p className="mb-3">
            For flags you&apos;re confident should be removed, click{" "}
            <strong>Generate PR</strong>. AI Janitor will:
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>Create a new branch in your repository</li>
            <li>Remove the flag check from each source file</li>
            <li>Preserve the active code path (the branch that was always taken)</li>
            <li>Open a pull request with a detailed description of the changes</li>
          </ol>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            PR generation requires write access to your repository. If you granted
            read-only access, you can still see the diff and apply it manually.
          </p>
        </Step>
      </Steps>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Git Provider Configuration — Detailed setup guides", href: "/docs/advanced/ai-janitor-git-providers" },
          { label: "AI Janitor Configuration — Schedules, patterns, models", href: "/docs/advanced/ai-janitor-configuration" },
          { label: "PR Workflow — Review process and auto-merge", href: "/docs/advanced/ai-janitor-pr-workflow" },
          { label: "LLM Integration — OpenAI, Anthropic, self-hosted", href: "/docs/advanced/ai-janitor-llm-integration" },
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
