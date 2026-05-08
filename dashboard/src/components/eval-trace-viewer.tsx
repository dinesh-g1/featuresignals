"use client";

import { cn } from "@/lib/utils";
import {
  CheckIcon,
  XIcon,
  MinusIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  ZapIcon,
  FlagIcon,
  LayersIcon,
  SlidersHorizontalIcon,
  CodeIcon,
  AlertIcon,
} from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

export interface EvalTraceStep {
  /** Label for this step */
  label: string;
  /** Step type for icon selection */
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
  /** Result of this step */
  result: "matched" | "not_matched" | "skipped" | "error";
  /** Optional latency in ms for this step */
  latencyMs?: number;
}

export interface EvalTraceViewerProps {
  /** Ordered list of trace steps */
  steps: EvalTraceStep[];
  /** Whether to show as compact horizontal timeline */
  compact?: boolean;
  /** Optional class name */
  className?: string;
}

// ─── Icon Map ───────────────────────────────────────────────────────

const stepIcons: Record<
  EvalTraceStep["type"],
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

// ─── Result Icon / Color ────────────────────────────────────────────

function ResultDot({ result }: { result: EvalTraceStep["result"] }) {
  if (result === "matched") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <CheckIcon className="h-3 w-3" />
      </span>
    );
  }
  if (result === "not_matched") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-white">
        <XIcon className="h-3 w-3" />
      </span>
    );
  }
  if (result === "skipped") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-400">
        <MinusIcon className="h-3 w-3" />
      </span>
    );
  }
  // error
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
      <AlertIcon className="h-3 w-3" />
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function EvalTraceViewer({
  steps,
  compact = true,
  className,
}: EvalTraceViewerProps) {
  if (!steps || steps.length === 0) {
    return (
      <p className="text-xs text-[var(--signal-fg-tertiary)] italic">
        No evaluation trace available.
      </p>
    );
  }

  if (compact) {
    // Horizontal timeline view
    return (
      <div
        className={cn(
          "flex items-center gap-0.5 overflow-x-auto py-2",
          className,
        )}
      >
        {steps.map((step, i) => {
          const Icon = stepIcons[step.type] ?? MinusIcon;
          const isActive = step.result === "matched";
          const isDimmed =
            steps.findIndex((s) => s.result === "matched") !== -1 &&
            i > steps.findIndex((s) => s.result === "matched");

          return (
            <div
              key={`${step.type}-${i}`}
              className="flex items-center gap-0.5 shrink-0"
            >
              {/* Connector arrow */}
              {i > 0 && (
                <ChevronRightIcon
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isDimmed
                      ? "text-slate-200"
                      : "text-[var(--signal-fg-tertiary)]",
                  )}
                />
              )}

              {/* Step chip */}
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-all",
                  isActive &&
                    "border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
                  !isActive &&
                    !isDimmed &&
                    step.result === "not_matched" &&
                    "border-[var(--signal-border-default)] bg-white text-[var(--signal-fg-secondary)]",
                  isDimmed &&
                    "border-transparent bg-transparent text-[var(--signal-fg-tertiary)]/30",
                  step.result === "error" &&
                    "border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]",
                )}
                title={`${step.label}: ${step.result}${step.latencyMs !== undefined ? ` (${step.latencyMs.toFixed(2)}ms)` : ""}`}
              >
                <Icon className={cn("h-3 w-3", isDimmed ? "opacity-30" : "")} />
                <span className="max-w-[100px] truncate">{step.label}</span>
                <ResultDot result={step.result} />
              </div>
            </div>
          );
        })}

        {/* Total step count label */}
        <span className="ml-2 text-[10px] text-[var(--signal-fg-tertiary)] shrink-0">
          {steps.length} step{steps.length !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  // Vertical list view (non-compact)
  return (
    <div className={cn("space-y-1", className)}>
      {steps.map((step, i) => {
        const Icon = stepIcons[step.type] ?? MinusIcon;
        const isActive = step.result === "matched";
        const isDimmed =
          steps.findIndex((s) => s.result === "matched") !== -1 &&
          i > steps.findIndex((s) => s.result === "matched");

        return (
          <div
            key={`${step.type}-${i}`}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
              isActive && "bg-[var(--signal-bg-success-muted)]/50",
              isDimmed && "opacity-30",
              step.result === "error" &&
                "bg-[var(--signal-bg-danger-muted)]/30",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive
                  ? "text-[var(--signal-fg-success)]"
                  : step.result === "error"
                    ? "text-[var(--signal-fg-danger)]"
                    : isDimmed
                      ? "text-[var(--signal-fg-tertiary)]/30"
                      : "text-[var(--signal-fg-tertiary)]",
              )}
            />
            <span
              className={cn(
                "flex-1 font-medium",
                isActive
                  ? "text-[var(--signal-fg-success)]"
                  : isDimmed
                    ? "text-[var(--signal-fg-tertiary)]/30"
                    : "text-[var(--signal-fg-primary)]",
              )}
            >
              {step.label}
            </span>
            <ResultDot result={step.result} />
            {step.latencyMs !== undefined && !isDimmed && (
              <span className="text-[10px] text-[var(--signal-fg-tertiary)] w-12 text-right">
                {step.latencyMs < 1
                  ? `${(step.latencyMs * 1000).toFixed(0)}μs`
                  : `${step.latencyMs.toFixed(2)}ms`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
