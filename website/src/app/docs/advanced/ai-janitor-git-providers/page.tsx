import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import Callout from "@/components/docs/Callout";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "AI Janitor Git Providers",
  description:
    "Supported Git providers for AI Janitor — GitHub, GitLab, Bitbucket — with OAuth setup guides and required permissions for each.",
};

interface ProviderConfig {
  name: string;
  icon: string;
  oauthType: string;
  tokenType: string;
  permissions: string[];
  setupSteps: string[];
}

const providers: ProviderConfig[] = [
  {
    name: "GitHub",
    icon: "GH",
    oauthType: "GitHub OAuth App",
    tokenType: "Fine-grained personal access token or OAuth",
    permissions: [
      "Read access to code and metadata (required for scanning)",
      "Read access to pull requests (required for PR analysis)",
      "Write access to pull requests (required for PR creation)",
      "Read access to commit statuses (optional, for CI status checks)",
    ],
    setupSteps: [
      "In AI Janitor settings, click Connect next to GitHub",
      "Authorize the FeatureSignals OAuth app when prompted",
      "Select the repositories to grant access to (all repos or specific repos)",
      "Configure the permission level: Read-only for scanning, Read & Write for PR creation",
      "Click Save — the connection will be verified automatically",
    ],
  },
  {
    name: "GitLab",
    icon: "GL",
    oauthType: "GitLab OAuth Application",
    tokenType: "Personal access token or Group access token",
    permissions: [
      "read_repository (required for scanning)",
      "read_api (required for project/merge request metadata)",
      "write_repository (required for PR/MR creation — GitLab merge requests)",
    ],
    setupSteps: [
      "In GitLab, create a Personal Access Token or Group Access Token",
      "Select scopes: read_repository, read_api, and optionally write_repository",
      "In AI Janitor settings, click Connect next to GitLab",
      "Enter your GitLab instance URL (https://gitlab.com for cloud, or your self-hosted URL)",
      "Paste the access token and click Save",
    ],
  },
  {
    name: "Bitbucket",
    icon: "BB",
    oauthType: "Bitbucket OAuth Consumer",
    tokenType: "App password or OAuth consumer key/secret",
    permissions: [
      "Repositories: Read (required for scanning)",
      "Pull requests: Read (required for PR analysis)",
      "Pull requests: Write (required for PR creation)",
    ],
    setupSteps: [
      "In Bitbucket, create an App Password (Settings → App Passwords)",
      "Grant permissions: Repositories (Read), Pull Requests (Read, optional Write)",
      "In AI Janitor settings, click Connect next to Bitbucket",
      "Enter your Bitbucket username and the App Password",
      "For Bitbucket Data Center (self-hosted), also provide your base URL",
      "Click Save — the connection will be verified automatically",
    ],
  },
];

export default function AiJanitorGitProvidersPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor Git Providers
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        AI Janitor integrates with your Git provider to scan source code for feature flag
        references and generate cleanup pull requests. Choose your provider below for
        detailed setup instructions.
      </p>

      {/* Supported Providers Overview */}
      <SectionHeading>Supported Providers</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          {
            name: "GitHub",
            editions: "GitHub.com, GitHub Enterprise Server, GitHub Enterprise Cloud",
            icon: "🟣",
          },
          {
            name: "GitLab",
            editions: "GitLab.com, GitLab Self-Managed (CE/EE)",
            icon: "🟠",
          },
          {
            name: "Bitbucket",
            editions: "Bitbucket Cloud, Bitbucket Data Center",
            icon: "🔵",
          },
        ].map((p) => (
          <div
            key={p.name}
            className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{p.icon}</span>
              <h3 className="font-semibold text-[var(--signal-fg-primary)]">{p.name}</h3>
            </div>
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
              {p.editions}
            </p>
          </div>
        ))}
      </div>

      {/* Connection Methods */}
      <SectionHeading>Connection Methods</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        AI Janitor supports two connection methods for each provider:
      </p>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
          <h3 className="font-semibold text-[var(--signal-fg-primary)] mb-2">
            OAuth (Recommended)
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
            Click-through authorization via the provider&apos;s OAuth flow. AI Janitor
            never sees your credentials; permissions are scoped and revocable from your
            provider&apos;s settings. Available for GitHub, GitLab, and Bitbucket Cloud.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
          <h3 className="font-semibold text-[var(--signal-fg-primary)] mb-2">
            Access Token
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
            Provide a personal access token or app password. Required for self-hosted
            instances (GitHub Enterprise Server, GitLab Self-Managed, Bitbucket Data
            Center) where OAuth may not be configured. Tokens are encrypted at rest.
          </p>
        </div>
      </div>

      {/* Provider Details */}
      <SectionHeading>Setup by Provider</SectionHeading>

      {providers.map((provider) => (
        <div key={provider.name} className="mb-10">
          <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-4">
            {provider.name}
          </h3>

          {/* Permissions */}
          <h4 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-2">
            Required Permissions
          </h4>
          <ul className="list-none space-y-1 mb-4">
            {provider.permissions.map((perm) => (
              <li key={perm} className="flex items-start gap-2 text-sm text-[var(--signal-fg-primary)]">
                <Check size={14} className="text-[var(--signal-fg-success)] mt-0.5 shrink-0" />
                <span>{perm}</span>
              </li>
            ))}
          </ul>

          {/* Setup Steps */}
          <h4 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-2">
            Setup Steps
          </h4>
          <ol className="list-decimal pl-6 space-y-2 text-sm text-[var(--signal-fg-primary)] mb-4">
            {provider.setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {/* Token / OAuth Details */}
          <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider shrink-0 mt-0.5">
                {provider.oauthType}:
              </span>
              <span className="text-sm text-[var(--signal-fg-secondary)]">
                {provider.tokenType}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Self-Hosted Notes */}
      <Callout variant="info" title="Self-hosted instances">
        For self-hosted Git providers (GitHub Enterprise Server, GitLab Self-Managed,
        Bitbucket Data Center), you must provide your instance&apos;s base URL during
        setup. AI Janitor will use this URL for all API calls. Ensure your instance is
        reachable from FeatureSignals&apos; IP ranges — see the{" "}
        <Link href="/docs/deployment/network" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
          Network Configuration
        </Link>{" "}
        guide for details.
      </Callout>

      {/* Managing Connections */}
      <SectionHeading>Managing Connections</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        You can manage all Git provider connections from the AI Janitor settings page:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Add connection</strong> — Connect additional providers or repositories
        </li>
        <li>
          <strong>Reauthorize</strong> — Refresh an expired OAuth token
        </li>
        <li>
          <strong>Change permissions</strong> — Upgrade from read-only to read-write for
          PR creation
        </li>
        <li>
          <strong>Remove connection</strong> — Disconnect a provider (existing scan
          results are preserved)
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Quickstart — Get started in 5 minutes", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "AI Janitor Configuration — Schedules and settings", href: "/docs/advanced/ai-janitor-configuration" },
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
