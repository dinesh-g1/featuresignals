"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import type {
  Agent,
  AgentMaturity,
  MaturityEvaluationResult,
  MaturityStats,
} from "@/lib/agent-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorDisplay } from "@/components/ui/error-display";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Shield,
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Zap,
  AlertOctagon,
  Clock,
  BarChart3,
  Brain,
} from "lucide-react";

// ─── Level Metadata ────────────────────────────────────────────────────────

const LEVEL_META: Record<
  number,
  { name: string; color: string; description: string }
> = {
  1: {
    name: "L1 — Shadow",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description:
      "Shadow mode: observes and recommends, but takes no action. All decisions require human execution.",
  },
  2: {
    name: "L2 — Assist",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    description:
      "Assist mode: acts with human approval required. Every action is gated by a human checkpoint.",
  },
  3: {
    name: "L3 — Supervised",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    description:
      "Supervised mode: acts autonomously with human review. Override is available but not required for routine actions.",
  },
  4: {
    name: "L4 — Autonomous",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    description:
      "Autonomous mode: acts independently. Human override is available but rarely needed. Self-healing for common issues.",
  },
  5: {
    name: "L5 — Sentinel",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    description:
      "Sentinel mode: full autonomy with self-healing. Teaches other agents. Trusted for production-critical decisions.",
  },
};

// ─── Progression Rules by level (mirror the Go domain rules) ───────────────

interface ProgressionRule {
  label: string;
  current: number;
  required: number;
  format: "percent" | "number" | "days";
}

function getProgressionRules(
  level: number,
  stats: MaturityStats,
): ProgressionRule[] {
  const rules: Record<number, ProgressionRule[]> = {
    1: [
      {
        label: "Accuracy",
        current: stats.accuracy,
        required: 0.85,
        format: "percent",
      },
      {
        label: "Total Decisions",
        current: stats.total_decisions,
        required: 100,
        format: "number",
      },
      {
        label: "Max Incidents",
        current: stats.incidents_caused,
        required: 3,
        format: "number",
      },
      {
        label: "Max Override Rate",
        current: stats.human_override_rate,
        required: 0.15,
        format: "percent",
      },
      {
        label: "Min Days Since Incident",
        current: stats.days_since_last_incident,
        required: 7,
        format: "days",
      },
      {
        label: "Avg Confidence",
        current: stats.avg_confidence,
        required: 0.7,
        format: "percent",
      },
    ],
    2: [
      {
        label: "Accuracy",
        current: stats.accuracy,
        required: 0.9,
        format: "percent",
      },
      {
        label: "Total Decisions",
        current: stats.total_decisions,
        required: 500,
        format: "number",
      },
      {
        label: "Max Incidents",
        current: stats.incidents_caused,
        required: 5,
        format: "number",
      },
      {
        label: "Max Override Rate",
        current: stats.human_override_rate,
        required: 0.1,
        format: "percent",
      },
      {
        label: "Min Days Since Incident",
        current: stats.days_since_last_incident,
        required: 14,
        format: "days",
      },
      {
        label: "Avg Confidence",
        current: stats.avg_confidence,
        required: 0.8,
        format: "percent",
      },
    ],
    3: [
      {
        label: "Accuracy",
        current: stats.accuracy,
        required: 0.95,
        format: "percent",
      },
      {
        label: "Total Decisions",
        current: stats.total_decisions,
        required: 2000,
        format: "number",
      },
      {
        label: "Max Incidents",
        current: stats.incidents_caused,
        required: 3,
        format: "number",
      },
      {
        label: "Max Override Rate",
        current: stats.human_override_rate,
        required: 0.05,
        format: "percent",
      },
      {
        label: "Min Days Since Incident",
        current: stats.days_since_last_incident,
        required: 30,
        format: "days",
      },
      {
        label: "Avg Confidence",
        current: stats.avg_confidence,
        required: 0.85,
        format: "percent",
      },
    ],
    4: [
      {
        label: "Accuracy",
        current: stats.accuracy,
        required: 0.98,
        format: "percent",
      },
      {
        label: "Total Decisions",
        current: stats.total_decisions,
        required: 10000,
        format: "number",
      },
      {
        label: "Max Incidents",
        current: stats.incidents_caused,
        required: 1,
        format: "number",
      },
      {
        label: "Max Override Rate",
        current: stats.human_override_rate,
        required: 0.02,
        format: "percent",
      },
      {
        label: "Min Days Since Incident",
        current: stats.days_since_last_incident,
        required: 90,
        format: "days",
      },
      {
        label: "Avg Confidence",
        current: stats.avg_confidence,
        required: 0.9,
        format: "percent",
      },
    ],
  };
  return rules[level] ?? [];
}

// ─── Demotion risk calculation ─────────────────────────────────────────────

const DEMOTION_RULES: Record<
  number,
  { maxAccuracy: number; maxIncidents: number; maxOverrideRate: number }
> = {
  2: { maxAccuracy: 0.8, maxIncidents: 5, maxOverrideRate: 0.25 },
  3: { maxAccuracy: 0.85, maxIncidents: 5, maxOverrideRate: 0.2 },
  4: { maxAccuracy: 0.88, maxIncidents: 3, maxOverrideRate: 0.15 },
  5: { maxAccuracy: 0.92, maxIncidents: 2, maxOverrideRate: 0.1 },
};

function getDemotionRisk(
  level: number,
  stats: MaturityStats,
): { risk: "none" | "low" | "medium" | "high"; message: string } {
  if (level <= 1)
    return { risk: "none", message: "L1 Shadow cannot be demoted." };
  const rules = DEMOTION_RULES[level];
  if (!rules)
    return { risk: "none", message: "No demotion rules for this level." };

  let riskScore = 0;
  const warnings: string[] = [];

  if (stats.accuracy < rules.maxAccuracy + 0.05) {
    riskScore++;
    warnings.push("Accuracy approaching demotion threshold.");
  }
  if (stats.incidents_caused >= rules.maxIncidents) {
    riskScore += 2;
    warnings.push("Incidents have reached the demotion threshold.");
  }
  if (stats.human_override_rate > rules.maxOverrideRate - 0.05) {
    riskScore++;
    warnings.push("Override rate approaching demotion threshold.");
  }

  if (riskScore >= 3) return { risk: "high", message: warnings.join(" ") };
  if (riskScore >= 2) return { risk: "medium", message: warnings.join(" ") };
  if (riskScore >= 1) return { risk: "low", message: warnings.join(" ") };
  return {
    risk: "none",
    message: "All demotion criteria are within safe limits.",
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v: number): string {
  return v?.toLocaleString() ?? "—";
}

function riskColor(risk: string): string {
  switch (risk) {
    case "high":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    case "medium":
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
    case "low":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
    default:
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800";
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AgentMaturityPage() {
  const params = useParams<{ projectId: string; agentId: string }>();
  const projectId = params.projectId;
  const agentId = params.agentId;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [maturity, setMaturity] = useState<AgentMaturity | null>(null);
  const [evalResult, setEvalResult] = useState<MaturityEvaluationResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [agentData] = await Promise.all([
        apiGet<Agent>(`/v1/agents/${agentId}`),
      ]);
      setAgent(agentData);
      // Use either the dedicated maturity record or the embedded one
      const mat = agentData.maturity;
      if (mat && mat.current_level) {
        setMaturity(mat);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load agent maturity data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setEvalError(null);
    try {
      const result = await apiPost<MaturityEvaluationResult>(
        `/v1/agents/${agentId}/evaluate-maturity`,
      );
      setEvalResult(result);
      // Refresh data to get updated maturity
      await fetchData();
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Maturity evaluation failed",
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-signal-loading="true">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────

  if (error && !agent) {
    return (
      <ErrorDisplay
        title="Could Not Load Maturity Data"
        message={error}
        fullPage
        onRetry={fetchData}
      />
    );
  }

  // ─── Not Found State ─────────────────────────────────────────────────

  if (!agent) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 text-center"
        data-signal-empty="true"
      >
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

  const stats =
    maturity?.stats ?? agent.maturity?.stats ?? ({} as MaturityStats);
  const currentLevel =
    maturity?.current_level ?? agent.maturity?.current_level ?? 1;
  const levelMeta = LEVEL_META[currentLevel] ?? LEVEL_META[1];
  const progressionRules = getProgressionRules(currentLevel, stats);
  const demotionRisk = getDemotionRisk(currentLevel, stats);
  const nextLevel = currentLevel < 5 ? currentLevel + 1 : null;

  // Progress percentage: use accuracy as the primary progress indicator
  const progressPct = stats.accuracy ? Math.min(100, stats.accuracy * 100) : 0;

  return (
    <div className="space-y-6 p-6" data-signal-success="true">
      {/* ── Back Link + Header ─────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/agents/${agentId}`}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to agent details"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)] truncate">
            {agent.name} — Maturity
          </h1>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            Capability progression and performance tracking
          </p>
        </div>
      </div>

      {/* ── Current Level Banner ────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)]">
              <Shield className="h-7 w-7 text-[var(--signal-fg-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${levelMeta.color}`}
                >
                  {levelMeta.name}
                </span>
                {evalResult?.changed && (
                  <Badge
                    variant={
                      evalResult.direction === "promoted"
                        ? "success"
                        : "warning"
                    }
                  >
                    {evalResult.direction === "promoted"
                      ? "↑ Promoted"
                      : "↓ Demoted"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--signal-fg-secondary)] max-w-lg">
                {levelMeta.description}
              </p>
            </div>
          </div>

          <Button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            variant="default"
            className="shrink-0"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Evaluating…
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Evaluate Maturity
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Evaluation Result Banner ─────────────────────────────── */}
      {evalResult && (
        <Card
          className={
            evalResult.direction === "promoted"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
              : evalResult.direction === "demoted"
                ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
                : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
          }
        >
          <CardContent className="flex items-start gap-3 pt-5">
            {evalResult.direction === "promoted" ? (
              <ArrowUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : evalResult.direction === "demoted" ? (
              <ArrowDown className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <div>
              <p className="font-semibold text-[var(--signal-fg-primary)]">
                {evalResult.direction === "promoted"
                  ? "Progression Recommended"
                  : evalResult.direction === "demoted"
                    ? "Demotion Triggered"
                    : "No Change"}
              </p>
              <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
                {evalResult.reason}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Evaluation Error ─────────────────────────────────────── */}
      {evalError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">
              Evaluation Failed
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {evalError}
            </p>
          </div>
        </div>
      )}

      {/* ── Progress Toward Next Level ───────────────────────────── */}
      {nextLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Progress Toward {LEVEL_META[nextLevel]?.name ?? `L${nextLevel}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--signal-bg-secondary)]">
              <div
                className="h-full rounded-full bg-[var(--signal-fg-accent)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(progressPct)}% toward next maturity level`}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--signal-fg-tertiary)]">
              <span>{levelMeta.name}</span>
              <span>{LEVEL_META[nextLevel]?.name ?? `L${nextLevel}`}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <Target className="h-4 w-4" />
              Total Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--signal-fg-primary)]">
              {fmtNum(stats.total_decisions)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <CheckCircle2 className="h-4 w-4" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--signal-fg-primary)]">
              {stats.accuracy != null ? pct(stats.accuracy) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <AlertOctagon className="h-4 w-4" />
              Incidents Caused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                (stats.incidents_caused ?? 0) > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {stats.incidents_caused ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <Zap className="h-4 w-4" />
              Human Override Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--signal-fg-primary)]">
              {stats.human_override_rate != null
                ? pct(stats.human_override_rate)
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <Brain className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--signal-fg-primary)]">
              {stats.avg_confidence != null ? pct(stats.avg_confidence) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-secondary)]">
              <Clock className="h-4 w-4" />
              Days Since Last Incident
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--signal-fg-primary)]">
              {stats.days_since_last_incident ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Progression Requirements Checklist ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Progression Requirements
            {nextLevel ? ` (L${currentLevel} → L${nextLevel})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLevel >= 5 ? (
            <div className="flex items-center gap-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                Agent has reached the maximum maturity level (L5 Sentinel). No
                further progression is possible.
              </span>
            </div>
          ) : progressionRules.length === 0 ? (
            <p className="text-sm text-[var(--signal-fg-tertiary)]">
              No progression rules available for this maturity level.
            </p>
          ) : (
            <ul className="space-y-3">
              {progressionRules.map((rule) => {
                const met = rule.label.startsWith("Max")
                  ? rule.current <= rule.required
                  : rule.label.startsWith("Min")
                    ? rule.current >= rule.required
                    : rule.current >= rule.required;

                const formattedCurrent =
                  rule.format === "percent"
                    ? pct(rule.current)
                    : rule.format === "days"
                      ? `${rule.current} days`
                      : fmtNum(rule.current);

                const formattedRequired =
                  rule.format === "percent"
                    ? pct(rule.required)
                    : rule.format === "days"
                      ? `${rule.required} days`
                      : fmtNum(rule.required);

                return (
                  <li
                    key={rule.label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-[var(--signal-border-default)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      {met ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                      )}
                      <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                        {rule.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`font-semibold tabular-nums ${
                          met
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formattedCurrent}
                      </span>
                      <span className="text-[var(--signal-fg-tertiary)]">
                        / {formattedRequired}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Demotion Risk Indicator ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Demotion Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${riskColor(demotionRisk.risk)}`}
          >
            {demotionRisk.risk === "high" || demotionRisk.risk === "medium" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : demotionRisk.risk === "low" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                Risk Level:{" "}
                <span className="capitalize">{demotionRisk.risk}</span>
              </p>
              <p className="mt-1 text-sm">{demotionRisk.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
