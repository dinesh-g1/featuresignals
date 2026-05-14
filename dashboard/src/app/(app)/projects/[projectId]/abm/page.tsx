"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import type { ABMBehavior, ABMBehaviorsResponse } from "@/lib/abm-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  RefreshCw,
  Bot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageStates } from "@/hooks/use-page-states";

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    {
      label: string;
      variant: "success" | "default" | "warning" | "danger" | "info";
    }
  > = {
    active: { label: "LIVE", variant: "success" },
    draft: { label: "SCHEDULED", variant: "info" },
    paused: { label: "PAUSED", variant: "warning" },
    retired: { label: "RETIRED", variant: "default" },
  };
  const v = variants[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ABMPage() {
  const [behaviors, setBehaviors] = useState<ABMBehavior[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBehavior, setNewBehavior] = useState({
    key: "",
    name: "",
    agent_type: "janitor",
    description: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ABMBehavior | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const projectId = useParams().projectId as string;

  // Track whether create modal has dirty fields
  const isCreateDirty =
    newBehavior.key.trim() !== "" ||
    newBehavior.name.trim() !== "" ||
    newBehavior.description.trim() !== "";

  // C6: beforeunload guard when create modal is open with dirty fields
  useEffect(() => {
    if (!createOpen) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isCreateDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [createOpen, isCreateDirty]);

  // C6: warn before closing create modal if fields are dirty
  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isCreateDirty) {
      const ok = window.confirm(
        "You have unsaved changes. Close without saving?",
      );
      if (!ok) return;
      setNewBehavior({
        key: "",
        name: "",
        agent_type: "janitor",
        description: "",
      });
    }
    setCreateOpen(open);
  };

  const {
    isStale,
    OfflineBanner,
    StaleBanner,
    ForbiddenState,
    RateLimitedState,
    resetErrors,
    classifyError,
    markFresh,
  } = usePageStates({
    onRefresh: () => fetchBehaviors(),
    hasData: behaviors.length > 0,
    forbiddenTitle: "Access Denied",
    forbiddenDescription:
      "You don't have permission to view agent behaviors. Contact your administrator if you need access.",
  });

  const fetchBehaviors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    resetErrors();
    try {
      const data = await apiGet<ABMBehaviorsResponse>(
        `/v1/abm/behaviors?limit=${limitRef.current}&offset=${offsetRef.current}`,
      );
      setBehaviors(data.data ?? []);
      setTotal(data.total ?? 0);
      markFresh();
    } catch (err) {
      classifyError(err);
      setError(err instanceof Error ? err.message : "Failed to load behaviors");
    } finally {
      setIsLoading(false);
    }
  }, [resetErrors, classifyError, markFresh]);

  const handleCreate = async () => {
    if (!newBehavior.key.trim() || !newBehavior.name.trim()) return;
    setCreateError(null);
    try {
      await apiPost("/v1/abm/behaviors", {
        key: newBehavior.key.trim(),
        name: newBehavior.name.trim(),
        agent_type: newBehavior.agent_type,
        description: newBehavior.description.trim() || undefined,
        variants: [
          { key: "default", name: "Default", config: {}, weight: 100 },
        ],
        default_variant: "default",
      });
      setCreateOpen(false);
      setNewBehavior({
        key: "",
        name: "",
        agent_type: "janitor",
        description: "",
      });
      fetchBehaviors();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create behavior",
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/v1/abm/behaviors/${deleteTarget.key}`);
      setBehaviors((prev) => prev.filter((b) => b.key !== deleteTarget.key));
    } catch {
      // silent
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Pagination (MUST come before any conditional returns) ───────

  const searchParams = useSearchParams();
  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");
  const limitRef = useRef(limit);
  const offsetRef = useRef(offsetVal);
  limitRef.current = limit;
  offsetRef.current = offsetVal;
  // total comes from server state (set in fetchBehaviors)

  // Re-fetch when pagination params change
  useEffect(() => {
    fetchBehaviors();
  }, [fetchBehaviors, limit, offsetVal]);

  // ─── Create Behavior Modal ─────────────────────────────────────────

  const createModal = createOpen ? (
    <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Agent Behavior</DialogTitle>
          <DialogDescription>
            Define a new behavior that AI agents can use. Behaviors are like
            feature flags for AI agents.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Key</label>
              <input
                type="text"
                value={newBehavior.key}
                onChange={(e) =>
                  setNewBehavior({ ...newBehavior, key: e.target.value })
                }
                placeholder="e.g. checkout-recommendation"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={newBehavior.name}
                onChange={(e) =>
                  setNewBehavior({ ...newBehavior, name: e.target.value })
                }
                placeholder="e.g. Checkout Recommendation"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Agent Type</label>
              <select
                value={newBehavior.agent_type}
                onChange={(e) =>
                  setNewBehavior({ ...newBehavior, agent_type: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="janitor">Janitor</option>
                <option value="preflight">Preflight</option>
                <option value="incident-responder">Incident Responder</option>
                <option value="recommendation">Recommendation</option>
                <option value="search">Search</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={newBehavior.description}
                onChange={(e) =>
                  setNewBehavior({
                    ...newBehavior,
                    description: e.target.value,
                  })
                }
                placeholder="What this behavior controls..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => handleCreateOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!newBehavior.key.trim() || !newBehavior.name.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  // ─── Loading Skeleton (for Suspense fallback) ──────────────────────

  const abmListSkeleton = (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─── Loading State ───────────────────────────────────────────────────
  if (isLoading) {
    return abmListSkeleton;
  }

  // ─── Forbidden State ─────────────────────────────────────────────────
  if (ForbiddenState) return ForbiddenState;

  // ─── Rate-Limited State ──────────────────────────────────────────────
  if (RateLimitedState) return RateLimitedState;

  // ─── Error State ─────────────────────────────────────────────────────
  if (error && behaviors.length === 0) {
    return (
      <ErrorDisplay
        title="Could Not Load Behaviors"
        message={error}
        fullPage
        onRetry={fetchBehaviors}
      />
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
                Agent Behaviors
              </h1>
              <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
                Manage AI agent behaviors — the agent equivalent of feature
                flags.
              </p>
            </div>
          </div>
          <EmptyState
            icon={Bot}
            title="No behaviors configured"
            description="Create your first agent behavior to start managing AI agent features."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Behavior
              </Button>
            }
            docsUrl="/docs/abm"
            docsLabel="ABM docs"
          />
        </div>
        {createModal}
      </>
    );
  }

  // ─── Success State ───────────────────────────────────────────────────
  return (
    <Suspense fallback={abmListSkeleton}>
      <div className="space-y-6 p-6">
        {OfflineBanner}
        {StaleBanner}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              Agent Behaviors
            </h1>
            <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
              {behaviors.length} behavior{behaviors.length !== 1 ? "s" : ""} ·{" "}
              {behaviors.filter((b) => b.status === "active").length} LIVE ·{" "}
              {behaviors.filter((b) => b.status === "paused").length} PAUSED ·{" "}
              {behaviors.filter((b) => b.status === "draft").length} SCHEDULED
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={fetchBehaviors}
                aria-label="Refresh behaviors"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Behavior
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {behaviors.map((behavior) => (
            <Card key={behavior.key} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/projects/${projectId}/abm/${behavior.key}`}
                    className="hover:underline"
                  >
                    <CardTitle className="text-lg">{behavior.name}</CardTitle>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/projects/${projectId}/abm/${behavior.key}`}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-signal-danger"
                        onClick={() => setDeleteTarget(behavior)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Retire
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={behavior.status} />
                  {behavior.agent_type && (
                    <Badge variant="default">{behavior.agent_type}</Badge>
                  )}
                </div>
                {behavior.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {behavior.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Key: <code className="text-xs">{behavior.key}</code>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {behavior.variants?.length ?? 0} variant
                  {(behavior.variants?.length ?? 0) !== 1 ? "s" : ""}
                  {" · "}Rollout: {behavior.rollout_percentage}%
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {total > 0 && <Pagination total={total} />}
        {createModal}
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Retire Behavior"
          description={
            deleteTarget
              ? `Are you sure you want to retire "${deleteTarget.name}"? This action cannot be undone and will affect all agents using this behavior.`
              : ""
          }
          confirmLabel="Retire"
          variant="danger"
          loading={isDeleting}
        />
      </div>
    </Suspense>
  );
}
