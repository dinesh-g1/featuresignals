"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  SkeletonText,
  ErrorDisplay,
} from "@/components/ui";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import {
  ArrowLeftIcon,
  AlertIcon,
  CheckCircleFillIcon,
  ClockIcon,
  RocketIcon,
} from "@/components/icons/nav-icons";
import type {
  AssessResponse,
  ApprovalResponse,
  RolloutPhaseItem,
} from "@/lib/types";

// ─── Risk helpers ────────────────────────────────────────────────────────

function riskLabel(score: number): "low" | "medium" | "high" {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  return "high";
}

function riskColor(score: number): {
  ring: string;
  text: string;
} {
  const label = riskLabel(score);
  switch (label) {
    case "low":
      return {
        ring: "var(--signal-border-success-emphasis)",
        text: "var(--signal-fg-success)",
      };
    case "medium":
      return {
        ring: "var(--signal-border-warning-emphasis)",
        text: "var(--signal-fg-warning)",
      };
    case "high":
      return {
        ring: "var(--signal-border-danger-emphasis)",
        text: "var(--signal-fg-danger)",
      };
  }
}

// ─── Risk Gauge ──────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const colors = riskColor(score);
  const label = riskLabel(score);
  const circumference = 2 * Math.PI * 40;
  const filled = (score / 100) * circumference;
  const empty = circumference - filled;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg
          className="w-32 h-32 -rotate-90"
          viewBox="0 0 100 100"
          aria-label={`Risk score: ${score} out of 100 — ${label}`}
          role="img"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--signal-border-subtle)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={colors.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: colors.text }}
          >
            {score}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: colors.text }}
          >
            /100 {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Rollout Timeline ────────────────────────────────────────────────────

function RolloutTimeline({ phases }: { phases: RolloutPhaseItem[] }) {
  if (!phases || phases.length === 0) {
    return (
      <p className="text-sm text-[var(--signal-fg-tertiary)]">
        No rollout plan available for this assessment.
      </p>
    );
  }

  return (
    <div className="relative pl-8 space-y-0">
      {phases.map((phase, idx) => (
        <div key={phase.phase} className="relative pb-6 last:pb-0">
          {idx < phases.length - 1 && (
            <div className="absolute left-[-21px] top-6 bottom-0 w-px bg-[var(--signal-border-subtle)]" />
          )}
          <div
            className={cn(
              "absolute left-[-25px] top-1.5 h-2.5 w-2.5 rounded-full border-2",
              "border-[var(--signal-fg-accent)] bg-white dark:bg-[var(--signal-bg-primary)]",
            )}
          />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Phase {phase.phase}
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal-fg-accent)]">
                {phase.percentage}%
              </span>
              <span className="text-xs text-[var(--signal-fg-tertiary)]">
                {phase.duration_hours}h observation
              </span>
            </div>
            {phase.guard_metrics && phase.guard_metrics.length > 0 && (
              <div className="space-y-1">
                {phase.guard_metrics.map((gm, gIdx) => (
                  <div
                    key={gIdx}
                    className="flex items-center gap-2 text-xs text-[var(--signal-fg-secondary)]"
                  >
                    <AlertIcon className="h-3 w-3 text-[var(--signal-fg-warning)]" />
                    <span className="font-mono text-[11px]">
                      {gm.metric} {gm.operator} {gm.threshold}
                    </span>
                    <span className="text-[var(--signal-fg-tertiary)]">
                      &rarr; halt if exceeded
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(!phase.guard_metrics || phase.guard_metrics.length === 0) && (
              <p className="text-xs text-[var(--signal-fg-tertiary)]">
                No guard metrics configured
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Approval Section ────────────────────────────────────────────────────

function ApprovalSection({
  assessmentId,
  flagKey: _flagKey,
}: {
  assessmentId: string;
  flagKey: string;
}) {
  const token = useAppStore((s) => s.token);
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async () => {
    if (!token) return;
    setRequesting(true);
    setError(null);
    try {
      const result = await api.preflight.requestApproval(token, {
        assessment_id: assessmentId,
        justification: justification || undefined,
      });
      setApproval(result);
      setShowRequest(false);
      toast("Approval requested", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request approval",
      );
    } finally {
      setRequesting(false);
    }
  }, [token, assessmentId, justification]);

  if (approval) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {approval.status === "approved" ? (
                <CheckCircleFillIcon className="h-5 w-5 text-[var(--signal-fg-success)]" />
              ) : approval.status === "rejected" ? (
                <AlertIcon className="h-5 w-5 text-[var(--signal-fg-danger)]" />
              ) : (
                <ClockIcon className="h-5 w-5 text-[var(--signal-fg-warning)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  Approval Status:{" "}
                  <span className="font-semibold capitalize">
                    {approval.status}
                  </span>
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)]">
                  Requested {timeAgo(approval.created_at)}
                  {approval.decision && ` \u00b7 ${approval.decision}`}
                  {approval.comment && ` \u2014 "${approval.comment}"`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showRequest) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
            Request Change Approval
          </p>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-fg-accent)]"
            placeholder="Justification for this change (optional)..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            aria-label="Approval justification"
          />
          {error && (
            <p className="text-xs text-[var(--signal-fg-danger)]">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={handleRequest} disabled={requesting}>
              {requesting ? "Submitting..." : "Submit Request"}
            </Button>
            <Button variant="secondary" onClick={() => setShowRequest(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Button onClick={() => setShowRequest(true)}>Request Approval</Button>;
}

// ─── Main Detail Page ────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const token = useAppStore((s) => s.token);
  const params = useParams<{ projectId: string; assessmentId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const assessmentId = params.assessmentId;

  const [assessment, setAssessment] = useState<AssessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchAssessment = useCallback(async () => {
    if (!token || !assessmentId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.preflight.getAssessment(token, assessmentId);
      setAssessment(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("not found")) {
        setNotFound(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [token, assessmentId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-8 w-8 p-0"
                aria-label="Back to Preflight"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Skeleton className="h-8 w-64" />
            </div>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <SkeletonText lines={6} />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── Not-found state ───────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-8 w-8 p-0"
                aria-label="Back to Preflight"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              Assessment Not Found
            </div>
          }
        />
        <Card>
          <CardContent className="p-12 text-center">
            <RocketIcon className="h-12 w-12 mx-auto mb-4 text-[var(--signal-fg-tertiary)]" />
            <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-2">
              Assessment not found
            </h2>
            <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
              This assessment may have been deleted or you may not have access
              to it.
            </p>
            <Button
              onClick={() => router.push(`/projects/${projectId}/preflight`)}
            >
              Back to Preflight
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error && !assessment) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-8 w-8 p-0"
                aria-label="Back to Preflight"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              Assessment Error
            </div>
          }
        />
        <ErrorDisplay
          title="Failed to load assessment"
          message={error}
          onRetry={fetchAssessment}
        />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (!assessment) return null;

  const _riskColors = riskColor(assessment.risk_score);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push(`/projects/${projectId}/preflight`)}
              className="h-8 w-8 p-0"
              aria-label="Back to Preflight"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <div>
              <span className="text-2xl font-bold text-[var(--signal-fg-primary)]">
                Preflight Assessment
              </span>
              <span className="ml-2 text-lg font-mono text-[var(--signal-fg-secondary)]">
                {assessment.flag_key}
              </span>
            </div>
          </div>
        }
        description={`Generated ${timeAgo(assessment.generated_at)}`}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="col-span-1 sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-3">
              Risk Score
            </p>
            <RiskGauge score={assessment.risk_score} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
              Affected Files
            </p>
            <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
              {assessment.affected_files}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
              Code References
            </p>
            <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
              {assessment.affected_code_refs}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
              Compliance
            </p>
            <div className="flex items-center gap-2 mt-1">
              {assessment.compliance_status === "passed" ? (
                <CheckCircleFillIcon className="h-5 w-5 text-[var(--signal-fg-success)]" />
              ) : assessment.compliance_status === "warning" ? (
                <AlertIcon className="h-5 w-5 text-[var(--signal-fg-warning)]" />
              ) : (
                <AlertIcon className="h-5 w-5 text-[var(--signal-fg-danger)]" />
              )}
              <Badge
                variant={
                  assessment.compliance_status === "passed"
                    ? "success"
                    : assessment.compliance_status === "warning"
                      ? "warning"
                      : "danger"
                }
              >
                {assessment.compliance_status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-2">
            Impact Summary
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
            {assessment.impact_summary ||
              "No impact summary available for this assessment."}
          </p>
        </CardContent>
      </Card>

      {/* Rollout Plan */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-4">
            Rollout Plan
          </h3>
          <RolloutTimeline phases={assessment.rollout_plan} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <ApprovalSection
          assessmentId={assessment.assessment_id}
          flagKey={assessment.flag_key}
        />
        <Button
          variant="secondary"
          onClick={() => router.push(`/projects/${projectId}/preflight`)}
        >
          Back to Preflight
        </Button>
      </div>
    </div>
  );
}
