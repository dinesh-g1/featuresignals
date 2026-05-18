"use client";

/**
 * ConnectZone — Left zone (240px) of the FeatureSignals Console.
 *
 * Shows the customer's integration status: Repositories, SDKs,
 * Your Agents, and API Keys — their INPUTS into the lifecycle.
 *
 * States handled per section: Loading (shimmer), Error (retry),
 * Empty (CTA message), Success (data cards).
 *
 * CRITICAL BOUNDARY: "Your Agents" = customer's OWN AI agents.
 * Internal platform agents NEVER visible. Everything org-scoped.
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  Terminal,
  Bot,
  Key,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Clock,
  Gavel,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { useConsoleIntegrations } from "@/hooks/use-console-integrations";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ScanResults } from "@/components/console/scan-results";
import { AgentControlsPanel } from "@/components/console/agent-controls-panel";
import {
  SdkSnippetPanel,
  type SdkLanguage,
} from "@/components/console/sdk-snippet";
import { api } from "@/lib/api";
import type {
  RepoStatus,
  SdkStatus,
  ApiKeyStatus,
  PolicyStatus,
} from "@/lib/console-types";
import type { ConnectSection } from "@/components/console/connect-icon-strip";

// ─── Helpers ─────────────────────────────────────────────────────────

/** Status dot colors mapped to Signal UI tokens */
const DOT_COLORS = {
  connected: "var(--signal-fg-success)",
  active: "var(--signal-fg-success)",
  online: "var(--signal-fg-success)",
  disconnected: "var(--signal-fg-tertiary)",
  inactive: "var(--signal-fg-tertiary)",
  offline: "var(--signal-fg-tertiary)",
  scanning: "var(--signal-fg-accent)",
  degraded: "var(--signal-fg-warning)",
  error: "var(--signal-fg-danger)",
  expiring: "var(--signal-fg-warning)",
  expired: "var(--signal-fg-danger)",
} as const;

function StatusDot({
  state,
  pulse = false,
}: {
  state: keyof typeof DOT_COLORS;
  pulse?: boolean;
}) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full",
          pulse && "animate-ping opacity-75",
        )}
        style={{ backgroundColor: DOT_COLORS[state] }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: DOT_COLORS[state] }}
      />
    </span>
  );
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Collapsible Section ─────────────────────────────────────────────

interface CollapsibleSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

function CollapsibleSection({
  icon: Icon,
  label,
  count,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-semibold text-[var(--signal-fg-accent)]">
            {count}
          </span>
        )}
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-[var(--signal-border-subtle)] px-3 py-2 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components: Repositories ────────────────────────────────────

function RepoItem({
  repo,
  showComplianceBadge = false,
}: {
  repo: RepoStatus;
  showComplianceBadge?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isScanning = repo.status === "scanning";
  const isConnected = repo.status === "connected";
  const isError = repo.status === "error";
  const state = (
    isScanning
      ? "scanning"
      : isError
        ? "error"
        : isConnected
          ? "connected"
          : "disconnected"
  ) as keyof typeof DOT_COLORS;

  return (
    <div className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-2 py-1.5 px-2 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
        aria-expanded={expanded}
      >
        <StatusDot state={state} pulse={isScanning} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate">
              {repo.name}
            </span>
            {showComplianceBadge && isConnected && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-semibold shrink-0"
                style={{
                  backgroundColor: "var(--signal-bg-success-muted)",
                  color: "var(--signal-fg-success)",
                }}
                title="Compliant"
              >
                <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                Compliant
              </span>
            )}
            <span className="text-[10px] text-[var(--signal-fg-tertiary)] shrink-0">
              {repo.provider}
            </span>
          </div>
          {isScanning && (
            <p className="text-[10px] text-[var(--signal-fg-accent)] mt-0.5">
              Scanning…
            </p>
          )}
          {isError && (
            <p className="text-[10px] text-[var(--signal-fg-danger)] mt-0.5 truncate">
              Connection error
            </p>
          )}
          {isConnected && !isScanning && repo.last_synced_at && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
              Scanned {formatRelativeTime(repo.last_synced_at)}
              {repo.open_prs > 0 && ` · ${repo.open_prs} open PRs`}
            </p>
          )}
          {!isConnected && !isScanning && !isError && (
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
              Not connected
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)] mt-0.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)] mt-0.5" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && isConnected && (
        <div className="border-t border-[var(--signal-border-subtle)] px-3 py-2 bg-[var(--signal-bg-secondary)] space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--signal-fg-tertiary)]">
              Default branch
            </span>
            <span className="font-mono text-[var(--signal-fg-primary)]">
              {repo.default_branch}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--signal-fg-tertiary)]">Total PRs</span>
            <span className="font-mono text-[var(--signal-fg-primary)]">
              {repo.total_prs}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--signal-fg-tertiary)]">Open PRs</span>
            <span className="font-mono text-[var(--signal-fg-primary)]">
              {repo.open_prs}
            </span>
          </div>
          {repo.last_synced_at && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--signal-fg-tertiary)]">
                Last scan
              </span>
              <span className="text-[var(--signal-fg-primary)]">
                {formatRelativeTime(repo.last_synced_at)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RepositoriesSection({
  repos,
  showComplianceBadges = false,
  onConnectRepo,
}: {
  repos: RepoStatus[];
  showComplianceBadges?: boolean;
  onConnectRepo?: () => void;
}) {
  const reposTotal = repos.length;
  const displayRepos = repos.slice(0, 5);
  const hasMore = repos.length > 5;

  return (
    <CollapsibleSection
      icon={GitBranch}
      label="Repositories"
      count={repos.filter((r) => r.status === "connected").length}
      defaultOpen={repos.length > 0}
    >
      {repos.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <GitBranch className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No repositories connected
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] mb-2.5 leading-relaxed max-w-[180px] mx-auto">
            Connect GitHub, GitLab, or Bitbucket to scan feature flags in your
            code.
          </p>
          <button
            type="button"
            onClick={onConnectRepo}
            className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect Repository
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {displayRepos.map((repo) => (
              <RepoItem
                key={repo.name}
                repo={repo}
                showComplianceBadge={showComplianceBadges}
              />
            ))}
          </div>
          {hasMore && (
            <Link
              href="/settings/integrations"
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              View all {reposTotal} repositories
            </Link>
          )}
          {!hasMore && (
            <button
              type="button"
              onClick={onConnectRepo}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              <Plus className="h-3 w-3" />
              Connect new repo
            </button>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}

// ─── Sub-components: SDKs ────────────────────────────────────────────

const SDK_LANGUAGE_LABELS: Record<string, string> = {
  go: "Go",
  node: "Node.js",
  python: "Python",
  react: "React",
  java: "Java",
  dotnet: ".NET",
  ruby: "Ruby",
  vue: "Vue",
};

function SdkItem({
  sdk,
  onViewSnippet,
}: {
  sdk: SdkStatus;
  onViewSnippet?: (lang: SdkLanguage) => void;
}) {
  const state = (
    sdk.status === "active" ? "active" : "inactive"
  ) as keyof typeof DOT_COLORS;
  const label = SDK_LANGUAGE_LABELS[sdk.language] ?? sdk.language;
  const isSdkLang = (lang: string): lang is SdkLanguage =>
    ALL_SDK_LANGUAGES.includes(lang as SdkLanguage);

  return (
    <div className="flex items-center gap-2 py-1.5">
      <StatusDot state={state} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
            {label}
          </span>
          {sdk.version && (
            <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
              v{sdk.version}
            </span>
          )}
        </div>
        {sdk.status === "active" && (
          <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
            Active
            {sdk.environments.length > 0 &&
              ` · ${sdk.environments.length} env${sdk.environments.length !== 1 ? "s" : ""}`}
            {sdk.last_seen_at &&
              ` · last seen ${formatRelativeTime(sdk.last_seen_at)}`}
          </p>
        )}
        {sdk.status !== "active" && sdk.last_seen_at && (
          <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
            Last seen {formatRelativeTime(sdk.last_seen_at)}
          </p>
        )}
        {sdk.status !== "active" && !sdk.last_seen_at && (
          <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
            Not connected
          </p>
        )}
      </div>
      {isSdkLang(sdk.language) && onViewSnippet && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewSnippet(sdk.language as SdkLanguage);
          }}
          className="shrink-0 inline-flex items-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--signal-fg-tertiary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
          title={`View ${label} SDK snippet`}
        >
          <Terminal className="h-2.5 w-2.5" />
          Snippet
        </button>
      )}
    </div>
  );
}

const ALL_SDK_LANGUAGES: SdkLanguage[] = [
  "go",
  "node",
  "python",
  "react",
  "java",
  "dotnet",
  "ruby",
  "vue",
];

function SdksSection({
  sdks,
  onSelectSdk,
}: {
  sdks: SdkStatus[];
  onSelectSdk?: (lang: SdkLanguage) => void;
}) {
  const activeCount = sdks.filter((s) => s.status === "active").length;
  const installedLangs = new Set(sdks.map((s) => s.language));
  const availableLangs = ALL_SDK_LANGUAGES.filter(
    (lang) => !installedLangs.has(lang),
  );
  const sdksTotal = sdks.length;
  const displaySdks = sdks.slice(0, 5);
  const hasMore = sdks.length > 5;

  return (
    <CollapsibleSection
      icon={Terminal}
      label="SDKs"
      count={activeCount}
      defaultOpen={sdks.length > 0}
    >
      {sdks.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Terminal className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No SDKs detected
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] mb-2.5 leading-relaxed max-w-[180px] mx-auto">
            Install an SDK to start evaluating feature flags in your app.
          </p>
          <div className="flex gap-1.5 justify-center">
            {(["go", "node", "python"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onSelectSdk?.(lang)}
                className="inline-flex items-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-all duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-default)]"
              >
                <Terminal className="h-3 w-3" />
                {lang === "go" ? "Go" : lang === "node" ? "Node" : "Python"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-0.5">
            {displaySdks.map((sdk) => (
              <SdkItem
                key={sdk.language}
                sdk={sdk}
                onViewSnippet={onSelectSdk}
              />
            ))}
          </div>
          {hasMore && (
            <Link
              href="/settings/sdks"
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              View all {sdksTotal} SDKs
            </Link>
          )}
          {!hasMore && availableLangs.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onSelectSdk?.(availableLangs[0])}
                className="inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
              >
                <Plus className="h-3 w-3" />
                Install another SDK
              </button>
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}

// ─── Sub-components: API Keys ────────────────────────────────────────

function ApiKeyItem({ apiKey }: { apiKey: ApiKeyStatus }) {
  const [copied, setCopied] = useState(false);

  const state = (apiKey.status as keyof typeof DOT_COLORS) ?? "inactive";

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key_prefix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently ignore
    }
  }, [apiKey.key_prefix]);

  return (
    <div className="flex items-center gap-2 py-1.5">
      <StatusDot state={state} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate">
            {apiKey.name}
          </span>
          <span className="text-[10px] text-[var(--signal-fg-tertiary)] shrink-0">
            {apiKey.environment}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <code className="text-[10px] text-[var(--signal-fg-tertiary)] font-mono select-all">
            {apiKey.key_prefix}
          </code>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center shrink-0 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-colors"
            aria-label={copied ? "Copied" : "Copy key identifier"}
            title="Copy key identifier for reference"
          >
            {copied ? (
              <Check className="h-3 w-3 text-[var(--signal-fg-success)]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        {state === "expiring" && (
          <p className="text-[10px] text-[var(--signal-fg-warning)] mt-0.5">
            Expiring soon
          </p>
        )}
        {state === "expired" && (
          <p className="text-[10px] text-[var(--signal-fg-danger)] mt-0.5">
            Expired
          </p>
        )}
      </div>
    </div>
  );
}

function ApiKeysSection({
  apiKeys,
  showRetentionPolicy = false,
}: {
  apiKeys: ApiKeyStatus[];
  showRetentionPolicy?: boolean;
}) {
  const activeCount = apiKeys.filter((k) => k.status === "active").length;
  const keysTotal = apiKeys.length;
  const displayKeys = apiKeys.slice(0, 5);
  const hasMore = apiKeys.length > 5;

  return (
    <CollapsibleSection
      icon={Key}
      label="API Keys"
      count={activeCount}
      defaultOpen={apiKeys.length > 0}
    >
      {/* Retention policy indicator (L5 only) */}
      {showRetentionPolicy && apiKeys.length > 0 && (
        <div
          className="flex items-center gap-1.5 mb-2 px-1.5 py-1 rounded-[var(--signal-radius-sm)]"
          style={{
            backgroundColor: "var(--signal-bg-warning-muted)",
            color: "var(--signal-fg-warning)",
          }}
        >
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-medium">
            7-year retention policy enforced
          </span>
        </div>
      )}
      {apiKeys.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Key className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No API keys
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] mb-2.5 leading-relaxed max-w-[180px] mx-auto">
            Create an SDK key to initialize the FeatureSignals client or a
            server key for management API access.
          </p>
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-all duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create API Key
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-0.5">
            {displayKeys.map((apiKey) => (
              <ApiKeyItem key={apiKey.id} apiKey={apiKey} />
            ))}
          </div>
          {hasMore && (
            <Link
              href="/settings/api-keys"
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              View all {keysTotal} API keys
            </Link>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}

// ─── Sub-components: Policies ─────────────────────────────────────────

function PolicyItem({ policy }: { policy: PolicyStatus }) {
  const [expanded, setExpanded] = useState(false);
  const effectConfig: Record<
    string,
    {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      color: string;
    }
  > = {
    deny: { icon: Shield, label: "Deny", color: "var(--signal-fg-danger)" },
    require_human: {
      icon: AlertTriangle,
      label: "Review",
      color: "var(--signal-fg-warning)",
    },
    warn: {
      icon: AlertTriangle,
      label: "Warn",
      color: "var(--signal-fg-warning)",
    },
    audit: { icon: Gavel, label: "Audit", color: "var(--signal-fg-accent)" },
  };
  const ec = effectConfig[policy.effect] ?? effectConfig.audit;
  const EffectIcon = ec.icon;

  return (
    <div className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
        aria-expanded={expanded}
      >
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: policy.enabled
              ? "var(--signal-fg-success)"
              : "var(--signal-fg-tertiary)",
          }}
        />
        <span className="text-[11px] font-medium text-[var(--signal-fg-primary)] truncate flex-1">
          {policy.name}
        </span>
        <span
          className="inline-flex items-center gap-0.5 text-[9px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
          style={{
            color: ec.color,
            backgroundColor: `${ec.color}18`,
          }}
        >
          <EffectIcon className="h-2.5 w-2.5" />
          {ec.label}
        </span>
        <span className="text-[9px] text-[var(--signal-fg-tertiary)] shrink-0">
          {policy.rule_count} rule{policy.rule_count !== 1 ? "s" : ""}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
        )}
      </button>

      {/* Expanded: show CEL expressions */}
      {expanded && (
        <div className="border-t border-[var(--signal-border-subtle)] px-3 py-2 bg-[var(--signal-bg-secondary)] space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--signal-fg-tertiary)]">Priority</span>
            <span className="font-mono text-[var(--signal-fg-primary)]">
              {policy.priority}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--signal-fg-tertiary)]">Status</span>
            <span
              className={
                policy.enabled
                  ? "text-[var(--signal-fg-success)]"
                  : "text-[var(--signal-fg-tertiary)]"
              }
            >
              {policy.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {policy.rules && policy.rules.length > 0 && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                CEL Expressions
              </span>
              <div className="mt-1 space-y-1">
                {policy.rules.map((rule, i) => (
                  <pre
                    key={`${policy.id}-rule-${i}`}
                    className="overflow-x-auto rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-2 py-1 text-[10px] leading-relaxed font-mono text-[var(--signal-fg-primary)] whitespace-pre-wrap"
                  >
                    {rule.expression}
                  </pre>
                ))}
                {policy.rule_count > policy.rules.length && (
                  <p className="text-[9px] text-[var(--signal-fg-tertiary)]">
                    +{policy.rule_count - policy.rules.length} more rule
                    {policy.rule_count - policy.rules.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PoliciesSection({ policies }: { policies: PolicyStatus[] }) {
  const router = useRouter();
  const activeCount = policies.filter((p) => p.enabled).length;
  const policiesTotal = policies.length;
  const displayPolicies = policies.slice(0, 5);
  const hasMore = policies.length > 5;

  return (
    <CollapsibleSection
      icon={Gavel}
      label="Governance Policies"
      count={activeCount}
      defaultOpen={policies.length > 0}
    >
      {policies.length === 0 ? (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] mb-2.5">
            <Gavel className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--signal-fg-primary)] mb-1">
            No governance policies
          </p>
          <p className="text-[10px] text-[var(--signal-fg-secondary)] mb-2.5 leading-relaxed max-w-[180px] mx-auto">
            Create policies to govern agent behavior, require human approval, or
            audit critical actions.
          </p>
          <button
            type="button"
            onClick={() => router.push("/console/policies")}
            className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Policy
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {displayPolicies.map((policy) => (
              <PolicyItem key={policy.id} policy={policy} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => router.push("/console/policies")}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              View all {policiesTotal} policies
            </button>
          )}
          {!hasMore && (
            <button
              type="button"
              onClick={() => router.push("/console/policies")}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
            >
              <Gavel className="h-3 w-3" />
              Manage Policies
            </button>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function ConnectSkeleton() {
  return (
    <div className="space-y-2 px-3 pb-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={`connect-sk-${i}`}
          className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden animate-pulse"
        >
          {/* Header shimmer */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="h-4 w-4 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            <div className="h-3 w-20 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            <div className="flex-1" />
            <div className="h-3 w-3 rounded bg-[var(--signal-border-default)] shimmer-bg" />
          </div>
          {/* Content shimmer */}
          <div className="border-t border-[var(--signal-border-subtle)] px-3 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--signal-border-default)] shimmer-bg" />
              <div className="h-3 w-28 rounded bg-[var(--signal-border-default)] shimmer-bg" />
            </div>
            <div className="h-2 w-20 rounded bg-[var(--signal-border-default)] shimmer-bg ml-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function ConnectError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-3">
        <RefreshCw className="h-5 w-5 text-[var(--signal-fg-danger)]" />
      </div>
      <p className="text-xs text-[var(--signal-fg-secondary)] mb-3 max-w-[180px] leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-secondary)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] border border-[var(--signal-border-default)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

// ─── Welcome / Empty ─────────────────────────────────────────────────

function ConnectWelcome({
  onConnectRepo,
  onSelectSdk,
}: {
  onConnectRepo: () => void;
  onSelectSdk: (lang: SdkLanguage) => void;
}) {
  return (
    <div className="flex flex-col items-center px-3 pt-2 pb-4 text-center">
      {/* Rocket illustration */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm mb-4">
        <span className="text-2xl leading-none" aria-hidden="true">
          🚀
        </span>
      </div>

      <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
        Connect your stack
      </h3>
      <p className="mt-1.5 text-xs text-[var(--signal-fg-secondary)] leading-relaxed max-w-[200px]">
        Link a repository, install an SDK, and create an API key to start
        shipping features with confidence.
      </p>

      {/* Step 1: Connect repo */}
      <div className="mt-4 w-full space-y-3">
        <div className="flex items-start gap-2 text-left">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-bold text-[var(--signal-fg-accent)]">
            1
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--signal-fg-primary)]">
              Connect a repository
            </p>
            <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
              Scan your codebase to discover feature flags.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onConnectRepo}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Connect GitHub
        </button>
      </div>

      {/* Step 2: Install SDK */}
      <div className="mt-3 w-full">
        <div className="flex items-start gap-2 text-left mb-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-bold text-[var(--signal-fg-accent)]">
            2
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--signal-fg-primary)]">
              Install an SDK
            </p>
            <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
              Add feature evaluation to your app.
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 justify-center">
          {(["go", "node", "python"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onSelectSdk(lang)}
              className="inline-flex items-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-all duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-default)]"
            >
              <Terminal className="h-3 w-3" />
              {lang === "go" ? "Go" : lang === "node" ? "Node" : "Python"}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Create keys */}
      <div className="mt-3 w-full">
        <div className="flex items-start gap-2 text-left mb-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-bold text-[var(--signal-fg-accent)]">
            3
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--signal-fg-primary)]">
              Create API keys
            </p>
            <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
              Generate keys to authenticate your SDKs.
            </p>
          </div>
        </div>

        <Link
          href="/settings/api-keys"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-all duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
        >
          Create API Key
          <Key className="h-3.5 w-3.5" />
          Go to API Keys
        </Link>
      </div>
    </div>
  );
}
// ─── Main Component ──────────────────────────────────────────────────

export function ConnectZone() {
  const {
    data: integrations,
    isLoading: loading,
    error: queryError,
  } = useConsoleIntegrations();
  const error = queryError instanceof Error ? queryError.message : null;
  const { isL1, isL4, isL5 } = useConsoleMaturity();
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const hasRepos = (integrations?.repositories?.data?.length ?? 0) > 0;

  const searchParams = useSearchParams();

  // SDK snippet panel state
  const [sdkLanguage, setSdkLanguage] = useState<SdkLanguage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // L1: Only repos and SDKs. L2+: All cards.
  const showAgents = !isL1;
  const showApiKeys = !isL1;
  const showScanResults = hasRepos && !isL1 && currentProjectId !== null;
  // L4+: Compliance badges on repos
  const showComplianceBadges = isL4 || isL5;
  // L5: Retention policy indicator on API keys
  const showRetentionPolicy = isL5;

  const isEmpty =
    integrations &&
    (integrations.repositories?.data?.length ?? 0) === 0 &&
    (integrations.sdks?.data?.length ?? 0) === 0 &&
    (integrations.agents?.data?.length ?? 0) === 0 &&
    (integrations.api_keys?.data?.length ?? 0) === 0 &&
    (integrations.policies?.data?.length ?? 0) === 0 &&
    !showScanResults;

  // Handle github_connected / github_error URL params
  useEffect(() => {
    const connected = searchParams.get("github_connected");
    const errorParam = searchParams.get("github_error");

    if (connected === "true") {
      setToastMessage("Repository connected successfully");
      if (token) {
        // Invalidate the integrations query to trigger a refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.console.integrations(),
        });
      }
    } else if (errorParam) {
      setToastMessage(
        errorParam === "github_auth_failed"
          ? "GitHub connection failed. Please try again."
          : "Connection error. Please try again.",
      );
    }
  }, [searchParams, token]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleConnectRepo = useCallback(() => {
    const orgID = organization?.id ?? "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiBase}/v1/integrations/github/auth?orgId=${encodeURIComponent(orgID)}`;
  }, [organization]);

  const handleSelectSdk = useCallback((lang: SdkLanguage) => {
    setSdkLanguage(lang);
  }, []);

  const handleCloseSdk = useCallback(() => {
    setSdkLanguage(null);
  }, []);

  // Dispatch wide/normal events when SDK snippet panel opens/closes
  useEffect(() => {
    if (sdkLanguage) {
      window.dispatchEvent(new CustomEvent("fs:connect-wide"));
    } else {
      window.dispatchEvent(new CustomEvent("fs:connect-normal"));
    }
  }, [sdkLanguage]);

  // Listen for scroll-to-section from icon strip clicks
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleScrollTo(e: Event) {
      const detail = (e as CustomEvent<{ section: ConnectSection }>).detail;
      if (!detail?.section || !contentRef.current) return;
      const sectionEl = contentRef.current.querySelector(
        `[data-connect-section="${detail.section}"]`,
      );
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("fs:connect-scroll-to", handleScrollTo);
    return () =>
      window.removeEventListener("fs:connect-scroll-to", handleScrollTo);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
          Connect
        </span>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="mx-3 mb-2 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-success-muted)] px-3 py-2 text-[11px] font-medium text-[var(--signal-fg-success)]">
          {toastMessage}
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {(loading || (!integrations && !error)) && <ConnectSkeleton />}

        {!loading && error && <ConnectError message={error} />}

        {!loading && !error && isEmpty && integrations && (
          <ConnectWelcome
            onConnectRepo={handleConnectRepo}
            onSelectSdk={handleSelectSdk}
          />
        )}

        {!loading && !error && !isEmpty && integrations && (
          <div className="space-y-2 px-3 pb-3">
            <div data-connect-section="repositories">
              <RepositoriesSection
                repos={integrations.repositories?.data ?? []}
                showComplianceBadges={showComplianceBadges}
                onConnectRepo={handleConnectRepo}
              />
            </div>
            <div data-connect-section="sdks">
              <SdksSection
                sdks={integrations.sdks?.data ?? []}
                onSelectSdk={handleSelectSdk}
              />
            </div>
            {showAgents && (
              <div data-connect-section="agents">
                <CollapsibleSection
                  icon={Bot}
                  label="Your Agents"
                  count={
                    integrations.agents?.data?.filter(
                      (a) => a.status === "online",
                    ).length ?? 0
                  }
                  defaultOpen={(integrations.agents?.data?.length ?? 0) > 0}
                >
                  <AgentControlsPanel
                    agents={integrations.agents?.data ?? []}
                    loading={false}
                  />
                </CollapsibleSection>
              </div>
            )}
            {showApiKeys && (
              <div data-connect-section="api-keys">
                <ApiKeysSection
                  apiKeys={integrations.api_keys?.data ?? []}
                  showRetentionPolicy={showRetentionPolicy}
                />
              </div>
            )}
            {showAgents && (
              <div data-connect-section="policies">
                <PoliciesSection policies={integrations.policies?.data ?? []} />
              </div>
            )}
            {showScanResults && currentProjectId && (
              <ScanResults projectId={currentProjectId} />
            )}
          </div>
        )}

        {/* SDK Snippet Panel */}
        {sdkLanguage && (
          <SdkSnippetPanel language={sdkLanguage} onClose={handleCloseSdk} />
        )}
      </div>
    </div>
  );
}
