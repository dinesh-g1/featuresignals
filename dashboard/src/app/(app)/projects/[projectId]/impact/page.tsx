"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import {
  Badge,
  EmptyState,
  Skeleton,
  ErrorDisplay,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn, timeAgo } from "@/lib/utils";
import {
  TrendingUpIcon,
  LightbulbIcon,
  SparklesIcon,
  AlertIcon,
  FlagIcon,
} from "@/components/icons/nav-icons";
import type {
  OrgLearningsResponse,
  ImpactReportResponse,
  Flag,
} from "@/lib/types";

// ─── Impact Badge ────────────────────────────────────────────────────────

function impactBadge(impact: string) {
  switch (impact) {
    case "positive":
      return "success" as const;
    case "negative":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

function impactLabel(impact: string): string {
  switch (impact) {
    case "positive":
      return "✅ Positive";
    case "negative":
      return "❌ Negative";
    default:
      return "— Neutral";
  }
}

// ─── Main Component ──────────────────────────────────────────────────────

function ImpactInner() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);

  const [learnings, setLearnings] = useState<OrgLearningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flag-level impact reports
  const [flags, setFlags] = useState<Flag[]>([]);
  const [reports, setReports] = useState<Map<string, ImpactReportResponse>>(
    new Map(),
  );
  const [reportsLoading, setReportsLoading] = useState(false);
  const [flagFilter, setFlagFilter] = useState("");

  const fetchLearnings = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.impact.getLearnings(token, projectId);
      setLearnings(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load impact data",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  // Load flags for the impact report list
  const fetchFlags = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      const flagsResult = await api.listFlags(token, projectId);
      setFlags(Array.isArray(flagsResult) ? flagsResult : []);
    } catch {
      // Non-critical: flags list is supplementary
    }
  }, [token, projectId]);

  // Load impact reports for visible flags
  const fetchReportsForFlags = useCallback(
    async (flagKeys: string[]) => {
      if (!token || flagKeys.length === 0) return;
      setReportsLoading(true);
      const newReports = new Map<string, ImpactReportResponse>();

      // Fetch reports sequentially to avoid rate limiting
      for (const key of flagKeys) {
        try {
          const report = await api.impact.getReport(
            token,
            key,
            projectId ?? undefined,
          );
          newReports.set(key, report);
        } catch {
          // Silently skip flags without reports
        }
      }

      setReports(newReports);
      setReportsLoading(false);
    },
    [token, projectId],
  );

  useEffect(() => {
    fetchLearnings();
    fetchFlags();
  }, [fetchLearnings, fetchFlags]);

  // When flags load, fetch their reports
  useEffect(() => {
    if (flags.length > 0) {
      const keys = flags.map((f) => f.key);
      fetchReportsForFlags(keys);
    }
  }, [flags, fetchReportsForFlags]);

  // ── Loading state ──────────────────────────────────────────────────
  if (loading && !learnings) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Impact Analyzer"
          description="Measure and learn from every feature change"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error && !learnings) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Impact Analyzer"
          description="Measure and learn from every feature change"
        />
        <ErrorDisplay
          title="Failed to load impact data"
          message={error}
          onRetry={fetchLearnings}
        />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!loading && !error && !learnings) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Impact Analyzer"
          description="Measure and learn from every feature change"
        />
        <EmptyState
          icon={TrendingUpIcon}
          title="No impact data yet"
          description="Impact Analyzer measures the business impact of your feature flags and provides organization-wide learning insights. Data will appear as flags are created and evaluated."
        />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────
  const l = learnings!;
  const statItems = [
    {
      label: "Flags Analyzed",
      value: l.total_flags_analyzed,
      icon: FlagIcon,
    },
    {
      label: "Cleanup Candidates",
      value: l.cleanup_candidates,
      icon: SparklesIcon,
      trend: l.cleanup_candidates > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Stale Flags",
      value: l.stale_flags,
      icon: AlertIcon,
      trend: l.stale_flags > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Avg Risk Score",
      value: l.avg_risk_score.toFixed(1),
      icon: TrendingUpIcon,
    },
    {
      label: "Flags Without Owners",
      value: l.flags_without_owners,
      icon: AlertIcon,
    },
    {
      label: "Avg Time to Full Rollout",
      value: `${l.avg_time_to_full_rollout_hours.toFixed(1)}h`,
      icon: TrendingUpIcon,
    },
  ];

  const filteredFlags = flagFilter
    ? flags.filter((f) =>
        f.key.toLowerCase().includes(flagFilter.toLowerCase()),
      )
    : flags;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Impact Analyzer"
        description="Measure and learn from every feature change"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statItems.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            trend={item.trend}
          />
        ))}
      </div>

      {/* Org Learnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LightbulbIcon className="h-4 w-4 text-[var(--signal-fg-warning)]" />
            Organization Learnings
          </CardTitle>
          <CardDescription>
            {l.top_insights.length === 0
              ? "No insights yet"
              : `${l.top_insights.length} top insight${l.top_insights.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {l.top_insights.length === 0 ? (
            <p className="text-sm text-[var(--signal-fg-tertiary)] py-4 text-center">
              No insights generated yet. Insights appear as flags accumulate
              evaluation data.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {l.top_insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 dark:bg-[var(--signal-bg-tertiary)]"
                >
                  <LightbulbIcon
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0",
                      insight.confidence >= 0.8
                        ? "text-[var(--signal-fg-success)]"
                        : insight.confidence >= 0.5
                          ? "text-[var(--signal-fg-warning)]"
                          : "text-[var(--signal-fg-info)]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--signal-fg-primary)]">
                      {insight.insight}
                    </p>
                    <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                      Confidence: {(insight.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag Impact Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlagIcon className="h-4 w-4 text-[var(--signal-fg-accent)]" />
            Flag Impact Reports
          </CardTitle>
          <CardDescription>
            Per-flag business impact, cost attribution, and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter input */}
          <div className="mb-4">
            <Input
              placeholder="Filter by flag key..."
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="max-w-sm"
              aria-label="Filter flags by key"
            />
          </div>

          {filteredFlags.length === 0 ? (
            <p className="text-sm text-[var(--signal-fg-tertiary)] py-4 text-center">
              {flagFilter
                ? "No flags match your filter."
                : "No flags found in this project."}
            </p>
          ) : reportsLoading && reports.size === 0 ? (
            <div className="space-y-2">
              {filteredFlags.slice(0, 5).map((f) => (
                <Skeleton key={f.key} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-xl border border-[var(--signal-border-default)]/70 bg-white shadow-sm overflow-hidden",
                "dark:bg-[var(--signal-bg-secondary)]",
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flag Key</TableHead>
                    <TableHead>Business Impact</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Recommendations
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlags.map((flag) => {
                    const report = reports.get(flag.key);
                    return (
                      <TableRow key={flag.key}>
                        <TableCell className="font-medium text-[var(--signal-fg-primary)]">
                          {flag.key}
                        </TableCell>
                        <TableCell>
                          {report ? (
                            <Badge
                              variant={impactBadge(report.business_impact)}
                            >
                              {impactLabel(report.business_impact)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--signal-fg-tertiary)]">
                              No data
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {report
                            ? `$${report.cost_attribution.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-[var(--signal-fg-secondary)] max-w-[300px] truncate">
                          {report && report.recommendations.length > 0
                            ? report.recommendations[0]
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!reportsLoading && reports.size > 0 && (
            <p className="text-xs text-[var(--signal-fg-tertiary)] mt-3">
              Showing {filteredFlags.length} flag
              {filteredFlags.length !== 1 ? "s" : ""}
              {flagFilter ? " (filtered)" : ""}
              &middot; Generated{" "}
              {l.generated_at ? timeAgo(l.generated_at) : "recently"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────────

export default function ImpactPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Impact Analyzer"
            description="Measure and learn from every feature change"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <ImpactInner />
    </Suspense>
  );
}
