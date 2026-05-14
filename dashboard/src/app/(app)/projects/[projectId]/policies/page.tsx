"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { PolicyForm } from "@/components/policies/policy-form";
import type {
  Policy,
  PolicyListResponse,
  PolicyEffect,
  TogglePolicyResponse,
} from "@/lib/policy-types";
import {
  POLICY_EFFECT_LABELS,
  POLICY_EFFECT_VARIANTS,
} from "@/lib/policy-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorDisplay } from "@/components/ui/error-display";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import {
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Shield,
  Clock,
  Gavel,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Effect Badge ──────────────────────────────────────────────────────────

function EffectBadge({ effect }: { effect: PolicyEffect }) {
  const variant = POLICY_EFFECT_VARIANTS[effect] ?? "default";
  const label = POLICY_EFFECT_LABELS[effect] ?? effect;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <Badge variant="success">LIVE</Badge>;
  }
  return <Badge variant="warning">PAUSED</Badge>;
}

// ─── Priority Badge ────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: number }) {
  if (priority <= 1) {
    return <Badge variant="danger">Critical</Badge>;
  }
  if (priority <= 5) {
    return <Badge variant="warning">High</Badge>;
  }
  if (priority <= 10) {
    return <Badge variant="info">Medium</Badge>;
  }
  return <Badge variant="default">Low</Badge>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null,
  );
  const [isForbidden, setIsForbidden] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    setRateLimitRetryAfter(null);
    try {
      const data = await apiGet<PolicyListResponse>(
        `/v1/policies?limit=${limitRef.current}&offset=${offsetRef.current}`,
      );
      setPolicies(data.data ?? []);
      setTotal(data.total ?? 0);
      setIsStale(false);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("429") || msg.includes("Too many requests")) {
          setRateLimitRetryAfter(60);
        } else if (msg.includes("403") || msg.includes("permission")) {
          setIsForbidden(true);
        } else if (
          msg.includes("offline") ||
          msg.includes("network") ||
          msg.includes("fetch")
        ) {
          setIsOffline(true);
        }
        setError(msg);
      } else {
        setError("Failed to load governance policies");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark data as stale after 60 seconds
  useEffect(() => {
    if (policies.length === 0) return;
    const timer = setTimeout(() => setIsStale(true), 60_000);
    return () => clearTimeout(timer);
  }, [policies]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitRetryAfter === null || rateLimitRetryAfter <= 0) return;
    const timer = setInterval(() => {
      setRateLimitRetryAfter((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitRetryAfter]);

  const handleToggle = async (policy: Policy) => {
    try {
      const result = await apiPost<TogglePolicyResponse>(
        `/v1/policies/${policy.id}/toggle`,
        { enabled: !policy.enabled },
      );
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policy.id ? { ...p, enabled: result.active } : p,
        ),
      );
    } catch {
      // silently handled — toggle fails gracefully
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/v1/policies/${deleteTarget.id}`);
      setPolicies((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch {
      // silently handled
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Create Policy Modal ────────────────────────────────────────────

  const createModal = showCreate ? (
    <PolicyForm
      open={showCreate}
      onClose={() => setShowCreate(false)}
      onCreated={() => {
        setShowCreate(false);
        fetchPolicies();
      }}
    />
  ) : null;

  // ─── Pagination (MUST come before any conditional returns) ───────

  const searchParams = useSearchParams();
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");
  const limitRef = useRef(limit);
  const offsetRef = useRef(offsetVal);
  limitRef.current = limit;
  offsetRef.current = offsetVal;
  // total comes from server state (set in fetchPolicies)

  // Re-fetch when pagination params change
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies, limit, offsetVal]);

  // ─── Offline Banner ────────────────────────────────────────────────────

  const OfflineBanner = isOffline ? (
    <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] px-4 py-2 text-sm text-[var(--signal-fg-warning)]">
      <WifiOff className="h-4 w-4" />
      <span>Disconnected. Data may be outdated.</span>
      <Button
        variant="ghost"
        size="xs"
        onClick={fetchPolicies}
        className="ml-auto"
      >
        Reconnect
      </Button>
    </div>
  ) : null;

  // ─── Stale Data Banner ─────────────────────────────────────────────────

  const StaleBanner =
    isStale && !isOffline ? (
      <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-4 py-2 text-sm text-[var(--signal-fg-accent)]">
        <Clock className="h-4 w-4" />
        <span>Data may be stale.</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={fetchPolicies}
          className="ml-auto"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>
    ) : null;

  // ─── Loading Skeleton (for Suspense fallback) ──────────────────────

  const policiesSkeleton = (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="rounded-xl border border-[var(--signal-border-default)]/80 bg-white shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
              {["Name", "Description", "Effect", "Priority", "Status", ""].map(
                (h) => (
                  <th key={h} className="p-4 text-left">
                    <Skeleton className="h-3 w-20" />
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr
                key={i}
                className="border-b border-[var(--signal-border-subtle)]"
              >
                <td className="p-4">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-56" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-12 rounded-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-8 w-8 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Loading State ─────────────────────────────────────────────────────

  if (isLoading) {
    return policiesSkeleton;
  }

  // ─── Forbidden State ───────────────────────────────────────────────────

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)]">
          <Shield className="h-7 w-7 text-[var(--signal-fg-warning)]" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
          Access Denied
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
          You don&apos;t have permission to view governance policies. Contact
          your administrator if you need access.
        </p>
      </div>
    );
  }

  // ─── Rate-Limited State ────────────────────────────────────────────────

  if (rateLimitRetryAfter !== null && policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)]">
          <AlertTriangle className="h-7 w-7 text-[var(--signal-fg-warning)]" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
          Too Many Requests
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
          Please wait {rateLimitRetryAfter} seconds before trying again.
        </p>
        <Button
          onClick={fetchPolicies}
          variant="secondary"
          className="mt-4"
          disabled={rateLimitRetryAfter > 0}
        >
          {rateLimitRetryAfter > 0
            ? `Retry in ${rateLimitRetryAfter}s`
            : "Retry Now"}
        </Button>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────

  if (error && policies.length === 0) {
    return (
      <ErrorDisplay
        title="Could Not Load Policies"
        message={error}
        fullPage
        onRetry={fetchPolicies}
      />
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────

  if (total === 0) {
    return (
      <>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
                Governance Policies
              </h1>
              <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
                Define rules that govern how agents and features are managed
                across your organization.
              </p>
            </div>
          </div>
          <EmptyState
            icon={Gavel}
            title="No governance policies configured"
            description="Create your first policy to enforce governance rules for feature changes. Policies control what agents can do, when, and under what conditions."
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Policy
              </Button>
            }
            docsUrl="/docs/governance-policies"
            docsLabel="Governance docs"
          />
        </div>
        {createModal}
      </>
    );
  }

  // ─── Success State ─────────────────────────────────────────────────────

  const liveCount = policies.filter((p) => p.enabled).length;
  const pausedCount = policies.length - liveCount;

  return (
    <Suspense fallback={policiesSkeleton}>
      <div className="space-y-6 p-6">
        {OfflineBanner}
        {StaleBanner}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              Governance Policies
            </h1>
            <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
              {policies.length} polic{policies.length !== 1 ? "ies" : "y"} ·{" "}
              {liveCount} LIVE · {pausedCount} PAUSED
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={fetchPolicies}
                aria-label="Refresh policies"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </div>
        </div>

        {/* Policies Table */}
        <div className="rounded-xl border border-[var(--signal-border-default)]/80 bg-white shadow-soft overflow-hidden dark:bg-[var(--signal-bg-primary)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
                <th className="p-4 text-left text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                  Name
                </th>
                <th className="hidden p-4 text-left text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide md:table-cell">
                  Description
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                  Effect
                </th>
                <th className="hidden p-4 text-left text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide sm:table-cell">
                  Priority
                </th>
                <th className="p-4 text-left text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                  Status
                </th>
                <th className="w-12 p-4" />
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.id}
                  className="border-b border-[var(--signal-border-subtle)] transition-colors hover:bg-[var(--signal-bg-secondary)]/50"
                >
                  <td className="p-4">
                    <Link
                      href={`/projects/${projectId}/policies/${policy.id}`}
                      className="font-medium text-[var(--signal-fg-primary)] hover:text-[var(--signal-fg-accent)] hover:underline transition-colors"
                    >
                      {policy.name}
                    </Link>
                  </td>
                  <td className="hidden p-4 text-[var(--signal-fg-secondary)] md:table-cell max-w-xs truncate">
                    {policy.description || "—"}
                  </td>
                  <td className="p-4">
                    <EffectBadge effect={policy.effect} />
                  </td>
                  <td className="hidden p-4 sm:table-cell">
                    <PriorityBadge priority={policy.priority} />
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggle(policy)}
                      className="cursor-pointer"
                      aria-label={
                        policy.enabled
                          ? "Policy LIVE — click to pause"
                          : "Policy PAUSED — click to activate"
                      }
                    >
                      <StatusBadge enabled={policy.enabled} />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/projects/${projectId}/policies/${policy.id}`}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-signal-danger"
                          onClick={() => setDeleteTarget(policy)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Policy
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Policy"
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
              : ""
          }
          confirmLabel="Delete"
          variant="danger"
          loading={isDeleting}
        />
        {createModal}
      </div>
    </Suspense>
  );
}
