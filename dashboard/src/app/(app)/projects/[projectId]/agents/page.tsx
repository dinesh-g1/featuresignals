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
import { apiGet, apiDelete, apiPost } from "@/lib/api";
import type { Agent, AgentListResponse } from "@/lib/agent-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorDisplay } from "@/components/ui/error-display";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Bot,
  Zap,
  Shield,
  Clock,
  Activity,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";

// ─── Status Badge ──────────────────────────────────────────────────────────

function AgentStatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { label: string; variant: "success" | "warning" | "default" }
  > = {
    active: { label: "Active", variant: "success" },
    degraded: { label: "Degraded", variant: "warning" },
    offline: { label: "Offline", variant: "default" },
  };
  const v = variants[status] ?? {
    label: status,
    variant: "default" as const,
  };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

// ─── Brain Type Badge ─────────────────────────────────────────────────────

function BrainTypeBadge({ brainType }: { brainType: string }) {
  const display: Record<string, string> = {
    llm: "LLM",
    rule: "Rules",
    "neuro-symbolic": "Neuro-Symbolic",
    hybrid: "Hybrid",
    custom: "Custom",
  };
  return <Badge variant="info">{display[brainType] ?? brainType}</Badge>;
}

// ─── Maturity Badge ───────────────────────────────────────────────────────

function MaturityBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    1: "default",
    2: "info",
    3: "success",
    4: "purple",
    5: "warning",
  };
  return (
    <Badge variant={(colors[level] ?? "default") as "info"}>L{level}</Badge>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null,
  );
  const [isForbidden, setIsForbidden] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", type: "janitor" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [total, setTotal] = useState(0);

  const handleCreate = async () => {
    if (!newAgent.name.trim()) return;
    setCreateError(null);
    try {
      await apiPost("/v1/agents", {
        name: newAgent.name.trim(),
        type: newAgent.type,
      });
      setShowCreate(false);
      setNewAgent({ name: "", type: "janitor" });
      refresh();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create agent",
      );
    }
  };

  // Create modal — declared early so both empty and success states can use it
  const createModal = showCreate ? (
    <Dialog open={showCreate} onOpenChange={setShowCreate}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Agent</DialogTitle>
          <DialogDescription>
            Register a new AI agent in the Agent Behavior Mesh.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--signal-fg-primary)]">
                Name
              </label>
              <input
                type="text"
                value={newAgent.name}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, name: e.target.value })
                }
                placeholder="e.g. Flag Janitor v2"
                className="mt-1 w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--signal-fg-primary)]">
                Type
              </label>
              <select
                value={newAgent.type}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, type: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm"
              >
                <option value="janitor">Janitor</option>
                <option value="preflight">Preflight</option>
                <option value="incident-responder">Incident Responder</option>
                <option value="onboarding">Onboarding</option>
                <option value="support">Support</option>
                <option value="security">Security</option>
              </select>
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!newAgent.name.trim()}
          >
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const fetchAgents = useCallback(async (lim: number, off: number) => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    setRateLimitRetryAfter(null);
    try {
      const data = await apiGet<AgentListResponse>(
        `/v1/agents?limit=${lim}&offset=${off}`,
      );
      setAgents(data.data ?? []);
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
        setError("Failed to load agents");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark data as stale after 60 seconds
  useEffect(() => {
    if (agents.length === 0) return;
    const timer = setTimeout(() => setIsStale(true), 60_000);
    return () => clearTimeout(timer);
  }, [agents]);

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/v1/agents/${deleteTarget.id}`);
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    } catch {
      // silently handled
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
  // total comes from server state (set in fetchAgents)

  // Wrapper for refresh buttons so they use current pagination params
  const refresh = useCallback(
    () => fetchAgents(limitRef.current, offsetRef.current),
    [fetchAgents],
  );

  // Re-fetch when pagination params change
  useEffect(() => {
    fetchAgents(limit, offsetVal);
  }, [fetchAgents, limit, offsetVal]);

  // ─── SSE / Offline Banner ────────────────────────────────────────────

  const OfflineBanner = isOffline ? (
    <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] px-4 py-2 text-sm text-[var(--signal-fg-warning)]">
      <WifiOff className="h-4 w-4" />
      <span>Disconnected. Data may be outdated.</span>
      <Button variant="ghost" size="xs" onClick={refresh} className="ml-auto">
        Reconnect
      </Button>
    </div>
  ) : null;

  // ─── Stale Data Banner ───────────────────────────────────────────────

  const StaleBanner =
    isStale && !isOffline ? (
      <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-4 py-2 text-sm text-[var(--signal-fg-accent)]">
        <Clock className="h-4 w-4" />
        <span>Data may be stale.</span>
        <Button variant="ghost" size="xs" onClick={refresh} className="ml-auto">
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>
    ) : null;

  // ─── Loading Skeleton (for Suspense fallback) ──────────────────────

  const agentListSkeleton = (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      {createModal}
    </div>
  );

  // ─── Loading State ───────────────────────────────────────────────────

  if (isLoading) {
    return agentListSkeleton;
  }

  // ─── Forbidden State ─────────────────────────────────────────────────

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
          You don&apos;t have permission to view the agent registry. Contact
          your administrator if you need access.
        </p>
      </div>
    );
  }

  // ─── Rate-Limited State ──────────────────────────────────────────────

  if (rateLimitRetryAfter !== null && agents.length === 0) {
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
          onClick={refresh}
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

  // ─── Error State ─────────────────────────────────────────────────────

  if (error && agents.length === 0) {
    return (
      <ErrorDisplay
        title="Could Not Load Agents"
        message={error}
        fullPage
        onRetry={refresh}
      />
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────

  if (agents.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              Agent Registry
            </h1>
            <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
              Registered AI agents managed by the Agent Behavior Mesh.
            </p>
          </div>
        </div>
        <EmptyState
          icon={Bot}
          title="No agents registered"
          description="Register your first AI agent to start tracking its activity, maturity, and performance across the platform."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          }
          docsUrl="/docs/agent-registry"
          docsLabel="Agent Registry docs"
        />
      </div>
    );
  }

  // ─── Success State ───────────────────────────────────────────────────

  return (
    <Suspense fallback={agentListSkeleton}>
      <div className="space-y-6 p-6">
        {OfflineBanner}
        {StaleBanner}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              Agent Registry
            </h1>
            <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} ·{" "}
              {agents.filter((a) => a.status === "active").length} Active ·{" "}
              {agents.filter((a) => a.status === "degraded").length} Degraded ·{" "}
              {agents.filter((a) => a.status === "offline").length} Offline
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={refresh}
                aria-label="Refresh agent list"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="relative transition-shadow hover:shadow-[var(--signal-shadow-md)]"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/projects/${projectId}/agents/${agent.id}`}
                    className="hover:underline"
                  >
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
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
                          href={`/projects/${projectId}/agents/${agent.id}`}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-signal-danger"
                        onClick={() => setDeleteTarget(agent)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status + Type badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <AgentStatusBadge status={agent.status} />
                  <Badge variant="default">{agent.type}</Badge>
                  <BrainTypeBadge brainType={agent.brain_type} />
                </div>

                {/* Version + Maturity */}
                <div className="flex items-center gap-2 text-sm text-[var(--signal-fg-secondary)]">
                  <MaturityBadge level={agent.maturity?.current_level ?? 1} />
                  <span>v{agent.version}</span>
                </div>

                {/* Scopes count */}
                <div className="flex items-center gap-1 text-xs text-[var(--signal-fg-tertiary)]">
                  <Zap className="h-3 w-3" />
                  <span>
                    {agent.scopes?.length ?? 0} scope
                    {(agent.scopes?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Heartbeat */}
                <div className="flex items-center gap-2 text-xs text-[var(--signal-fg-tertiary)]">
                  {agent.last_heartbeat ? (
                    <>
                      <Activity className="h-3 w-3" />
                      <RelativeTime date={agent.last_heartbeat} />
                    </>
                  ) : (
                    <>
                      <Activity className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
                      <span>No heartbeat</span>
                    </>
                  )}
                </div>

                {/* Registered date */}
                <div className="text-xs text-[var(--signal-fg-tertiary)]">
                  Registered <RelativeTime date={agent.registered_at} />
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
          title="Remove Agent"
          description={
            deleteTarget
              ? `Are you sure you want to remove "${deleteTarget.name}"? This action cannot be undone and the agent will lose access to all behaviors.`
              : ""
          }
          confirmLabel="Remove"
          variant="danger"
          loading={isDeleting}
        />
      </div>
    </Suspense>
  );
}
