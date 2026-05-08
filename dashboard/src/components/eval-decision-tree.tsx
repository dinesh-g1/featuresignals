"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  XIcon,
  MinusIcon,
  ChevronRightIcon,
  ClockIcon,
  ZapIcon,
  ShieldCheckIcon,
  FlagIcon,
  LayersIcon,
  SlidersHorizontalIcon,
  CodeIcon,
  AlertIcon,
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

export interface EvalConditionOutline {
  attribute: string;
  operator: string;
  value: string;
  matched: boolean;
  reason?: string;
}

export interface EvalStep {
  /** Unique identifier for this step */
  id: string;
  /** Step type used to select the icon */
  type:
    | "flag_check"
    | "expired_check"
    | "enabled_check"
    | "prereq_check"
    | "mutex_check"
    | "rule_match"
    | "percentage_rollout"
    | "variant_assignment"
    | "default";
  /** Human-readable label like "Rule: Internal Beta" */
  label: string;
  /** Brief description of what was evaluated */
  description: string;
  /** Result of this step */
  result: "matched" | "not_matched" | "skipped" | "error";
  /** Optional extra detail shown below the description */
  detail?: string;
  /** Per-condition detail for rule match steps */
  conditions?: EvalConditionOutline[];
  /** Latency contribution for this step in ms */
  latency_ms?: number;
}

export interface EvalFinalResult {
  value: unknown;
  reason: string;
  source: "rule" | "default" | "override" | "percentage" | "variant";
  ruleName?: string;
}

export interface EvalDecisionTreeProps {
  /** Ordered list of evaluation steps */
  steps: EvalStep[];
  /** Final result info */
  finalResult: EvalFinalResult;
  /** Total evaluation latency in ms */
  latencyMs?: number;
  /** Whether to animate step entries */
  animate?: boolean;
  /** Optional class name */
  className?: string;
}

// ─── Icon Map ───────────────────────────────────────────────────────

const stepIcons: Record<
  EvalStep["type"],
  React.ComponentType<{ className?: string }>
> = {
  flag_check: ShieldCheckIcon,
  expired_check: ClockIcon,
  enabled_check: ZapIcon,
  prereq_check: LayersIcon,
  mutex_check: AlertIcon,
  rule_match: FlagIcon,
  percentage_rollout: SlidersHorizontalIcon,
  variant_assignment: CodeIcon,
  default: MinusIcon,
};

// ─── Operator Display Helpers ───────────────────────────────────────

const operatorLabels: Record<string, string> = {
  eq: "=",
  neq: "≠",
  contains: "contains",
  startswith: "starts with",
  endswith: "ends with",
  in: "in",
  notin: "not in",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  regex: "matches",
  exists: "exists",
  ends_with: "ends with",
  starts_with: "starts with",
  not_equals: "not equals",
  not_in: "not in list",
  greater_than: ">",
  less_than: "<",
  equals: "=",
  matches: "matches regex",
};

function formatOperator(op: string): string {
  return operatorLabels[op.toLowerCase()] ?? op;
}

function formatValue(v: unknown): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// ─── Sub-Component: Single Step Row ─────────────────────────────────

function StepRow({
  step,
  isActive,
  isDimmed,
  animate,
  index,
}: {
  step: EvalStep;
  isActive: boolean;
  isDimmed: boolean;
  animate: boolean;
  index: number;
}) {
  const [visible, setVisible] = useState(!animate);
  const Icon = stepIcons[step.type] ?? MinusIcon;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setVisible(true), index * 80);
      return () => clearTimeout(timer);
    }
  }, [animate, index]);

  if (!visible) return null;

  const resultIcon = (() => {
    if (step.result === "matched") return <CheckIcon className="h-4 w-4" />;
    if (step.result === "not_matched") return <XIcon className="h-4 w-4" />;
    if (step.result === "skipped") return <MinusIcon className="h-4 w-4" />;
    return <AlertIcon className="h-4 w-4" />;
  })();

  const resultColor = (() => {
    if (isActive) return "text-[var(--signal-fg-success)]";
    if (step.result === "matched") return "text-[var(--signal-fg-success)]";
    if (step.result === "not_matched")
      return "text-[var(--signal-fg-tertiary)]";
    if (step.result === "skipped") return "text-[var(--signal-fg-tertiary)]/60";
    if (step.result === "error") return "text-[var(--signal-fg-danger)]";
    return "text-[var(--signal-fg-tertiary)]";
  })();

  const bgColor = (() => {
    if (isActive)
      return "bg-[var(--signal-bg-success-muted)] border-[var(--signal-border-success-emphasis)]/40";
    if (isDimmed) return "bg-transparent border-transparent";
    if (step.result === "error")
      return "bg-[var(--signal-bg-danger-muted)] border-[var(--signal-border-danger-emphasis)]/30";
    return "bg-white border-[var(--signal-border-default)]/60";
  })();

  const textDimmed = isDimmed ? "opacity-30" : "";

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-lg border px-4 py-3 transition-all",
        bgColor,
        textDimmed,
        animate && "animate-in fade-in slide-in-from-left-2",
      )}
      style={
        animate
          ? { animationDelay: `${index * 80}ms`, animationFillMode: "both" }
          : undefined
      }
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2",
            isActive
              ? "border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-emphasis)] text-white"
              : step.result === "matched"
                ? "border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                : step.result === "error"
                  ? "border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]"
                  : isDimmed
                    ? "border-transparent bg-transparent text-[var(--signal-fg-tertiary)]/30"
                    : "border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-tertiary)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              isActive
                ? "text-[var(--signal-fg-success)]"
                : isDimmed
                  ? "text-[var(--signal-fg-tertiary)]/40"
                  : "text-[var(--signal-fg-primary)]",
            )}
          >
            {step.label}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium shrink-0",
              resultColor,
            )}
          >
            {resultIcon}
            <span>
              {step.result === "matched"
                ? "Matched"
                : step.result === "not_matched"
                  ? "No match"
                  : step.result === "skipped"
                    ? "Skipped"
                    : "Error"}
            </span>
          </span>
        </div>

        <p
          className={cn(
            "text-xs",
            isDimmed
              ? "text-[var(--signal-fg-tertiary)]/40"
              : "text-[var(--signal-fg-secondary)]",
          )}
        >
          {step.description}
        </p>

        {step.detail && (
          <p
            className={cn(
              "text-xs",
              isDimmed
                ? "text-[var(--signal-fg-tertiary)]/30"
                : "text-[var(--signal-fg-tertiary)]",
            )}
          >
            {step.detail}
          </p>
        )}

        {/* Per-condition details for rule match steps */}
        {step.conditions && step.conditions.length > 0 && !isDimmed && (
          <div className="mt-2 space-y-1.5">
            {step.conditions.map((cond, ci) => (
              <div
                key={ci}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs",
                  cond.matched
                    ? "bg-[var(--signal-bg-success-muted)]/60 text-[var(--signal-fg-success)]"
                    : "bg-[var(--signal-bg-danger-muted)]/40 text-[var(--signal-fg-danger)]",
                )}
              >
                {cond.matched ? (
                  <CheckIcon className="h-3 w-3 shrink-0" />
                ) : (
                  <XIcon className="h-3 w-3 shrink-0" />
                )}
                <span className="font-mono font-medium">{cond.attribute}</span>
                <span className="text-[var(--signal-fg-tertiary)]">
                  {formatOperator(cond.operator)}
                </span>
                <span className="font-mono">{formatValue(cond.value)}</span>
                {cond.reason && (
                  <span className="text-[var(--signal-fg-tertiary)] ml-auto italic">
                    {cond.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Per-step latency */}
        {step.latency_ms !== undefined && !isDimmed && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--signal-fg-tertiary)]">
            <ClockIcon className="h-3 w-3" />
            {step.latency_ms.toFixed(2)}ms
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function EvalDecisionTree({
  steps,
  finalResult,
  latencyMs,
  animate = true,
  className,
}: EvalDecisionTreeProps) {
  // Find the index of the first value-producing matched step (short-circuit point).
  // Prerequisite steps (enabled_check, flag_check, etc.) don't trigger short-circuit dimming.
  const valueStepTypes = new Set([
    "rule_match",
    "percentage_rollout",
    "variant_assignment",
    "default",
  ]);
  const matchIndex = steps.findIndex(
    (s) => s.result === "matched" && valueStepTypes.has(s.type),
  );

  // Determine the final result display
  const isTrue =
    finalResult.value === true ||
    finalResult.value === "true" ||
    finalResult.value === "on";
  const isFalse =
    finalResult.value === false ||
    finalResult.value === "false" ||
    finalResult.value === "off";
  const resultLabel =
    typeof finalResult.value === "string"
      ? finalResult.value
      : isTrue
        ? "TRUE"
        : isFalse
          ? "FALSE"
          : JSON.stringify(finalResult.value);

  const resultBadgeColor = (() => {
    if (finalResult.source === "override") return "amber";
    if (finalResult.source === "rule" || finalResult.source === "percentage")
      return "green";
    return "gray";
  })();

  const resultBadgeTextColor = (() => {
    if (resultBadgeColor === "green") return "text-[var(--signal-fg-success)]";
    if (resultBadgeColor === "amber") return "text-[var(--signal-fg-warning)]";
    return "text-[var(--signal-fg-secondary)]";
  })();

  const resultBadgeBg = (() => {
    if (resultBadgeColor === "green")
      return "bg-[var(--signal-bg-success-muted)] border-[var(--signal-border-success-emphasis)]/30";
    if (resultBadgeColor === "amber")
      return "bg-[var(--signal-bg-warning-muted)] border-[var(--signal-border-warning-emphasis)]/30";
    return "bg-[var(--signal-bg-secondary)] border-[var(--signal-border-default)]/40";
  })();

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
          Evaluation Trace
        </h3>
        {latencyMs !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--signal-bg-accent-muted)] px-2.5 py-1 text-xs font-medium text-[var(--signal-fg-accent)]">
            <ZapIcon className="h-3 w-3" />
            Evaluated in{" "}
            {latencyMs < 1
              ? `${(latencyMs * 1000).toFixed(0)}μs`
              : `${latencyMs.toFixed(2)}ms`}
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            isActive={step.result === "matched"}
            isDimmed={matchIndex !== -1 && i > matchIndex}
            animate={animate}
            index={i}
          />
        ))}
      </div>

      {/* Final Result */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3",
          resultBadgeBg,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
            Result
          </span>
          <ChevronRightIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", resultBadgeTextColor)}>
            {finalResult.source === "default"
              ? "Default"
              : finalResult.source === "override"
                ? "Override"
                : "Served"}
            :{" "}
          </span>
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-bold font-mono",
              resultBadgeColor === "green" &&
                "bg-emerald-500/10 text-emerald-700",
              resultBadgeColor === "amber" && "bg-amber-500/10 text-amber-700",
              resultBadgeColor === "gray" && "bg-slate-500/10 text-slate-600",
            )}
          >
            {resultLabel}
          </span>
        </div>
      </div>

      {/* Source detail */}
      {finalResult.ruleName && (
        <p className="text-xs text-[var(--signal-fg-tertiary)] px-1">
          Source:{" "}
          <span className="font-medium text-[var(--signal-fg-secondary)]">
            {finalResult.ruleName}
          </span>
        </p>
      )}
      {finalResult.source === "default" && (
        <p className="text-xs text-[var(--signal-fg-tertiary)] px-1">
          No targeting rule matched. Returning the flag&apos;s default value.
        </p>
      )}
    </div>
  );
}

// ─── Builder Helper ─────────────────────────────────────────────────

/**
 * Build evaluation steps from a flag's state and an InspectTargetResult.
 * This is a convenience function for wiring the decision tree to API data.
 */
export function buildEvalStepsFromInspect(
  flagState: {
    enabled: boolean;
    rules: {
      id: string;
      priority: number;
      description?: string;
      conditions: {
        attribute: string;
        operator: string;
        values: string[];
      }[];
      segment_keys?: string[];
      value: unknown;
    }[];
    percentage_rollout: number;
    prerequisites?: string[];
    mutual_exclusion_group?: string;
  },
  inspectResult: {
    reason: string;
    value: unknown;
    individually_targeted?: boolean;
  },
  flagDefaultValue: unknown,
): { steps: EvalStep[]; finalResult: EvalFinalResult } {
  const steps: EvalStep[] = [];
  const reason = inspectResult.reason.toLowerCase();

  // 1. Flag enabled check
  const isEnabled = flagState.enabled;
  steps.push({
    id: "enabled_check",
    type: "enabled_check",
    label: "Flag Enabled",
    description: isEnabled
      ? "The flag is enabled in this environment."
      : "The flag is disabled in this environment.",
    result: isEnabled ? "matched" : "not_matched",
  });

  // If not enabled, short-circuit
  if (!isEnabled) {
    // Add remaining rule steps as skipped
    flagState.rules.forEach((rule, i) => {
      steps.push({
        id: `rule_${rule.id}`,
        type: "rule_match",
        label: rule.description || `Rule ${i + 1}`,
        description: "Skipped: flag is disabled.",
        result: "skipped",
      });
    });
    return {
      steps,
      finalResult: {
        value: flagDefaultValue,
        reason: "Flag is disabled",
        source: "default",
      },
    };
  }

  // 2. Targeting rules in priority order
  let matchedRuleIndex = -1;
  const sortedRules = [...flagState.rules].sort(
    (a, b) => a.priority - b.priority,
  );

  sortedRules.forEach((rule, i) => {
    const conditions = rule.conditions.map((cond) => ({
      attribute: cond.attribute,
      operator: cond.operator,
      value: Array.isArray(cond.values)
        ? cond.values.join(", ")
        : String(cond.values),
      matched:
        matchedRuleIndex === -1 &&
        (reason.includes("targeted") ||
          (reason.includes("rule") && !reason.includes("no rule"))),
      reason:
        matchedRuleIndex !== -1 ? "Not evaluated (short-circuit)" : undefined,
    }));

    const ruleProbablyMatched =
      matchedRuleIndex === -1 &&
      (reason.includes("targeted") ||
        (reason.includes("rule") && !reason.includes("no rule")));
    const stepResult: EvalStep["result"] = ruleProbablyMatched
      ? "matched"
      : matchedRuleIndex !== -1
        ? "skipped"
        : "not_matched";

    if (stepResult === "matched") matchedRuleIndex = i;

    steps.push({
      id: `rule_${rule.id}`,
      type: "rule_match",
      label: rule.description || `Rule ${i + 1}`,
      description:
        stepResult === "matched"
          ? `This rule matched and determined the result.`
          : stepResult === "skipped"
            ? `Short-circuited — evaluation stopped before this rule.`
            : `This rule's conditions were not met.`,
      result: stepResult,
      conditions: stepResult !== "skipped" ? conditions : undefined,
    });
  });

  // 3. Percentage rollout (if no rule matched)
  if (matchedRuleIndex === -1 && flagState.percentage_rollout > 0) {
    const rolloutMatched = reason.includes("rollout");
    steps.push({
      id: "rollout",
      type: "percentage_rollout",
      label: "Percentage Rollout",
      description: rolloutMatched
        ? `The target was included in the ${flagState.percentage_rollout / 100}% rollout.`
        : `The target was not in the ${flagState.percentage_rollout / 100}% rollout.`,
      result: rolloutMatched ? "matched" : "not_matched",
    });
  }

  // 4. Default fallback (check if any value-producing step matched)
  const valueStepTypes = new Set([
    "rule_match",
    "percentage_rollout",
    "variant_assignment",
    "default",
  ]);
  const matched = steps.some(
    (s) => s.result === "matched" && valueStepTypes.has(s.type),
  );
  if (!matched) {
    steps.push({
      id: "default",
      type: "default",
      label: "Default Value",
      description: `No targeting rules matched. Returning the default value.`,
      result: "matched",
    });

    return {
      steps,
      finalResult: {
        value: flagDefaultValue,
        reason: "Default value — no rules matched",
        source: "default",
      },
    };
  }

  // Build final result from the matched rule
  const matchedRule =
    matchedRuleIndex >= 0 ? sortedRules[matchedRuleIndex] : null;
  return {
    steps,
    finalResult: {
      value: inspectResult.value,
      reason: inspectResult.reason,
      source: matchedRule ? "rule" : "percentage",
      ruleName: matchedRule?.description || undefined,
    },
  };
}
