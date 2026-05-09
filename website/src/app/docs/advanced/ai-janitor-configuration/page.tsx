import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "AI Janitor Configuration",
  description:
    "Configure AI Janitor — scan schedules, branch patterns, file extensions, ignore patterns, and LLM model selection for automated stale flag detection.",
};

interface ConfigOption {
  name: string;
  type: string;
  default: string;
  description: string;
}

const configOptions: ConfigOption[] = [
  {
    name: "scan_schedule",
    type: "cron expression",
    default: "0 6 * * 1 (every Monday at 6 AM UTC)",
    description:
      "When AI Janitor runs automated scans. Use standard cron syntax. Set to 'manual' to disable scheduled scans and run only on-demand.",
  },
  {
    name: "branch_patterns",
    type: "string[]",
    default: '["main", "master", "develop"]',
    description:
      "Git branches AI Janitor scans for flag references. Only branches matching these patterns are analyzed. Supports glob patterns (e.g., 'release/*').",
  },
  {
    name: "file_extensions",
    type: "string[]",
    default: '[".ts", ".tsx", ".js", ".jsx", ".go", ".py", ".java", ".rb", ".cs", ".php", ".swift", ".kt"]',
    description:
      "File extensions to scan for flag references. AI Janitor only opens and analyzes files matching these extensions. Add or remove extensions based on your tech stack.",
  },
  {
    name: "ignore_patterns",
    type: "string[]",
    default: '["node_modules/**", "vendor/**", "*.test.*", "*.spec.*", "dist/**", "build/**"]',
    description:
      "Glob patterns for files and directories to exclude from scanning. Useful for ignoring generated code, dependencies, and test fixtures that may contain stale flag references.",
  },
  {
    name: "stale_threshold_days",
    type: "number",
    default: "30",
    description:
      "Number of days a flag must show no evaluation activity before being considered stale. Flags in the 'ops' and 'permission' toggle categories are exempt from staleness checks.",
  },
  {
    name: "min_confidence_score",
    type: "number (0–100)",
    default: "70",
    description:
      "Minimum AI confidence score required for a flag to appear in the 'Ready to Remove' list. Flags below this threshold appear in 'Needs Review'. Increase for fewer false positives, decrease for more aggressive cleanup.",
  },
  {
    name: "llm_provider",
    type: "string",
    default: "openai",
    description:
      "LLM provider for AI analysis. Supported values: 'openai', 'anthropic', 'self_hosted'. Self-hosted requires a compatible OpenAI-compatible API endpoint.",
  },
  {
    name: "llm_model",
    type: "string",
    default: "gpt-4o-mini",
    description:
      "Specific LLM model to use. For OpenAI: gpt-4o-mini (default, cost-effective), gpt-4o (higher accuracy). For Anthropic: claude-3-5-sonnet-latest, claude-3-haiku-latest. Self-hosted: any compatible model identifier.",
  },
  {
    name: "auto_create_prs",
    type: "boolean",
    default: "false",
    description:
      "When true, AI Janitor automatically creates PRs for flags with confidence ≥ min_confidence_score. When false, PRs must be manually triggered from the scan results page. Recommended to keep false until you trust the results.",
  },
  {
    name: "auto_merge_prs",
    type: "boolean",
    default: "false",
    description:
      "When true, PRs that pass CI checks are automatically merged. Requires auto_create_prs to be true and branch protection rules that don't require human approval. NOT recommended for production repositories.",
  },
  {
    name: "pr_labels",
    type: "string[]",
    default: '["ai-janitor", "flag-cleanup"]',
    description:
      "Labels automatically applied to AI Janitor pull requests. Use these to filter, track, and measure AI Janitor activity in your repository.",
  },
  {
    name: "notify_on_scan_complete",
    type: "boolean",
    default: "true",
    description:
      "Send a notification (email, Slack, or webhook) when a scheduled scan completes. The notification includes a summary of stale flags found and links to the full report.",
  },
];

export default function AiJanitorConfigurationPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor Configuration
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Fine-tune AI Janitor to match your team&apos;s workflow. Configure scan schedules,
        branch patterns, file extensions, LLM model selection, and PR automation behavior.
      </p>

      {/* Configuration File */}
      <SectionHeading>Configuration File</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        AI Janitor can be configured via the dashboard UI or a{" "}
        <InlineCode>.ai-janitor.json</InlineCode> file in your repository root.
        Repository-level config takes precedence over dashboard settings, letting teams
        customize behavior per project.
      </p>
      <CodeBlock language="json" title=".ai-janitor.json">
        {`{
  "scan_schedule": "0 6 * * 1",
  "branch_patterns": ["main", "master", "develop"],
  "file_extensions": [
    ".ts", ".tsx", ".js", ".jsx",
    ".go", ".py", ".java", ".rb"
  ],
  "ignore_patterns": [
    "node_modules/**",
    "vendor/**",
    "*.test.*",
    "*.spec.*",
    "dist/**",
    "build/**",
    "generated/**"
  ],
  "stale_threshold_days": 30,
  "min_confidence_score": 70,
  "llm_provider": "openai",
  "llm_model": "gpt-4o-mini",
  "auto_create_prs": false,
  "auto_merge_prs": false,
  "pr_labels": ["ai-janitor", "flag-cleanup"],
  "notify_on_scan_complete": true
}`}
      </CodeBlock>

      {/* Config Reference */}
      <SectionHeading>Configuration Reference</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Option</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Type</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Default</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Description</th>
            </tr>
          </thead>
          <tbody>
            {configOptions.map((opt) => (
              <tr
                key={opt.name}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-2.5 text-[var(--signal-fg-primary)] font-mono text-xs">
                  {opt.name}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)] text-xs">
                  {opt.type}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)] text-xs max-w-[200px] truncate">
                  {opt.default}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {opt.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scan Schedules */}
      <SectionHeading>Scan Schedules</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The scan schedule determines how often AI Janitor checks for stale flags.
        Choose a cadence that balances freshness with noise:
      </p>
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {[
          { label: "Daily", cron: "0 6 * * *", desc: "Every day at 6 AM UTC. Best for active teams shipping daily with many flags." },
          { label: "Weekly", cron: "0 6 * * 1", desc: "Every Monday at 6 AM UTC. Good default for most teams — review stale flags weekly." },
          { label: "Manual", cron: "manual", desc: "No scheduled scans. Run on-demand from the dashboard or via API. Good for low-flag-count projects." },
        ].map((sched) => (
          <div
            key={sched.label}
            className="p-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <h4 className="font-semibold text-[var(--signal-fg-primary)] text-sm mb-1">
              {sched.label}
            </h4>
            <span className="text-xs font-mono text-[var(--signal-fg-accent)] block mb-1">
              {sched.cron}
            </span>
            <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
              {sched.desc}
            </p>
          </div>
        ))}
      </div>

      {/* LLM Selection */}
      <SectionHeading>LLM Model Selection</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        AI Janitor uses LLMs to analyze flag usage patterns and generate code removal
        suggestions. Choose the provider and model that fits your budget, accuracy needs,
        and data residency requirements.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {[
          {
            provider: "OpenAI",
            models: "gpt-4o-mini (fast, cheap), gpt-4o (most accurate)",
            best: "Default choice. Best speed/cost/accuracy balance.",
          },
          {
            provider: "Anthropic",
            models: "claude-3-5-sonnet (balanced), claude-3-haiku (fast)",
            best: "Strong code understanding. Good for complex refactors.",
          },
          {
            provider: "Self-Hosted",
            models: "Any OpenAI-compatible endpoint (vLLM, Ollama, etc.)",
            best: "Data never leaves your infrastructure. Requires GPU capacity.",
          },
        ].map((llm) => (
          <div
            key={llm.provider}
            className="flex flex-col gap-1 p-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <h4 className="font-semibold text-[var(--signal-fg-primary)] text-sm">
              {llm.provider}
            </h4>
            <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--signal-fg-primary)]">Models: </span>
              {llm.models}
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--signal-fg-primary)]">Best for: </span>
              {llm.best}
            </p>
          </div>
        ))}
      </div>

      <Callout variant="warning" title="Token usage and costs">
        Each scan consumes LLM tokens proportional to the number of flagged files and
        their size. A typical scan of 50 flags across a medium-sized repository consumes
        approximately 10K–50K tokens. Self-hosted models bypass API costs but require
        your own infrastructure. Monitor token usage in the AI Janitor dashboard.
      </Callout>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Quickstart — Get started in 5 minutes", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "LLM Integration — Provider setup details", href: "/docs/advanced/ai-janitor-llm-integration" },
          { label: "PR Workflow — Review process and auto-merge", href: "/docs/advanced/ai-janitor-pr-workflow" },
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
