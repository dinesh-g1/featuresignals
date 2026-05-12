"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";
import type {
  Agent,
  AgentMaturity,
  AgentMaturitiesResponse,
} from "@/lib/agent-types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorDisplay } from "@/components/ui/error-display";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  ArrowLeft,
  Trash2,
  Bot,
  Zap,
  Brain,
  Activity,
  Calendar,
  Hash,
  Tag,
  Gauge,
  Clock,
  DollarSign,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

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

// ─── Brain Type Display ────────────────────────────────────────────────────

function brainTypeLabel(bt: string): string {
  const labels: Record<string, string> = {
    llm: "LLM",
    rule: "Rule Engine",
    "neuro-symbolic": "Neuro-Symbolic",
    hybrid: "Hybrid",
    custom: "Custom",
  };
  return labels[bt] ?? bt;
}

// ─── Maturity Level Label ──────────────────────────────────────────────────

function maturityLabel(level: number): string {
  const labels: Record<number, string> = {
    1: "L1 — Shadow",
    2: "L2 — Assist",
    3: "L3 — Supervised",
    4: "L4 — Autonomous",
    5: "L5 — Sentinel",
  };
  return labels[level] ?? `L${level}`;
}

function maturityColor(level: number): string {
  const colors: Record<number, string> = {
    1: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    2: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    3: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    4: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    5: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  };
  return colors[level] ?? colors[1];
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const params = useParams<{ projectId: string; agentId: string }>();
  const router = useRouter();
  const agentId = params.agentId;
  const projectId = params.projectId;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [maturities, setMaturities] = useState<AgentMaturity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [agentData, matData] = await Promise.all([
        apiGet<Agent>(`/v1/agents/${agentId}`),
        apiGet<AgentMaturitiesResponse>(`/v1/agents/${agentId}/maturity`),
      ]);
      setAgent(agentData);
      setMaturities(matData.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load agent details",
      );
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDelete(`/v1/agents/${agentId}`);
      router.push(`/projects/${projectId}/agents`);
    } catch {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────

  if (!agent && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-secondary)] ring-1 ring-[var(--signal-border-default)]">
          <Bot className="h-7 w-7 text-[var(--signal-fg-tertiary)]" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
          Agent Not Found
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
          This agent may have been deleted or moved.
        </p>
        <Link href={`/projects/${projectId}/agents`} className="mt-4">
          <Button variant="default">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agent Registry
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────

  if (error && !agent) {
    return (
      <ErrorDisplay
        title="Could Not Load Agent"
        message={error}
        fullPage
        onRetry={fetchAgent}
      />
    );
  }

  if (!agent) return null;

  const maturity = maturities.length > 0 ? maturities[0] : agent.maturity;

  // ─── Detail View ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/agents`}>
          <Button variant="ghost" size="icon" aria-label="Back to agents">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)] truncate">
            {agent.name}
          </h1>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            ID: <code className="text-xs">{agent.id}</code>
          </p>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      {/* Main grid: info + maturity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: core info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
              <CardDescription>
                Core properties and configuration for this agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {/* Type */}
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                    <Tag className="h-3 w-3" />
                    Type
                  </dt>
                  <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                    <Badge variant="default">{agent.type}</Badge>
                  </dd>
                </div>

                {/* Version */}
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                    <Hash className="h-3 w-3" />
                    Version
                  </dt>
                  <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                    v{agent.version}
                  </dd>
                </div>

                {/* Brain Type */}
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                    <Brain className="h-3 w-3" />
                    Brain Type
                  </dt>
                  <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                    {brainTypeLabel(agent.brain_type)}
                  </dd>
                </div>

                {/* Registered */}
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                    <Calendar className="h-3 w-3" />
                    Registered
                  </dt>
                  <dd className="text-sm font-medium text-[var(--signal-fg-primary)]">
                    {agent.registered_at
                      ? formatDateTime(agent.registered_at)
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Rate Limits + Cost Profile */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="h-4 w-4" />
                  Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Per Minute
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.rate_limits?.per_minute ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Per Hour
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.rate_limits?.per_hour ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Concurrent
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.rate_limits?.concurrent_actions ?? "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Cost Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Cost Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Tokens / Action
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.cost_profile?.llm_tokens_per_action?.toLocaleString() ??
                        "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Avg Latency
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.cost_profile?.avg_latency_ms != null
                        ? `${agent.cost_profile.avg_latency_ms}ms`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      Cost / Action
                    </dt>
                    <dd className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {agent.cost_profile?.cost_per_action_micros != null
                        ? `$${(agent.cost_profile.cost_per_action_micros / 1_000_000).toFixed(6)}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Scopes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Scopes
              </CardTitle>
              <CardDescription>
                Tools and resources this agent is authorized to access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agent.scopes && agent.scopes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {agent.scopes.map((scope) => (
                    <Badge key={scope} variant="default">
                      {scope}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--signal-fg-tertiary)]">
                  No scopes configured.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: heartbeat + maturity */}
        <div className="space-y-6">
          {/* Heartbeat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Heartbeat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {agent.last_heartbeat ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Agent is Active
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-400" />
                    </span>
                    <span className="text-sm font-medium text-[var(--signal-fg-tertiary)]">
                      No heartbeat received
                    </span>
                  </div>
                )}
              </div>

              {agent.last_heartbeat && (
                <div className="flex items-center gap-2 text-sm text-[var(--signal-fg-secondary)]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last heartbeat:</span>
                  <RelativeTime date={agent.last_heartbeat} />
                </div>
              )}

              <div className="text-xs text-[var(--signal-fg-tertiary)]">
                {agent.last_heartbeat
                  ? formatDateTime(agent.last_heartbeat)
                  : "No heartbeat data"}
              </div>
            </CardContent>
          </Card>

          {/* Maturity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Maturity
              </CardTitle>
              <CardDescription>
                Capability progression tracking per operational context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Global Level */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                    Global Level
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${maturityColor(
                      maturity?.current_level ?? 1,
                    )}`}
                  >
                    {maturityLabel(maturity?.current_level ?? 1)}
                  </span>
                </div>
              </div>

              {/* Maturity Progress Bar */}
              {maturity && maturity.current_level < 5 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--signal-fg-tertiary)]">
                    <span>{maturityLabel(maturity.current_level)}</span>
                    <span>{maturityLabel(maturity.current_level + 1)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--signal-bg-secondary)]">
                    <div
                      className="h-full rounded-full bg-[var(--signal-fg-accent)] transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          maturity.stats?.accuracy
                            ? maturity.stats.accuracy * 100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              {maturity?.stats && (
                <div className="space-y-2 pt-2 border-t border-[var(--signal-border-default)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--signal-fg-secondary)]">
                      Accuracy
                    </span>
                    <span className="font-semibold text-[var(--signal-fg-primary)]">
                      {maturity.stats.accuracy != null
                        ? `${(maturity.stats.accuracy * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--signal-fg-secondary)]">
                      Decisions
                    </span>
                    <span className="font-semibold text-[var(--signal-fg-primary)]">
                      {maturity.stats.total_decisions?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--signal-fg-secondary)]">
                      Incidents Caused
                    </span>
                    <span
                      className={`font-semibold ${
                        (maturity.stats.incidents_caused ?? 0) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {maturity.stats.incidents_caused ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--signal-fg-secondary)]">
                      Human Override Rate
                    </span>
                    <span className="font-semibold text-[var(--signal-fg-primary)]">
                      {maturity.stats.human_override_rate != null
                        ? `${(maturity.stats.human_override_rate * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--signal-fg-secondary)]">
                      Days Since Incident
                    </span>
                    <span className="font-semibold text-[var(--signal-fg-primary)]">
                      {maturity.stats.days_since_last_incident ?? "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Per-Context Maturity */}
              {maturity?.per_context &&
                Object.keys(maturity.per_context).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--signal-border-default)]">
                    <span className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                      Per Context
                    </span>
                    {Object.entries(maturity.per_context).map(
                      ([contextKey, level]) => (
                        <div
                          key={contextKey}
                          className="flex items-center justify-between"
                        >
                          <code className="text-xs text-[var(--signal-fg-secondary)] truncate max-w-[160px]">
                            {contextKey}
                          </code>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${maturityColor(level)}`}
                          >
                            L{level}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently remove this agent from the registry. This action cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Agent
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agent.name}"? This will permanently remove the agent and all associated data including maturity records and heartbeat history.`}
        confirmLabel="Delete Agent"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
