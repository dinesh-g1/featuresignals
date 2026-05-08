import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, LightBulbIcon } from "@primer/octicons-react";

export const metadata: Metadata = {
  title: "AI Janitor",
  description:
    "Automatically detect and clean up stale feature flags with AI-powered code analysis and PR generation.",
};

export default function AiJanitorPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
          New
        </span>
      </div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The AI Janitor is FeatureSignals&apos; intelligent stale flag detection and cleanup engine.
        It automatically identifies feature flags that are no longer needed, scans your source code
        for references, and generates pull requests to remove them — keeping your codebase clean and
        reducing technical debt.
      </p>

      {/* How It Works */}
      <SectionHeading>How It Works</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {[
          {
            step: "1",
            title: "Scan",
            description:
              "The Janitor analyzes your feature flags and identifies stale candidates based on configurable criteria (evaluation inactivity, always-on/always-off behavior).",
          },
          {
            step: "2",
            title: "Analyze",
            description:
              "It connects to your Git repositories and scans source code for references to each stale flag.",
          },
          {
            step: "3",
            title: "Generate PR",
            description:
              "For flags safe to remove, it creates a pull request that removes the flag's conditional blocks while preserving the active code path.",
          },
          {
            step: "4",
            title: "Review",
            description:
              "Your team reviews the generated PR just like any other code change.",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="flex gap-3 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] text-sm font-bold shrink-0">
              {item.step}
            </span>
            <div>
              <h3 className="font-semibold text-[var(--signal-fg-primary)] mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Supported Git Providers */}
      <SectionHeading>Supported Git Providers</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>GitHub (cloud and GitHub Enterprise Server)</li>
        <li>GitLab (cloud and self-hosted)</li>
        <li>Bitbucket (cloud and Bitbucket Data Center)</li>
        <li>Azure DevOps (cloud and Azure DevOps Server)</li>
      </ul>

      {/* Getting Started */}
      <SectionHeading>Getting Started</SectionHeading>
      <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] mb-6">
        <ol className="list-decimal pl-5 space-y-2 text-[var(--signal-fg-primary)]">
          <li>
            Navigate to <strong>AI Janitor</strong> in the sidebar
          </li>
          <li>Connect your Git repository via the connection wizard</li>
          <li>
            Click <strong>Scan</strong> to analyze your flags
          </li>
          <li>Review the stale flags report</li>
          <li>
            Click <strong>Generate PR</strong> for flags you want to remove
          </li>
        </ol>
      </div>

      {/* Human-in-the-loop */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]">
        <div className="flex items-start gap-3">
          <LightBulbIcon size={18} className="text-[var(--signal-fg-warning)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Human-in-the-loop design
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              AI suggests, human approves. The AI Janitor never makes autonomous production changes.
              Every PR requires your team&apos;s review and approval before merging.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Quickstart", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "LLM Integration", href: "/docs/advanced/ai-janitor-llm-integration" },
          { label: "Git Provider Configuration", href: "/docs/advanced/ai-janitor-git-providers" },
          { label: "PR Workflow Details", href: "/docs/advanced/ai-janitor-pr-workflow" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors font-medium"
          >
            <ArrowRightIcon size={14} />
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
