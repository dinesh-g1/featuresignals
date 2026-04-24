"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, timeAgo } from "@/lib/utils";
import {
  GitPullRequest,
  GitPullRequestClosed,
  AlertTriangle,
  CheckCircle,
  Search,
  ArrowRight,
  FileCode,
  Trash2,
  Sparkles,
  RefreshCw,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────

interface StaleFlag {
  key: string;
  name: string;
  type: string;
  status: string;
  environment: string;
  daysServed: number;
  percentageTrue: number;
  safeToRemove: boolean;
  lastEvaluated: string;
  prUrl?: string;
  prStatus?: "open" | "merged" | "failed";
}

interface JanitorStats {
  totalFlags: number;
  staleFlags: number;
  safeToRemove: number;
  openPRs: number;
  mergedPRs: number;
  lastScan: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────
// In production, this comes from the janitor engine API
const MOCK_STALE_FLAGS: StaleFlag[] = [
  {
    key: "new-checkout-flow",
    name: "New Checkout Flow",
    type: "boolean",
    status: "active",
    environment: "Production",
    daysServed: 45,
    percentageTrue: 100,
    safeToRemove: true,
    lastEvaluated: new Date(Date.now() - 3600000).toISOString(),
    prUrl: "https://github.com/acmecorp/webapp/pull/842",
    prStatus: "open",
  },
  {
    key: "dark-mode-toggle",
    name: "Dark Mode",
    type: "boolean",
    status: "active",
    environment: "Production",
    daysServed: 120,
    percentageTrue: 100,
    safeToRemove: true,
    lastEvaluated: new Date(Date.now() - 7200000).toISOString(),
    prUrl: "https://github.com/acmecorp/webapp/pull/840",
    prStatus: "merged",
  },
  {
    key: "beta-recommendations",
    name: "AI Recommendations",
    type: "boolean",
    status: "active",
    environment: "Production",
    daysServed: 90,
    percentageTrue: 85,
    safeToRemove: false,
    lastEvaluated: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    key: "legacy-pricing-v2",
    name: "Legacy Pricing V2",
    type: "boolean",
    status: "deprecated",
    environment: "Production",
    daysServed: 200,
    percentageTrue: 0,
    safeToRemove: true,
    lastEvaluated: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    key: "onboarding-v3-flow",
    name: "Onboarding V3",
    type: "boolean",
    status: "active",
    environment: "Staging",
    daysServed: 60,
    percentageTrue: 50,
    safeToRemove: false,
    lastEvaluated: new Date(Date.now() - 14400000).toISOString(),
  },
];

const MOCK_STATS: JanitorStats = {
  totalFlags: 28,
  staleFlags: 12,
  safeToRemove: 4,
  openPRs: 2,
  mergedPRs: 8,
  lastScan: new Date().toISOString(),
};

// ─── Stale Flag Row ─────────────────────────────────────────────────

function StaleFlagRow({
  flag,
  onGeneratePR,
  onDismiss,
}: {
  flag: StaleFlag;
  onGeneratePR: (key: string) => void;
  onDismiss: (key: string) => void;
}) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePR = async () => {
    setGenerating(true);
    await onGeneratePR(flag.key);
    setGenerating(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl border p-4 transition-all",
        flag.safeToRemove
          ? "border-stone-200 bg-white hover:border-amber-200 hover:bg-amber-50/30"
          : "border-stone-200 bg-white/60 opacity-70",
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Status icon */}
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            flag.prStatus === "merged"
              ? "bg-emerald-100 text-emerald-600"
              : flag.prStatus === "open"
                ? "bg-blue-100 text-blue-600"
                : flag.safeToRemove
                  ? "bg-amber-100 text-amber-600"
                  : "bg-stone-100 text-stone-400",
          )}
        >
          {flag.prStatus === "merged" ? (
            <CheckCircle className="h-4 w-4" strokeWidth={2} />
          ) : flag.prStatus === "open" ? (
            <GitPullRequest className="h-4 w-4" strokeWidth={2} />
          ) : flag.safeToRemove ? (
            <FileCode className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Clock className="h-4 w-4" strokeWidth={2} />
          )}
        </div>

        {/* Flag info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-semibold text-stone-900">
              {flag.key}
            </code>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500">{flag.name}</span>
            <Badge
              variant={
                flag.percentageTrue >= 100
                  ? "danger"
                  : flag.percentageTrue >= 80
                    ? "warning"
                    : "default"
              }
            >
              {flag.percentageTrue}% True
            </Badge>
            {flag.prStatus === "merged" && (
              <Badge variant="success">Cleaned</Badge>
            )}
            {flag.prStatus === "open" && (
              <Badge variant="primary">PR Open</Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
            <span>
              {flag.daysServed} day{flag.daysServed > 1 ? "s" : ""} at 100%
            </span>
            <span>·</span>
            <span>{flag.environment}</span>
            <span>·</span>
            <span>Last eval: {timeAgo(flag.lastEvaluated)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {flag.prStatus === "open" && flag.prUrl && (
          <a
            href={flag.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <ExternalLink className="h-3 w-3" />
            View PR
          </a>
        )}
        {flag.safeToRemove && !flag.prStatus && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePR}
            loading={generating}
            disabled={generating}
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            Generate PR
          </Button>
        )}
        {flag.safeToRemove && flag.prStatus !== "merged" && (
          <button
            onClick={() => onDismiss(flag.key)}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Dismiss"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function JanitorPage() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [stats] = useState<JanitorStats>(MOCK_STATS);
  const [staleFlags, setStaleFlags] = useState<StaleFlag[]>(MOCK_STALE_FLAGS);
  const [filter, setFilter] = useState<"all" | "safe" | "prs">("all");
  const [scanning, setScanning] = useState(false);

  const handleGeneratePR = async (key: string) => {
    // In production: POST /v1/janitor/generate-pr with flag key
    setStaleFlags((prev) =>
      prev.map((f) =>
        f.key === key
          ? {
              ...f,
              prStatus: "open" as const,
              prUrl: "https://github.com/acmecorp/webapp/pull/new",
            }
          : f,
      ),
    );
  };

  const handleDismiss = (key: string) => {
    setStaleFlags((prev) => prev.filter((f) => f.key !== key));
  };

  const handleScan = async () => {
    setScanning(true);
    // In production: POST /v1/janitor/scan
    await new Promise((r) => setTimeout(r, 2000));
    setScanning(false);
  };

  const filteredFlags = staleFlags.filter((f) => {
    if (filter === "safe") return f.safeToRemove;
    if (filter === "prs") return f.prStatus === "open";
    return true;
  });

  const safeCount = staleFlags.filter((f) => f.safeToRemove).length;
  const openPRCount = staleFlags.filter((f) => f.prStatus === "open").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="🤖 AI Janitor"
        description="Automatically detect and clean up stale feature flags before they become tech debt. The Janitor scans your codebase, identifies flags safe to remove, and generates pull requests — autonomously."
      >
        <Button
          variant="outline"
          onClick={handleScan}
          loading={scanning}
          disabled={scanning}
        >
          <RefreshCw
            className={cn("h-4 w-4", scanning && "animate-spin")}
            strokeWidth={1.5}
          />
          Scan Repository
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Flags"
          value={stats.totalFlags}
          icon="⚑"
        />
        <StatCard
          label="Stale Flags"
          value={stats.staleFlags}
          icon="⚠️"
        />
        <StatCard
          label="Safe to Remove"
          value={stats.safeToRemove}
          icon="🗑️"
        />
        <StatCard
          label="PRs Generated"
          value={stats.mergedPRs}
          icon="✅"
        />
      </div>

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
                  permanently serving 100% "True" or 0% "False" across all
                  environments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <GitPullRequest className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">2. Generate PR</h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  With one click, the Janitor generates a pull request that removes
                  the flag condition block from your code, preserving the "true"
                  branch.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Shield className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">3. Review & Merge</h4>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  Your team reviews the PR through your standard workflow. Once
                  merged, the flag is marked as rolled out and the code is clean.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-800">
            Janitor operational — last scan {timeAgo(stats.lastScan)}
          </span>
          <span className="text-[10px] text-emerald-600 font-mono">
            v0.1.0
          </span>
        </div>
        <Link
          href="/settings/integrations"
          className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors inline-flex items-center gap-1"
        >
          Configure
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        {[
          { value: "all" as const, label: "All Flags", count: staleFlags.length },
          { value: "safe" as const, label: "Safe to Remove", count: safeCount },
          { value: "prs" as const, label: "Open PRs", count: openPRCount },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors -mb-[9px]",
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

      {/* Stale Flags List */}
      <div className="space-y-3">
        {filteredFlags.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={CheckCircle}
              emoji="✨"
              title="No stale flags detected"
              description="All your feature flags are healthy. The Janitor will notify you when flags are ready for cleanup."
            />
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

      {/* Info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <h4 className="text-sm font-bold text-stone-800 mb-1">
                About the AI Janitor
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                The AI Janitor analyzes your codebase at the repository level using
                GitHub App integration. It safely removes flag condition blocks
                while preserving the active branch (e.g., keeps the "true" body,
                removes the "if/else"). The result is a clean, reviewable PR that
                eliminates tech debt before it accumulates. Supports JavaScript,
                TypeScript, Go, Python, Java, and Ruby.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
