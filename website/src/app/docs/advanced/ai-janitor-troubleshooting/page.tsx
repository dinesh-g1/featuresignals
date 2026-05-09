import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Search, Bug } from "lucide-react";
import Callout from "@/components/docs/Callout";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "AI Janitor Troubleshooting",
  description:
    "Troubleshoot common AI Janitor issues — scans not finding flags, PR creation failures, false positives, rate limits, and Git provider connection problems.",
};

interface TroubleshootingItem {
  icon: typeof AlertTriangle;
  issue: string;
  symptoms: string;
  solutions: string[];
}

const issues: TroubleshootingItem[] = [
  {
    icon: Search,
    issue: "Scan not finding expected flags",
    symptoms:
      "A flag you know is stale doesn't appear in the scan results, or the scan returns zero results despite having flags.",
    solutions: [
      "Check the flag's toggle_category — ops and permission flags are excluded from staleness checks by default.",
      "Verify the flag has actually not been evaluated within the stale_threshold_days window. Check the evaluation history in the flag detail page.",
      "Ensure your Git repository contains references to the flag key. AI Janitor searches for exact string matches of the flag key in source files.",
      "Check that the flag's key is not in an excluded file pattern (ignore_patterns) or on an excluded branch (branch_patterns).",
    ],
  },
  {
    icon: AlertTriangle,
    issue: "PR creation fails",
    symptoms:
      "AI Janitor identifies a stale flag but cannot create a pull request. Error message mentions permissions or Git provider connectivity.",
    solutions: [
      "Verify the Git provider connection has write access to pull requests. Read-only connections can scan but cannot create PRs.",
      "Check that the access token or OAuth authorization has not expired. Reauthorize from the AI Janitor settings page.",
      "Ensure the target branch (usually main/master) exists and is accessible. AI Janitor cannot create branches from deleted or protected branches.",
      "Check branch protection rules — some configurations prevent automated branch creation even with valid credentials.",
      "For self-hosted Git providers, verify the instance is reachable from FeatureSignals. Test connectivity from the settings page.",
    ],
  },
  {
    icon: Bug,
    issue: "False positives — flag incorrectly marked stale",
    symptoms:
      "AI Janitor recommends removing a flag that is still actively used or still needed.",
    solutions: [
      "Increase min_confidence_score to require higher AI confidence before flagging.",
      "Adjust stale_threshold_days if your flags have longer evaluation cycles (e.g., flags evaluated monthly for billing cycles).",
      "Check if the flag is evaluated via a different mechanism — direct API calls, webhook-triggered evaluations, or offline jobs may not be captured if they don't use the standard SDK evaluation path.",
      "Mark the flag as 'keep' in the scan results to prevent it from appearing in future scans.",
      "If the flag uses conditional logic that the AI cannot resolve, add a comment in your source code referencing the flag key with context about why it's still needed.",
    ],
  },
  {
    icon: AlertTriangle,
    issue: "LLM rate limit errors during scan",
    symptoms:
      "Scans fail midway with rate limit errors (HTTP 429) from the LLM provider, or scans take unusually long.",
    solutions: [
      "AI Janitor automatically retries with exponential backoff, but persistent rate limits indicate you're hitting provider limits. Upgrade your API tier or reduce scan frequency.",
      "Reduce the number of concurrent LLM calls. The default is 5; you can lower it in the configuration.",
      "Consider switching to a different LLM provider with higher rate limits or a self-hosted model with no API rate limits.",
      "Use a cheaper/faster model (gpt-4o-mini instead of gpt-4o, or claude-3-haiku instead of sonnet) for higher throughput.",
    ],
  },
  {
    icon: Search,
    issue: "Git provider connection fails or times out",
    symptoms:
      "Cannot connect a Git provider, or existing connections suddenly stop working.",
    solutions: [
      "For OAuth connections, the authorization may have been revoked. Reauthorize from the AI Janitor settings page.",
      "For access token connections, the token may have expired or been revoked. Generate a new token and update the connection.",
      "For self-hosted instances, verify network connectivity. Ensure your instance allows inbound connections from FeatureSignals IP ranges.",
      "Check that your Git provider is not experiencing an outage. AI Janitor will retry failed connections automatically.",
      "Verify the token has the required scopes — missing scopes are the most common cause of connection issues.",
    ],
  },
  {
    icon: Bug,
    issue: "Generated PR contains incorrect code changes",
    symptoms:
      "The AI-generated diff removes the wrong code path, deletes unrelated code, or introduces syntax errors.",
    solutions: [
      "This is rare but possible with complex flag logic. Always review AI-generated PRs carefully before merging.",
      "Increase min_confidence_score to 90+ to reduce the likelihood of incorrect suggestions appearing.",
      "Use a more capable LLM model (gpt-4o or claude-3-5-sonnet) for improved accuracy on complex code.",
      "If the flag has complex conditional logic (nested if/else, ternary operators, switch statements), consider removing it manually instead.",
      "Report the issue via the feedback button on the scan results page. This helps improve the AI's accuracy over time.",
    ],
  },
  {
    icon: AlertTriangle,
    issue: "Scan results inconsistent between runs",
    symptoms:
      "The same flag appears stale in one scan but not the next, or confidence scores fluctuate significantly.",
    solutions: [
      "LLM outputs are non-deterministic by nature. Small variations in confidence scores (±5%) are normal.",
      "If a flag appears and disappears between scans, check if it was recently evaluated. Even a single evaluation resets the staleness timer.",
      "Ensure the code on the scanned branches hasn't changed between scans. If someone refactored the flag-related code, the AI analysis will differ.",
      "For consistent results, pin the LLM model version and set the temperature to 0 in custom prompt configuration.",
    ],
  },
];

export default function AiJanitorTroubleshootingPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor Troubleshooting
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Solutions for common AI Janitor issues. If you encounter a problem not covered
        here, check the scan logs in the AI Janitor dashboard or contact FeatureSignals
        support.
      </p>

      {/* Diagnostic Tools */}
      <Callout variant="info" title="Built-in diagnostics">
        AI Janitor includes several diagnostic tools accessible from the settings page:
        <ul className="list-disc pl-4 mt-1 space-y-0.5">
          <li>
            <strong>Connection Test</strong> — Verifies Git provider connectivity and
            token validity.
          </li>
          <li>
            <strong>LLM Ping</strong> — Sends a minimal request to verify LLM provider
            configuration.
          </li>
          <li>
            <strong>Scan Preview</strong> — Shows which files and flags would be scanned
            without consuming LLM tokens.
          </li>
          <li>
            <strong>Log Viewer</strong> — Full scan logs with LLM request/response details
            for debugging.
          </li>
        </ul>
      </Callout>

      {/* Issues */}
      <SectionHeading>Common Issues</SectionHeading>
      <div className="space-y-6">
        {issues.map((item) => (
          <div
            key={item.issue}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <div className="flex items-start gap-3 mb-3">
              <item.icon
                size={18}
                className="text-[var(--signal-fg-warning)] mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
                  {item.issue}
                </h3>
              </div>
            </div>
            <div className="ml-9 space-y-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
                  Symptoms
                </span>
                <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed mt-0.5">
                  {item.symptoms}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-accent)]">
                  Solutions
                </span>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  {item.solutions.map((sol) => (
                    <li key={sol} className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                      {sol}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug Mode */}
      <SectionHeading>Enabling Debug Logging</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For persistent issues, enable debug logging to capture detailed information
        about AI Janitor&apos;s operations:
      </p>
      <CodeBlock language="json" title="Debug configuration">
        {`{
  "debug_mode": true,
  "log_level": "debug",
  "log_llm_requests": true,
  "log_llm_responses": true
}`}
      </CodeBlock>
      <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 mb-4">
        Debug logs include full LLM request payloads and responses. Enable this only
        temporarily for troubleshooting — it increases log volume and may expose source
        code in logs.
      </p>

      {/* Getting Help */}
      <SectionHeading>Getting Help</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        If you&apos;ve tried the solutions above and are still experiencing issues:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>In-app support:</strong> Use the chat widget in the AI Janitor
          dashboard to contact the FeatureSignals team directly.
        </li>
        <li>
          <strong>Community forum:</strong> Search or post in the{" "}
          <a
            href="https://community.featuresignals.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--signal-fg-accent)] hover:underline font-medium"
          >
            FeatureSignals Community
          </a>
          .
        </li>
        <li>
          <strong>Export diagnostics:</strong> From the AI Janitor settings page,
          click <strong>Export Diagnostics</strong> to generate a support bundle with
          scan logs, configuration, and error reports (source code is never included).
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Quickstart — Get started in 5 minutes", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "AI Janitor Configuration — All config options", href: "/docs/advanced/ai-janitor-configuration" },
          { label: "LLM Integration — Provider setup details", href: "/docs/advanced/ai-janitor-llm-integration" },
          { label: "PR Workflow — Review process and auto-merge", href: "/docs/advanced/ai-janitor-pr-workflow" },
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
