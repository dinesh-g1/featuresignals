"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import {
  Button,
  Badge,
  EmptyState,
  Skeleton,
  SkeletonTable,
  ErrorDisplay,
} from "@/components/ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import {
  RocketIcon,
  PlusIcon,
  AlertIcon,
  ClockIcon,
  SearchIcon,
} from "@/components/icons/nav-icons";
import type { AssessResponse, Flag, Environment } from "@/lib/types";

// ─── Risk helpers ────────────────────────────────────────────────────────

function riskLabel(score: number): "low" | "medium" | "high" {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  return "high";
}

function riskColor(score: number): string {
  const label = riskLabel(score);
  switch (label) {
    case "low":
      return "text-[var(--signal-fg-success)] bg-[var(--signal-bg-success-muted)]";
    case "medium":
      return "text-[var(--signal-fg-warning)] bg-[var(--signal-bg-warning-muted)]";
    case "high":
      return "text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)]";
  }
}

function _riskBadgeVariant(
  score: number,
): "success" | "warning" | "danger" | "info" {
  const label = riskLabel(score);
  switch (label) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "danger";
  }
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  rollout: "Rollout",
  toggle: "Toggle",
  kill: "Kill Switch",
  rollback: "Rollback",
  archive: "Archive",
  update_rules: "Update Rules",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  rollout: "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
  toggle: "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]",
  kill: "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]",
  rollback:
    "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
  archive: "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
  update_rules:
    "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
};

// ─── New Assessment Form ──────────────────────────────────────────────────

function NewAssessmentForm({
  open,
  onOpenChange,
  flags,
  envs,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flags: Flag[];
  envs: Environment[];
  onSuccess: () => void;
}) {
  const token = useAppStore((s) => s.token);
  const [flagKey, setFlagKey] = useState("");
  const [envId, setEnvId] = useState("");
  const [changeType, setChangeType] = useState("rollout");
  const [targetPercentage, setTargetPercentage] = useState("");
  const [obsHours, setObsHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!token || !flagKey || !envId || !changeType) {
      setError("Flag, environment, and change type are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.preflight.assess(token, "", {
        flag_key: flagKey,
        env_id: envId,
        change_type: changeType,
        target_percentage: targetPercentage
          ? parseInt(targetPercentage)
          : undefined,
        observation_period_hours: obsHours ? parseInt(obsHours) : undefined,
      });
      toast("Assessment complete", "success");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    token,
    flagKey,
    envId,
    changeType,
    targetPercentage,
    obsHours,
    onOpenChange,
    onSuccess,
  ]);

  const flagOptions = flags.map((f) => ({
    value: f.key,
    label: f.name || f.key,
  }));
  const envOptions = envs.map((e) => ({ value: e.id, label: e.name }));
  const changeTypeOptions = Object.entries(CHANGE_TYPE_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Assessment</DialogTitle>
          <DialogDescription>
            Analyze the impact of a feature change before you ship.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Label>Flag</Label>
              <Select
                options={flagOptions}
                value={flagKey}
                onValueChange={setFlagKey}
                placeholder="Select a flag"
              />
            </div>
            <div>
              <Label>Environment</Label>
              <Select
                options={envOptions}
                value={envId}
                onValueChange={setEnvId}
                placeholder="Select an environment"
              />
            </div>
            <div>
              <Label>Change Type</Label>
              <Select
                options={changeTypeOptions}
                value={changeType}
                onValueChange={setChangeType}
                placeholder="Select change type"
                aria-label="Change Type"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pfl-pct">Target % (optional)</Label>
                <Input
                  id="pfl-pct"
                  type="number"
                  min={1}
                  max={100}
                  value={targetPercentage}
                  onChange={(e) => setTargetPercentage(e.target.value)}
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <Label htmlFor="pfl-obs">Observation (hrs, optional)</Label>
                <Input
                  id="pfl-obs"
                  type="number"
                  min={1}
                  max={720}
                  value={obsHours}
                  onChange={(e) => setObsHours(e.target.value)}
                  placeholder="e.g. 24"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-[var(--signal-fg-danger)]">{error}</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Assessing..." : "Run Assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────

function PreflightInner() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const limit = parseInt(searchParams.get("limit") || "50");
  const offsetVal = parseInt(searchParams.get("offset") || "0");

  const [assessments, setAssessments] = useState<AssessResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Flags & envs for the "New Assessment" form dropdowns
  const [flags, setFlags] = useState<Flag[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [flagsAndEnvsLoading, setFlagsAndEnvsLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.preflight.listAssessments(token, {
        limit,
        offset: offsetVal,
      });
      setAssessments(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assessments",
      );
    } finally {
      setLoading(false);
    }
  }, [token, limit, offsetVal]);

  // Load flags and environments for the form dropdowns
  useEffect(() => {
    if (!token || !projectId) return;
    let cancelled = false;
    setFlagsAndEnvsLoading(true);
    Promise.all([
      api.listFlags(token, projectId),
      api.listEnvironments(token, projectId),
    ])
      .then(([flagsResult, envsResult]) => {
        if (cancelled) return;
        setFlags(flagsResult ?? []);
        setEnvs(envsResult ?? []);
        setFlagsAndEnvsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setFlagsAndEnvsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, projectId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Stats
  const avgRisk =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((sum, a) => sum + a.risk_score, 0) /
            assessments.length,
        )
      : 0;

  // Pending approvals count — we fetch separately
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    // Use the existing approvals endpoint for governance approvals
    api
      .listApprovals(token, projectId ?? undefined)
      .then((res) => {
        const data = Array.isArray(res)
          ? res
          : ((res as { data: Array<{ status: string }> }).data ?? []);
        const pending = data.filter(
          (a: { status: string }) => a.status === "pending",
        ).length;
        setPendingCount(pending);
      })
      .catch(() => {
        // Silently fail — stats are non-critical
      });
  }, [token, projectId]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading && assessments.length === 0) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Preflight"
          description="Assess the impact of changes before you ship"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <SkeletonTable rows={4} cols={6} />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error && assessments.length === 0) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Preflight"
          description="Assess the impact of changes before you ship"
        />
        <ErrorDisplay
          title="Failed to load assessments"
          message={error}
          onRetry={fetchAssessments}
        />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (!loading && assessments.length === 0 && !error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Preflight"
          description="Assess the impact of changes before you ship"
          actions={
            <Button
              onClick={() => setShowNew(true)}
              disabled={flagsAndEnvsLoading}
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              New Assessment
            </Button>
          }
        />
        <EmptyState
          icon={RocketIcon}
          title="No assessments yet"
          description="Run your first preflight assessment to analyze the impact of a feature change before you ship."
          action={
            <Button
              onClick={() => setShowNew(true)}
              disabled={flagsAndEnvsLoading}
            >
              Run Assessment
            </Button>
          }
        />
        <NewAssessmentForm
          open={showNew}
          onOpenChange={setShowNew}
          flags={flags}
          envs={envs}
          onSuccess={fetchAssessments}
        />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────
  const hasPages = total > limit;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Preflight"
        description="Assess the impact of changes before you ship"
        actions={
          <Button
            onClick={() => setShowNew(true)}
            disabled={flagsAndEnvsLoading}
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            New Assessment
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Assessments"
          value={total}
          icon={SearchIcon}
          className="bg-white dark:bg-[var(--signal-bg-secondary)]"
        />
        <StatCard
          label="Avg Risk Score"
          value={avgRisk}
          change={riskLabel(avgRisk)}
          trend={avgRisk <= 30 ? "up" : avgRisk <= 60 ? "neutral" : "down"}
          icon={AlertIcon}
          className="bg-white dark:bg-[var(--signal-bg-secondary)]"
        />
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          icon={ClockIcon}
          className="bg-white dark:bg-[var(--signal-bg-secondary)]"
        />
      </div>

      {/* Table */}
      <div
        className={cn(
          "rounded-xl border border-[var(--signal-border-default)]/70 bg-white shadow-sm",
          "dark:bg-[var(--signal-bg-secondary)]",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag Key</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Generated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((a) => (
              <TableRow
                key={a.assessment_id}
                className="cursor-pointer"
                onClick={() =>
                  router.push(
                    `/projects/${projectId}/preflight/${a.assessment_id}`,
                  )
                }
              >
                <TableCell className="font-medium text-[var(--signal-fg-primary)]">
                  {a.flag_key}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      CHANGE_TYPE_COLORS[
                        a.compliance_status === "failed" ? "kill" : "rollout"
                      ] ||
                        "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                    )}
                  >
                    {CHANGE_TYPE_LABELS["rollout"] || "Rollout"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      riskColor(a.risk_score),
                    )}
                  >
                    {a.risk_score}/100 {riskLabel(a.risk_score)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      a.compliance_status === "passed"
                        ? "success"
                        : a.compliance_status === "warning"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {a.compliance_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[var(--signal-fg-tertiary)] text-xs">
                  {timeAgo(a.generated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {hasPages && <Pagination total={total} />}

      <NewAssessmentForm
        open={showNew}
        onOpenChange={setShowNew}
        flags={flags}
        envs={envs}
        onSuccess={fetchAssessments}
      />
    </div>
  );
}

// ─── Page Export with Suspense ───────────────────────────────────────────

export default function PreflightPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Preflight"
            description="Assess the impact of changes before you ship"
          />
          <SkeletonTable rows={4} cols={6} />
        </div>
      }
    >
      <PreflightInner />
    </Suspense>
  );
}
