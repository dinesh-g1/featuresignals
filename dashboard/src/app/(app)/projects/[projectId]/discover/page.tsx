"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Code2FlagReference } from "@/lib/api";
import {
  SearchIcon,
  SparklesIcon,
  RefreshIcon,
  AlertIcon,
  ArrowRightIcon,
  FilterIcon,
  CodeIcon,
  GitBranchIcon,
  EyeIcon,
} from "@/components/icons/nav-icons";
import { DocsLink } from "@/components/docs-link";

// ─── Helpers ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "modified", label: "Modified" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "usage", label: "Usage" },
  { value: "definition", label: "Definition" },
  { value: "cleanup_candidate", label: "Sweep Candidate" },
];

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-[var(--signal-fg-success)]";
  if (confidence >= 0.7) return "text-[var(--signal-fg-warning)]";
  return "text-[var(--signal-fg-danger)]";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.9) return "bg-[var(--signal-bg-success-muted)]";
  if (confidence >= 0.7) return "bg-[var(--signal-bg-warning-muted)]";
  return "bg-[var(--signal-bg-danger-muted)]";
}

function statusBadgeVariant(
  status: string,
): "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "accepted":
      return "success";
    case "unreviewed":
      return "warning";
    case "rejected":
      return "danger";
    case "modified":
      return "info";
    default:
      return "default" as never;
  }
}

function conditionalTypeLabel(ct: string): string {
  switch (ct) {
    case "if-statement":
      return "if-stmt";
    case "ternary":
      return "ternary";
    case "switch-case":
      return "switch";
    case "config-check":
      return "config";
    default:
      return ct;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────────

function DiscoverSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--signal-border-default)]" />
      <div className="h-5 w-96 animate-pulse rounded bg-[var(--signal-border-default)]" />
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--signal-border-default)]" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[var(--signal-border-default)]" />
        <div className="h-9 w-48 animate-pulse rounded-lg bg-[var(--signal-border-default)]" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-[var(--signal-border-default)]"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page (Inner) ────────────────────────────────────────────────────────

function DiscoverInner() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter state
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "",
  );
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "");
  const [repoFilter, setRepoFilter] = useState(
    searchParams.get("repository") || "",
  );
  // Data state
  const [references, setReferences] = useState<Code2FlagReference[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");

  // Fetch references
  const fetchReferences = useCallback(async () => {
    if (!token || !currentProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.code2flag.listReferences(
        token,
        currentProjectId,
        {
          type: typeFilter || undefined,
          repository: repoFilter || undefined,
          status: statusFilter || undefined,
          limit,
          offset: offsetVal,
        },
      );
      setReferences(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load feature candidates",
      );
    } finally {
      setLoading(false);
    }
  }, [
    token,
    currentProjectId,
    typeFilter,
    repoFilter,
    statusFilter,
    limit,
    offsetVal,
  ]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  // Update URL when filters change
  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Reset offset when filters change
      if (!("offset" in updates)) {
        params.delete("offset");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  // Derived: unique repositories for filter
  const uniqueRepos = useMemo(() => {
    const repos = new Set<string>();
    references.forEach((r) => repos.add(r.repository));
    return Array.from(repos).sort();
  }, [references]);

  const repoOptions = [
    { value: "", label: "All Repositories" },
    ...uniqueRepos.map((r) => ({ value: r, label: r })),
  ];

  // Loading state
  if (loading && references.length === 0) {
    return <DiscoverSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <SearchIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
            <span>Discover</span>
          </div>
        }
        description="Feature candidates found in your repositories. Survey your codebase to find conditionals that should be feature flags."
      >
        <div className="flex items-center gap-2">
          <DocsLink href="/docs/code2flag/discover" label="📚 Docs" />
          <Button variant="default">
            <RefreshIcon className="h-4 w-4" />
            Survey Now
          </Button>
        </div>
      </PageHeader>

      {/* How it Works */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
                <SearchIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--signal-fg-primary)]">
                  1. Survey
                </h4>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5 leading-relaxed">
                  Survey your codebase to discover conditionals, config checks,
                  and feature toggles that could be proper feature flags.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
                <SparklesIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--signal-fg-primary)]">
                  2. Generate
                </h4>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5 leading-relaxed">
                  Select feature candidates and generate a proper feature flag
                  specification with suggested variants and rollout rules.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
                <CodeIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--signal-fg-primary)]">
                  3. Implement
                </h4>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5 leading-relaxed">
                  Auto-generate the implementation code and create a pull
                  request to wrap the conditional in a proper feature flag SDK
                  call.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-4 flex items-center gap-3">
          <AlertIcon className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Failed to load feature candidates
            </p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="default" onClick={fetchReferences}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      {!error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--signal-fg-secondary)]">
            <FilterIcon className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                updateFilters({ status: v });
              }}
              options={STATUS_OPTIONS}
              size="sm"
              className="w-[150px]"
            />
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                updateFilters({ type: v });
              }}
              options={TYPE_OPTIONS}
              size="sm"
              className="w-[160px]"
            />
            <Select
              value={repoFilter}
              onValueChange={(v) => {
                setRepoFilter(v);
                updateFilters({ repository: v });
              }}
              options={repoOptions}
              size="sm"
              className="w-[200px]"
            />
          </div>
          <div className="text-xs text-[var(--signal-fg-tertiary)] sm:ml-auto">
            {total} feature candidate{total !== 1 ? "s" : ""} found
          </div>
        </div>
      )}

      {/* Empty state */}
      {!error && !loading && references.length === 0 && (
        <div className="py-12">
          <EmptyState
            icon={SearchIcon}
            emoji="🔍"
            title="No feature candidates discovered yet"
            description="Connect a repository and run your first survey to find conditionals, config checks, and toggles in your codebase that should be feature flags."
          >
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm">
                <RefreshIcon className="h-4 w-4" />
                Survey Now
              </Button>
              <Link
                href={`/projects/${currentProjectId}/janitor`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
              >
                Connect Repository
                <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </EmptyState>
        </div>
      )}

      {/* Results table */}
      {!error && references.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--signal-border-default)]">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider"
                >
                  Repository
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider"
                >
                  File
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-center text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-16"
                >
                  Line
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-24"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-center text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-24"
                >
                  Confidence
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-28"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-20"
                >
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--signal-border-default)]">
              {references.map((ref) => (
                <tr
                  key={ref.id}
                  className="transition-colors hover:bg-[var(--signal-bg-secondary)] group"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <GitBranchIcon className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                      <span className="text-[var(--signal-fg-primary)] font-medium text-xs">
                        {ref.repository}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="text-xs text-[var(--signal-fg-primary)] truncate font-mono">
                      {ref.file_path}
                    </p>
                    <p className="text-[10px] text-[var(--signal-fg-tertiary)] truncate mt-0.5">
                      {ref.conditional_text}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded bg-[var(--signal-bg-secondary)] px-1.5 py-0.5 text-xs font-mono text-[var(--signal-fg-secondary)]">
                      {ref.line_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="default">
                      {conditionalTypeLabel(ref.conditional_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        confidenceBg(ref.confidence),
                        confidenceColor(ref.confidence),
                      )}
                    >
                      {(ref.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={statusBadgeVariant(ref.status) as never}>
                      {ref.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${currentProjectId}/discover/scans/${ref.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--signal-fg-secondary)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--signal-bg-accent-muted)] hover:text-[var(--signal-fg-accent)]"
                      aria-label={`View details for ${ref.file_path}:${ref.line_number}`}
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && <Pagination total={total} />}

      {/* Info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <CodeIcon className="h-5 w-5 text-[var(--signal-fg-accent)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[var(--signal-fg-primary)] mb-1">
                About Code2Flag
              </h4>
              <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                Code2Flag surveys your codebase to find conditionals, config
                checks, and hardcoded toggles that should be proper feature
                flags. It generates flag specifications, implementation code,
                and sweep candidates — all within your existing workflow.
                Supports JavaScript, TypeScript, Go, Python, Java, and Ruby.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <DocsLink href="/docs/code2flag/overview" label="Overview →" />
                <DocsLink href="/docs/code2flag/workflow" label="Workflow →" />
                <DocsLink href="/docs/code2flag/sweep" label="Sweep Guide →" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page (Exported) ─────────────────────────────────────────────────────

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverInner />
    </Suspense>
  );
}
