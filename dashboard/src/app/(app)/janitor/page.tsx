"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useJanitor } from "@/hooks/use-janitor";
import { useJanitorStats } from "@/hooks/use-janitor-stats";
import { useJanitorScanProgress } from "@/hooks/use-janitor-scan-progress";
import { JanitorIcon } from "@/components/icons/janitor-icon";
import { StatsCards } from "@/components/janitor/stats-cards";
import { StaleFlagRow } from "@/components/janitor/stale-flag-row";
import { SetupWizard } from "@/components/janitor/setup-wizard";
import { ScanProgressOverlay } from "@/components/janitor/scan-progress-overlay";
import { LLMStatusBadge } from "@/components/janitor/llm-status-badge";
import { DocsLink } from "@/components/docs-link";
import {
  Search,
  GitPullRequest,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Repository } from "@/lib/api";

export default function JanitorPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [filter, setFilter] = useState<"all" | "safe" | "prs">("all");
  const [scanning, setScanning] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(true); // default true for initial load

  const {
    flags,
    loading: flagsLoading,
    error: flagsError,
    refresh: refreshFlags,
    generatePR,
    dismissFlag,
  } = useJanitor(filter === "prs" ? "active" : undefined);
  const { stats, loading: statsLoading } = useJanitorStats();
  const scanProgress = useJanitorScanProgress(activeScanId);

  // Load repositories on mount
  useEffect(() => {
    if (!token || !currentProjectId) return;
    let cancelled = false;
    api
      .listRepositories(token, currentProjectId)
      .then((data) => {
        if (cancelled) return;
        setRepos(data.data || []);
        setShowWizard((data.data || []).length === 0);
        setReposLoading(false);
      })
      .catch(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, currentProjectId]);

  const handleScan = useCallback(async () => {
    if (!currentProjectId || !token) return;
    setScanning(true);
    try {
      const result = await api.scanRepository(token, currentProjectId);
      setActiveScanId(result.scan_id);
      // Poll for scan completion
      const poll = setInterval(async () => {
        try {
          const status = await api.getScanStatus(token, result.scan_id);
          if (status.status === "completed" || status.status === "failed") {
            clearInterval(poll);
            setScanning(false);
            setActiveScanId(null);
            refreshFlags();
          }
        } catch {
          clearInterval(poll);
          setScanning(false);
        }
      }, 2000);
    } catch {
      setScanning(false);
    }
  }, [currentProjectId, refreshFlags]);

  const handleGeneratePR = useCallback(
    async (flagKey: string) => {
      if (!currentProjectId || repos.length === 0) return;
      const repoId = repos[0].id;
      await generatePR(flagKey, repoId);
    },
    [currentProjectId, repos, generatePR],
  );

  const handleDismiss = useCallback(
    async (flagKey: string) => {
      await dismissFlag(flagKey);
    },
    [dismissFlag],
  );

  const handleRepoConnected = useCallback(
    (_result: unknown) => {
      setShowWizard(false);
      // Refresh repos list
      if (!token || !currentProjectId) return;
      api
        .listRepositories(token, currentProjectId)
        .then((data) => setRepos(data.data || []))
        .catch(() => {});
    },
    [token, currentProjectId],
  );

  // Compute filter counts
  const safeCount = flags.filter((f) => f.safe_to_remove).length;
  const openPRCount = flags.filter((f) => f.pr_status === "open").length;

  // Determine which filters to apply locally
  const filteredFlags = flags.filter((f) => {
    if (filter === "safe") return f.safe_to_remove;
    if (filter === "prs") return f.pr_status === "open";
    return true;
  });

  // Loading state
  const isLoading = flagsLoading || statsLoading || reposLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <JanitorIcon className="h-6 w-6 text-accent" />
            <span>AI Janitor</span>
          </div>
        }
        description="Automatically detect and clean up stale feature flags before they become tech debt. The Janitor scans your codebase, identifies flags safe to remove, and generates pull requests — autonomously."
      >
        <div className="flex items-center gap-2">
          <DocsLink href="/docs/advanced/ai-janitor" label="📚 Docs" />
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100"
          >
            ⚙️ Settings
          </Link>
          <Button
            variant="outline"
            onClick={handleScan}
            loading={scanning}
            disabled={scanning || repos.length === 0}
          >
            <RefreshCw
              className={cn("h-4 w-4", scanning && "animate-spin")}
              strokeWidth={1.5}
            />
            Scan Now
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <StatsCards
        totalFlags={stats?.total_flags ?? 0}
        staleFlags={stats?.stale_flags ?? 0}
        safeToRemove={stats?.safe_to_remove ?? 0}
        prsGenerated={stats?.merged_prs ?? 0}
      />

      {/* Scan Progress Overlay */}
      {activeScanId && scanProgress.phase !== "idle" && (
        <ScanProgressOverlay
          state={scanProgress}
          onClose={() => {
            setActiveScanId(null);
            scanProgress.reset();
          }}
          onCancel={() => {
            setActiveScanId(null);
            scanProgress.reset();
          }}
        />
      )}

      {/* How it Works */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Search className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">1. Scan</h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  The Janitor scans your codebase for flags that have been
                  permanently serving 100% &quot;True&quot; or 0%
                  &quot;False&quot; across all environments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Brain className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">
                  2. AI Analyze
                </h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  DeepSeek AI analyzes multi-file references, validates safe
                  removal paths, and provides confidence scores for each flag.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <GitPullRequest
                  className="h-5 w-5 text-accent"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">
                  3. Generate PR
                </h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  With one click, the Janitor generates a pull request that
                  removes the flag condition block from your code, preserving
                  the active branch.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Wizard for first-time users */}
      {showWizard && repos.length === 0 && (
        <SetupWizard
          onRepoConnected={handleRepoConnected}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* LLM Status */}
      <div className="flex items-center justify-between">
        <LLMStatusBadge
          provider="DeepSeek"
          confidence={0.95}
          status="available"
        />
        <DocsLink
          href="/docs/advanced/ai-janitor-llm-integration"
          label="How AI analysis works →"
        />
      </div>

      {/* Status banner */}
      {!showWizard && (
        <div
          className={cn(
            "rounded-xl border p-4 flex items-center justify-between",
            stats?.stale_flags && stats.stale_flags > 0
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-2.5 w-2.5",
                stats?.stale_flags && stats.stale_flags > 0
                  ? "text-amber-500"
                  : "text-emerald-500",
              )}
            >
              <span
                className={cn(
                  "absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full opacity-75",
                  stats?.stale_flags && stats.stale_flags > 0
                    ? "bg-amber-400"
                    : "bg-emerald-400",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  stats?.stale_flags && stats.stale_flags > 0
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
              />
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                stats?.stale_flags && stats.stale_flags > 0
                  ? "text-amber-800"
                  : "text-emerald-800",
              )}
            >
              {stats?.stale_flags && stats.stale_flags > 0
                ? `${stats.stale_flags} stale flag${stats.stale_flags > 1 ? "s" : ""} detected`
                : "All clean — no stale flags detected"}
            </span>
            {stats?.last_scan && (
              <span className="text-xs text-stone-400 ml-2">
                Last scan: {new Date(stats.last_scan).toLocaleDateString()}
              </span>
            )}
          </div>
          <DocsLink
            href="/docs/advanced/ai-janitor-quickstart"
            label="Quickstart →"
          />
        </div>
      )}

      {/* Error state */}
      {flagsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Failed to load stale flags
            </p>
            <p className="text-xs text-red-600 mt-0.5">{flagsError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={refreshFlags}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      {!showWizard && !flagsError && (
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          {[
            { value: "all" as const, label: "All Flags", count: flags.length },
            {
              value: "safe" as const,
              label: "Safe to Remove",
              count: safeCount,
            },
            { value: "prs" as const, label: "Open PRs", count: openPRCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors -mb-2.25",
                filter === tab.value
                  ? "border-b-2 border-accent text-accent"
                  : "text-stone-500 hover:text-stone-800",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  filter === tab.value
                    ? "bg-accent text-white"
                    : "bg-stone-200 text-stone-600",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Stale Flags List */}
      {!showWizard && !flagsError && (
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-stone-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-stone-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-stone-200" />
                      <div className="h-3 w-32 rounded bg-stone-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={CheckCircle}
                emoji="✨"
                title="No stale flags detected"
                description={
                  filter === "safe"
                    ? "No flags are currently safe to remove."
                    : filter === "prs"
                      ? "No open PRs for flag cleanup."
                      : "All your feature flags are healthy. The Janitor will notify you when flags are ready for cleanup."
                }
              >
                {filter !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter("all")}
                  >
                    View All
                  </Button>
                )}
              </EmptyState>
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <StaleFlagRow
                key={flag.key}
                flag={flag}
                onGeneratePR={handleGeneratePR}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </div>
      )}

      {/* Info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <JanitorIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-stone-800 mb-1">
                About the AI Janitor
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                The AI Janitor analyzes your codebase at the repository level
                using Git provider integration. It safely removes flag condition
                blocks while preserving the active branch. The result is a
                clean, reviewable PR that eliminates tech debt before it
                accumulates. Powered by DeepSeek AI for intelligent multi-file
                code understanding. Supports JavaScript, TypeScript, Go, Python,
                Java, and Ruby.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <DocsLink
                  href="/docs/advanced/ai-janitor-configuration"
                  label="Configuration →"
                />
                <DocsLink
                  href="/docs/advanced/ai-janitor-pr-workflow"
                  label="PR Workflow →"
                />
                <DocsLink
                  href="/docs/advanced/ai-janitor-troubleshooting"
                  label="Troubleshooting →"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
