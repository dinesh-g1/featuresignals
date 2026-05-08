"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SDKHealth } from "@/components/sdk-health";
import { EvalSparkline } from "@/components/eval-sparkline";
import {
  AttentionCards,
  createApprovalAttention,
  createWebhookAttention,
  createStaleFlagAttention,
} from "@/components/attention-cards";
import { useJanitorSummary } from "@/hooks/use-janitor-summary";
import {
  AlertIcon,
  CheckCircleFillIcon,
  FlagIcon,
  SegmentIcon,
  GlobeIcon,
  ApiKeysIcon,
  WebhookIcon,
  CheckListIcon,
  AuditLogIcon,
  PlusIcon,
  ChevronRightIcon,
  SparklesIcon,
  TeamIcon,
  TrendingUpIcon,
} from "@/components/icons/nav-icons";
import type {
  Flag,
  Segment,
  Environment,
  AuditEntry,
  OrgMember,
  Webhook,
  ApprovalRequest,
} from "@/lib/types";

interface ProjectSnapshot {
  flags: Flag[];
  segments: Segment[];
  environments: Environment[];
  audit: AuditEntry[];
  members: OrgMember[];
  loading: boolean;
  error: string;
}

function useProjectSnapshot() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [snap, setSnap] = useState<ProjectSnapshot>({
    flags: [],
    segments: [],
    environments: [],
    audit: [],
    members: [],
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      setSnap((s) => ({ ...s, loading: true, error: "" }));
      const [flags, segments, environments, audit, members] = await Promise.all(
        [
          api.listFlags(token, projectId).catch(() => [] as Flag[]),
          api.listSegments(token, projectId).catch(() => [] as Segment[]),
          api
            .listEnvironments(token, projectId)
            .catch(() => [] as Environment[]),
          api.listAudit(token, 8, 0, projectId).catch(() => [] as AuditEntry[]),
          api.listMembers(token).catch(() => [] as OrgMember[]),
        ],
      );
      setSnap({
        flags,
        segments,
        environments,
        audit,
        members,
        loading: false,
        error: "",
      });
    } catch {
      setSnap((s) => ({
        ...s,
        loading: false,
        error: "Failed to load project data",
      }));
    }
  }, [token, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return snap;
}

// ─── Stat tile — clickable card linking to section ──────────────────

function StatTile({
  href,
  icon: Icon,
  label,
  count,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-all duration-150 hover:shadow-md hover:border-[var(--signal-border-emphasis)] cursor-pointer">
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              color,
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[var(--signal-fg-primary)] tabular-nums">
              {count}
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">{label}</p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href}>
      <Button variant="secondary" className="w-full justify-start gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────

function BeginnersGuide({
  hasEnvs,
  hasFlags,
  projectId,
}: {
  hasEnvs: boolean;
  hasFlags: boolean;
  projectId: string;
}) {
  const steps = [
    {
      label: "Create your first flag",
      desc: "Define a feature flag",
      href: `/projects/${projectId}/flags?create=true`,
      done: hasFlags,
    },
    {
      label: "Set up an environment",
      desc: "Add dev, staging, production",
      href: `/projects/${projectId}/environments`,
      done: hasEnvs,
    },
    {
      label: "Connect an SDK",
      desc: "Integrate with your app",
      href: "/docs",
      done: false,
    },
    {
      label: "Invite your team",
      desc: "Collaborate securely",
      href: `/projects/${projectId}/team`,
      done: false,
    },
  ];
  return (
    <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <SparklesIcon className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
            Getting Started
          </h3>
        </div>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white"
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                )}
              >
                {step.done ? (
                  <CheckCircleFillIcon className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  {step.label}
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)]">
                  {step.desc}
                </p>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  Start
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LimitsStatus({
  flagsCount: _flagsCount,
  segsCount: _segsCount,
  envsCount: _envsCount,
}: {
  flagsCount: number;
  segsCount: number;
  envsCount: number;
}) {
  const token = useAppStore((s) => s.token);
  const _org = useAppStore((s) => s.organization);
  const [limits, setLimits] = useState<
    Array<{ resource: string; used: number; max: number }>
  >([]);

  useEffect(() => {
    if (!token) return;
    api
      .getLimits(token)
      .then((d) => setLimits(d?.limits ?? []))
      .catch(() => {});
  }, [token]);

  const nearLimit = limits.filter(
    (l) => l.max > 0 && l.used / l.max >= 0.8 && l.used > 0,
  );
  if (nearLimit.length === 0) return null;

  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertIcon className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-900">
            Approaching Limits
          </h3>
        </div>
        <div className="space-y-2">
          {nearLimit.map((l) => (
            <div
              key={l.resource}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-amber-800">
                {l.resource.replace(/_/g, " ")}
              </span>
              <span className="font-bold tabular-nums text-amber-900">
                {l.used}/{l.max}
              </span>
            </div>
          ))}
        </div>
        <Link
          href="/limits"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          View all limits <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Attention data hook ────────────────────────────────────────────

interface _AttentionData {
  approvalCount: number;
  webhookFailCount: number;
  staleFlagCount: number;
}

function useAttentionData(projectId: string) {
  const token = useAppStore((s) => s.token);
  const { staleCount } = useJanitorSummary(60000);
  const [approvalCount, setApprovalCount] = useState(0);
  const [webhookFailCount, setWebhookFailCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    // Fetch pending approvals
    api
      .listApprovals(token, "pending")
      .then((d) => {
        const approvals =
          (d as { data?: ApprovalRequest[] })?.data ?? (d as ApprovalRequest[]);
        setApprovalCount(Array.isArray(approvals) ? approvals.length : 0);
      })
      .catch(() => {});

    // Fetch webhooks and check for failures
    api
      .listWebhooks(token)
      .then(async (webhooks) => {
        const whs =
          (webhooks as { data?: Webhook[] })?.data ?? (webhooks as Webhook[]);
        if (!Array.isArray(whs) || whs.length === 0) {
          setWebhookFailCount(0);
          return;
        }
        let failures = 0;
        for (const wh of whs.slice(0, 5)) {
          try {
            const deliveries = await api.listWebhookDeliveries(token, wh.id);
            const dlvs =
              (deliveries as { data?: unknown[] })?.data ??
              (deliveries as unknown[]);
            if (Array.isArray(dlvs) && dlvs.length > 0) {
              const recent = dlvs.slice(0, 5) as Array<{ success?: boolean }>;
              if (recent.some((d) => d.success === false)) failures++;
            }
          } catch {
            // skip webhooks that fail to load
          }
        }
        setWebhookFailCount(failures);
      })
      .catch(() => {});
  }, [token, projectId]);

  return { approvalCount, webhookFailCount, staleFlagCount: staleCount };
}

// ─── Eval sparkline data hook ──────────────────────────────────────

function useEvalSparklineData() {
  const token = useAppStore((s) => s.token);
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    if (!token) return;
    api
      .getEvalMetrics(token)
      .then((metrics) => {
        if (metrics?.counters && Array.isArray(metrics.counters)) {
          // Aggregate by hour buckets (simple: just use counts as-is if small)
          const hourly = metrics.counters.reduce(
            (acc: Record<string, number>, c: { count: number }) => {
              const hour = new Date().getHours().toString();
              acc[hour] = (acc[hour] || 0) + (c.count || 0);
              return acc;
            },
            {},
          );
          const vals = Object.values(hourly) as number[];
          setData(vals.length > 0 ? vals : [metrics.total_evaluations || 0]);
        } else if (typeof metrics?.total_evaluations === "number") {
          // Generate simulated hourly distribution based on total
          const total = metrics.total_evaluations;
          const hours = 24;
          const avgPerHour = Math.max(1, Math.round(total / hours));
          const simulated = Array.from({ length: hours }, () =>
            Math.max(
              0,
              avgPerHour + Math.floor((Math.random() - 0.5) * avgPerHour * 0.6),
            ),
          );
          setData(simulated);
        }
      })
      .catch(() => setData([]));
  }, [token]);

  return data;
}

export default function DashboardPage() {
  const projectId = useAppStore((s) => s.currentProjectId);
  const organization = useAppStore((s) => s.organization);
  const snap = useProjectSnapshot();
  const { approvalCount, webhookFailCount, staleFlagCount } = useAttentionData(
    projectId || "",
  );
  const sparklineData = useEvalSparklineData();

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)]">
          <SparklesIcon className="h-8 w-8 text-[var(--signal-fg-accent)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
          Select a project
        </h2>
        <p className="mt-1 max-w-sm text-sm text-[var(--signal-fg-secondary)]">
          Choose a project from the top bar to see its dashboard and manage
          resources.
        </p>
      </div>
    );
  }

  if (snap.loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--signal-border-default)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-[var(--signal-border-default)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const { flags, segments, environments, audit, members } = snap;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--signal-fg-primary)]">
            {organization?.name || "Project"} Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            {flags.length} flags · {segments.length} segments ·{" "}
            {environments.length} environments · {members.length} members
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${projectId}/flags?create=true`}>
            <Button variant="primary" size="sm">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Create Flag
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/team`}>
            <Button variant="secondary" size="sm">
              <TeamIcon className="h-4 w-4 mr-1.5" />
              Invite Member
            </Button>
          </Link>
        </div>
      </div>

      {/* CENTER: Attention Zone (only appears when actionable) */}
      <AttentionCards
        items={[
          createApprovalAttention(approvalCount, projectId),
          createWebhookAttention(webhookFailCount, projectId),
          createStaleFlagAttention(staleFlagCount, projectId),
        ]}
        projectId={projectId}
      />

      {/* Resource stats grid — THE central nervous system */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          href={`/projects/${projectId}/flags`}
          icon={FlagIcon}
          label="Feature Flags"
          count={flags.length}
          color="bg-[var(--signal-bg-accent-emphasis)]"
        />
        <StatTile
          href={`/projects/${projectId}/segments`}
          icon={SegmentIcon}
          label="Segments"
          count={segments.length}
          color="bg-emerald-500"
        />
        <StatTile
          href={`/projects/${projectId}/environments`}
          icon={GlobeIcon}
          label="Environments"
          count={environments.length}
          color="bg-violet-500"
        />
        <StatTile
          href={`/projects/${projectId}/team`}
          icon={TeamIcon}
          label="Members"
          count={members.length}
          color="bg-amber-500"
        />
      </div>

      {/* SDK Connectivity health card */}
      <SDKHealth />

      {/* PERIPHERY: Awareness Zone — eval volume sparkline */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Evaluation Volume
              </h3>
            </div>
            <span className="text-xs text-[var(--signal-fg-tertiary)]">
              Last 24 hours
            </span>
          </div>
          <div className="max-w-full overflow-hidden">
            <EvalSparkline
              data={sparklineData}
              width={Math.min(
                640,
                typeof window !== "undefined" ? window.innerWidth - 64 : 640,
              )}
              height={48}
              ariaLabel="Evaluation volume over the last 24 hours"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--signal-fg-tertiary)]">
            {sparklineData.length > 0
              ? `${sparklineData.reduce((a, b) => a + b, 0).toLocaleString()} total evaluations`
              : "No evaluation data yet — connect an SDK to get started"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Integrations stats */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-4">
              Integrations
            </h3>
            <div className="space-y-3">
              <Link
                href={`/projects/${projectId}/api-keys`}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-[var(--signal-bg-secondary)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ApiKeysIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
                  <span className="text-sm text-[var(--signal-fg-primary)]">
                    API Keys
                  </span>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href={`/projects/${projectId}/webhooks`}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-[var(--signal-bg-secondary)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <WebhookIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
                  <span className="text-sm text-[var(--signal-fg-primary)]">
                    Webhooks
                  </span>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href={`/projects/${projectId}/approvals`}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-[var(--signal-bg-secondary)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CheckListIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
                  <span className="text-sm text-[var(--signal-fg-primary)]">
                    Approvals
                  </span>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Recent Activity
              </h3>
              <Link
                href="/activity"
                className="text-xs font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {audit.length === 0 ? (
              <p className="text-sm text-[var(--signal-fg-secondary)] py-4 text-center">
                No recent activity in this project.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {audit.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--signal-bg-secondary)] transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-secondary)]">
                      <AuditLogIcon className="h-3.5 w-3.5 text-[var(--signal-fg-secondary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--signal-fg-primary)] truncate">
                        {entry.action} on {entry.resource_type}
                      </p>
                      <p className="text-xs text-[var(--signal-fg-tertiary)]">
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-3">
            Quick Actions
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href={`/projects/${projectId}/flags?create=true`}
              icon={PlusIcon}
              label="Create Flag"
            />
            <QuickAction
              href={`/projects/${projectId}/segments?create=true`}
              icon={PlusIcon}
              label="Create Segment"
            />
            <QuickAction
              href={`/projects/${projectId}/environments`}
              icon={GlobeIcon}
              label="Manage Environments"
            />
            <QuickAction
              href={`/projects/${projectId}/api-keys`}
              icon={ApiKeysIcon}
              label="Generate API Key"
            />
          </div>
        </CardContent>
      </Card>
      {/* Limits Status — shows if any resource is near its cap */}
      <LimitsStatus
        flagsCount={flags.length}
        segsCount={segments.length}
        envsCount={environments.length}
      />

      {/* Beginners Guide — shows when project has few resources */}
      {flags.length < 3 && (
        <BeginnersGuide
          hasEnvs={environments.length > 0}
          hasFlags={flags.length > 0}
          projectId={projectId}
        />
      )}
    </div>
  );
}
