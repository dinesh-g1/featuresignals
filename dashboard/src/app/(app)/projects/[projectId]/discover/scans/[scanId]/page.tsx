"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Code2FlagReference } from "@/lib/api";
import {
  SearchIcon,
  SparklesIcon,
  AlertIcon,
  ArrowLeftIcon,
  GitBranchIcon,
  CheckCircleFillIcon,
} from "@/components/icons/nav-icons";

// ─── Helpers ────────────────────────────────────────────────────────────

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

function ScanDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-6 w-32 animate-pulse rounded bg-[var(--signal-border-default)]" />
      <div className="h-8 w-64 animate-pulse rounded bg-[var(--signal-border-default)]" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-[var(--signal-border-default)]"
          />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-[var(--signal-border-default)]"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.scanId as string;
  const projectId = params.projectId as string;
  const token = useAppStore((s) => s.token);

  const [references, setReferences] = useState<Code2FlagReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Fetch references for this scan (filtered by id as a proxy for scan)
  const fetchScanResults = useCallback(async () => {
    if (!token || !projectId || !scanId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.code2flag.listReferences(token, projectId, {
        limit: 200,
      });
      // Filter references that might be associated with this scan
      // Since we don't have a scan-specific endpoint, we show all references
      // In production, this would filter by scanId
      setReferences(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load survey results",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId, scanId]);

  useEffect(() => {
    fetchScanResults();
  }, [fetchScanResults]);

  // Toggle reference selection
  const toggleRef = useCallback((id: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Generate feature flag from selected references
  const handleGenerateFlag = useCallback(async () => {
    if (selectedRefs.size === 0 || !token || !projectId) return;
    setGenerating(true);
    try {
      const selectedRefArray = Array.from(selectedRefs);
      const firstRef = references.find((r) => r.id === selectedRefArray[0]);
      const repoName = firstRef?.repository || "";

      // Derive flag key from file path
      const flagKey = firstRef
        ? firstRef.file_path
            .replace(/^src\//, "")
            .replace(/\.[^.]+$/, "")
            .replace(/[^a-zA-Z0-9]/g, "-")
            .toLowerCase()
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        : "new-feature";

      const result = await api.code2flag.createSpec(token, projectId, {
        flag_key: flagKey,
        repo_name: repoName,
        references: selectedRefArray,
      });

      // Navigate to generated flag page
      router.push(`/projects/${projectId}/discover/flags/${result.flag_key}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate feature flag specification",
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedRefs, token, projectId, references, router]);

  // Stats
  const stats = useMemo(() => {
    const total = references.length;
    const accepted = references.filter((r) => r.status === "accepted").length;
    const unreviewed = references.filter(
      (r) => r.status === "unreviewed",
    ).length;
    const highConfidence = references.filter((r) => r.confidence >= 0.9).length;
    return { total, accepted, unreviewed, highConfidence };
  }, [references]);

  if (loading) return <ScanDetailSkeleton />;

  if (error && references.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link
          href={`/projects/${projectId}/discover`}
          className="inline-flex items-center gap-1 text-sm text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Discover
        </Link>

        <div className="rounded-xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 flex flex-col items-center gap-3 text-center">
          <AlertIcon className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Survey not found
            </p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <Button size="sm" variant="default" onClick={fetchScanResults}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ScanDetailSkeleton />}>
      <div className="space-y-6 animate-fade-in">
        {/* Back link */}
        <Link
          href={`/projects/${projectId}/discover`}
          className="inline-flex items-center gap-1 text-sm text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Discover
        </Link>

        {/* Header */}
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <SearchIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
              <span>Survey Results</span>
            </div>
          }
          description={`Survey ID: ${scanId}`}
        >
          {selectedRefs.size > 0 && (
            <Button
              variant="default"
              onClick={handleGenerateFlag}
              loading={generating}
              disabled={generating}
            >
              <SparklesIcon className="h-4 w-4" />
              Generate Feature Flag ({selectedRefs.size})
            </Button>
          )}
        </PageHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                Total Results
              </p>
              <p className="text-2xl font-bold text-[var(--signal-fg-primary)] mt-1">
                {stats.total}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                Unreviewed
              </p>
              <p className="text-2xl font-bold text-[var(--signal-fg-warning)] mt-1">
                {stats.unreviewed}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                Accepted
              </p>
              <p className="text-2xl font-bold text-[var(--signal-fg-success)] mt-1">
                {stats.accepted}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                High Confidence
              </p>
              <p className="text-2xl font-bold text-[var(--signal-fg-accent)] mt-1">
                {stats.highConfidence}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results table */}
        {references.length === 0 ? (
          <EmptyState
            icon={CheckCircleFillIcon}
            emoji="📭"
            title="No results in this survey"
            description="This survey didn't find any feature candidates. Try running a new survey on a different repository."
          >
            <Link
              href={`/projects/${projectId}/discover`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              Back to Discover
            </Link>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--signal-border-default)]">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider w-10"
                  >
                    <span className="sr-only">Select</span>
                  </th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--signal-border-default)]">
                {references.map((ref) => {
                  const isSelected = selectedRefs.has(ref.id);
                  return (
                    <tr
                      key={ref.id}
                      className={cn(
                        "transition-colors hover:bg-[var(--signal-bg-secondary)] cursor-pointer",
                        isSelected && "bg-[var(--signal-bg-accent-muted)]",
                      )}
                      onClick={() => toggleRef(ref.id)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRef(ref.id)}
                          className="h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                          aria-label={`Select ${ref.file_path}:${ref.line_number}`}
                        />
                      </td>
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
                        <Badge
                          variant={statusBadgeVariant(ref.status) as never}
                        >
                          {ref.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Selection help */}
        {references.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <SparklesIcon className="h-5 w-5 text-[var(--signal-fg-accent)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[var(--signal-fg-primary)] mb-1">
                    Ready to create a feature flag?
                  </h4>
                  <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                    Select one or more feature candidates above and click
                    &quot;Generate Feature Flag&quot;. Code2Flag will create a
                    proper flag specification with suggested variants and
                    rollout rules based on how the conditional is used in your
                    codebase.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Suspense>
  );
}
