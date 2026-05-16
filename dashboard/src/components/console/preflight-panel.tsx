"use client";

/**
 * PreflightPanel — Shows preflight assessment in the feature detail panel
 * when a feature is in "configure" or "approve" stage.
 *
 * Fetches assessment data from api.preflight, displays:
 *   - Impact summary with risk level
 *   - Affected services / code references
 *   - Guard metrics status
 *   - Approval status (if in "approve" stage)
 *   - Request approval button
 *
 * States: loading (skeleton), empty (no assessment yet - CTA), error (retry), success.
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSearch,
  Activity,
  Clock,
  RefreshCw,
  ChevronRight,
  Shield,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { AssessResponse, ApprovalResponse } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface PreflightPanelProps {
  flagKey: string;
  flagName: string;
  stage: "configure" | "approve";
  environment: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function riskColor(score: number): string {
  if (score <= 30) return "var(--signal-fg-success)";
  if (score <= 60) return "var(--signal-fg-warning)";
  return "var(--signal-fg-danger)";
}

function riskBg(score: number): string {
  if (score <= 30) return "var(--signal-bg-success-muted)";
  if (score <= 60) return "var(--signal-bg-warning-muted)";
  return "var(--signal-bg-danger-muted)";
}

function riskLabel(score: number): string {
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Medium Risk";
  return "High Risk";
}

function RiskIcon({ score }: { score: number }) {
  if (score <= 30)
    return <CheckCircle2 className="h-4 w-4 text-[var(--signal-fg-success)]" />;
  if (score <= 60)
    return (
      <AlertTriangle className="h-4 w-4 text-[var(--signal-fg-warning)]" />
    );
  return <XCircle className="h-4 w-4 text-[var(--signal-fg-danger)]" />;
}

function complianceColor(status: string): string {
  switch (status) {
    case "passed":
      return "var(--signal-fg-success)";
    case "warning":
      return "var(--signal-fg-warning)";
    case "failed":
      return "var(--signal-fg-danger)";
    default:
      return "var(--signal-fg-tertiary)";
  }
}

function complianceIcon(status: string) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-secondary)]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
        {title}
      </span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function PreflightSkeleton() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)] animate-pulse">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-[var(--signal-border-default)]" />
          <div className="h-3 w-24 rounded bg-[var(--signal-border-default)]" />
        </div>
        <div className="h-10 w-full rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]" />
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-[var(--signal-border-default)]" />
          <div className="h-2 w-3/4 rounded bg-[var(--signal-border-default)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function PreflightError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-2">
          <RefreshCw className="h-4 w-4 text-[var(--signal-fg-danger)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] mb-2 leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--signal-fg-accent)] hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── No Assessment ───────────────────────────────────────────────────

function NoAssessment({ onAssess }: { onAssess: () => void }) {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm mb-2">
          <FileSearch className="h-5 w-5 text-[var(--signal-fg-accent)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] mb-3 leading-relaxed">
          No preflight assessment yet. Run an assessment to analyze impact
          before making changes.
        </p>
        <Button variant="primary" size="xs" onClick={onAssess}>
          <Shield className="h-3 w-3" />
          Run Assessment
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function PreflightPanel({
  flagKey,
  flagName,
  stage,
  environment,
}: PreflightPanelProps) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [assessment, setAssessment] = useState<AssessResponse | null>(null);
  const [approval, setApproval] = useState<ApprovalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // ── Fetch assessment ─────────────────────────────────────────────

  const fetchAssessment = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.preflight.listAssessments(token, {
        flag_key: flagKey,
        limit: 1,
      });
      if (result.data.length > 0) {
        setAssessment(result.data[0]);
        if (stage === "approve") {
          try {
            const approvalResult = await api.preflight.getApproval(
              token,
              result.data[0].assessment_id,
            );
            setApproval(approvalResult);
          } catch {
            // Approval may not exist yet — that's fine
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assessment",
      );
    } finally {
      setLoading(false);
    }
  }, [token, flagKey, stage]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // ── Run assessment ──────────────────────────────────────────────

  const handleAssess = useCallback(async () => {
    if (!token) return;
    setAssessing(true);
    try {
      const result = await api.preflight.assess(token, currentProjectId ?? "", {
        flag_key: flagKey,
        env_id: environment,
        change_type: "rollout",
      });
      setAssessment(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setAssessing(false);
    }
  }, [token, flagKey, environment, currentProjectId]);

  // ── Request approval ────────────────────────────────────────────

  const handleRequestApproval = useCallback(async () => {
    if (!token || !assessment) return;
    setRequesting(true);
    try {
      const result = await api.preflight.requestApproval(token, {
        assessment_id: assessment.assessment_id,
        justification: `Approval requested for ${flagName} rollout`,
      });
      setApproval(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request approval",
      );
    } finally {
      setRequesting(false);
    }
  }, [token, assessment, flagName]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <PreflightSkeleton key="skeleton" />
      ) : error ? (
        <PreflightError key="error" message={error} onRetry={fetchAssessment} />
      ) : !assessment ? (
        <NoAssessment key="empty" onAssess={handleAssess} />
      ) : (
        <motion.div
          key="assessment"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-[var(--signal-border-subtle)]"
        >
          <div className="px-4 py-3 space-y-3">
            {/* ── Risk Score Banner ──────────────────────────────── */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--signal-radius-sm)]"
              style={{ backgroundColor: riskBg(assessment.risk_score) }}
            >
              <RiskIcon score={assessment.risk_score} />
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold"
                  style={{ color: riskColor(assessment.risk_score) }}
                >
                  {riskLabel(assessment.risk_score)} — Score{" "}
                  {assessment.risk_score}/100
                </p>
                {assessment.impact_summary && (
                  <p className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5 leading-relaxed line-clamp-2">
                    {assessment.impact_summary}
                  </p>
                )}
              </div>
            </div>

            {/* ── Stats Row ──────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold font-mono tabular-nums text-[var(--signal-fg-primary)]">
                  {assessment.affected_files}
                </div>
                <p className="text-[9px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                  Files
                </p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold font-mono tabular-nums text-[var(--signal-fg-primary)]">
                  {assessment.affected_code_refs}
                </div>
                <p className="text-[9px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                  Code Refs
                </p>
              </div>
              <div className="text-center">
                <div
                  className="flex items-center justify-center gap-1"
                  style={{
                    color: complianceColor(assessment.compliance_status),
                  }}
                >
                  {complianceIcon(assessment.compliance_status)}
                  <span className="text-lg font-bold font-mono tabular-nums capitalize">
                    {assessment.compliance_status}
                  </span>
                </div>
                <p className="text-[9px] text-[var(--signal-fg-tertiary)] mt-0.5 leading-tight">
                  Compliance
                </p>
              </div>
            </div>

            {/* ── Rollout Plan ───────────────────────────────────── */}
            {assessment.rollout_plan && assessment.rollout_plan.length > 0 && (
              <div>
                <SectionHeader icon={Target} title="Rollout Plan" />
                <div className="space-y-1">
                  {assessment.rollout_plan.slice(0, 3).map((phase, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 text-[10px] font-semibold"
                        style={{
                          backgroundColor: "var(--signal-bg-secondary)",
                          color: "var(--signal-fg-secondary)",
                        }}
                      >
                        {phase.phase}
                      </span>
                      <span className="text-[var(--signal-fg-primary)]">
                        {phase.percentage}% over {phase.duration_hours}h
                      </span>
                      {phase.guard_metrics.length > 0 && (
                        <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                          ({phase.guard_metrics.length} guards)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Guard Metrics ──────────────────────────────────── */}
            {assessment.rollout_plan?.some(
              (p) => p.guard_metrics.length > 0,
            ) && (
              <div>
                <SectionHeader icon={Activity} title="Guard Metrics" />
                <div className="flex flex-wrap gap-1">
                  {assessment.rollout_plan
                    .flatMap((p) => p.guard_metrics)
                    .slice(0, 4)
                    .map((gm, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border"
                        style={{
                          backgroundColor: "var(--signal-bg-secondary)",
                          borderColor: "var(--signal-border-subtle)",
                          color: "var(--signal-fg-secondary)",
                        }}
                      >
                        {gm.metric}
                        <span className="text-[var(--signal-fg-tertiary)]">
                          {gm.operator} {gm.threshold}
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* ── Approval Status (approve stage only) ───────────── */}
            {stage === "approve" && (
              <div
                className={cn(
                  "px-3 py-2.5 rounded-[var(--signal-radius-sm)] border",
                )}
                style={{
                  backgroundColor: approval
                    ? approval.status === "approved"
                      ? "var(--signal-bg-success-muted)"
                      : approval.status === "rejected"
                        ? "var(--signal-bg-danger-muted)"
                        : "var(--signal-bg-warning-muted)"
                    : "var(--signal-bg-secondary)",
                  borderColor: approval
                    ? approval.status === "approved"
                      ? "var(--signal-border-success-muted)"
                      : approval.status === "rejected"
                        ? "var(--signal-border-danger-emphasis)"
                        : "var(--signal-border-warning-muted)"
                    : "var(--signal-border-subtle)",
                }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--signal-fg-secondary)]" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--signal-fg-primary)]">
                      {approval
                        ? `Approval ${approval.status}`
                        : "Approval Required"}
                    </p>
                    {approval?.comment && (
                      <p className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5 line-clamp-1">
                        {approval.comment}
                      </p>
                    )}
                    {!approval && (
                      <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5">
                        Request approval to proceed with rollout
                      </p>
                    )}
                  </div>
                  {!approval && (
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={handleRequestApproval}
                      loading={requesting}
                      className="shrink-0 ml-auto"
                    >
                      Request
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── Assessment Meta ────────────────────────────────── */}
            {assessment.generated_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Assessment generated{" "}
                  {new Date(assessment.generated_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
