"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlagToggle } from "@/hooks/use-flag-toggle";
import { ProductionSafetyGate } from "@/components/production-safety-gate";
import {
  ZapIcon,
  CheckIcon,
  ClockIcon,
  XCircleFillIcon,
  InfoIcon,
} from "@/components/icons/nav-icons";

interface EvalResult {
  flag_key: string;
  value: boolean;
  reason: string;
  latency_ms: number;
}

interface InstantFlagProps {
  flagKey: string;
  projectId: string;
  envId: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function InstantFlagToggle({
  flagKey,
  projectId,
  envId,
  enabled,
  onToggle,
  className,
}: InstantFlagProps) {
  const token = useAppStore((s) => s.token);
  const [toggling, setToggling] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Safety-gated toggle with evaluation refresh
  const {
    toggle: instantToggle,
    gateOpen: instantGateOpen,
    closeGate: closeInstantGate,
    gateContext: instantGateContext,
    gateAction: instantGateAction,
    handleGateConfirm: handleInstantGateConfirm,
  } = useFlagToggle(projectId, envId, () => {
    // After toggle, evaluate and notify parent with flipped state
    doEvaluate();
    onToggle(!enabled);
  });

  const doEvaluate = useCallback(async () => {
    if (!token) return;
    setEvalLoading(true);
    setEvalError(null);
    const start = performance.now();
    try {
      const results = await api.inspectTarget(token, projectId, envId, {
        key: "demo-user-123",
        attributes: {},
      });
      const latency = Math.round(performance.now() - start);
      const match = results?.find((r) => r.flag_key === flagKey);
      if (match) {
        setEvalResult({
          flag_key: match.flag_key,
          value: Boolean(match.value),
          reason: match.reason,
          latency_ms: latency,
        });
      } else {
        setEvalError(
          "Flag not found in evaluation results. It may still be initializing.",
        );
      }
    } catch (err: unknown) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to evaluate flag",
      );
    } finally {
      setEvalLoading(false);
    }
  }, [token, projectId, envId, flagKey]);

  // Evaluate on mount
  useEffect(() => {
    if (token && projectId && envId) {
      doEvaluate();
    }
  }, [token, projectId, envId, doEvaluate]);

  const handleToggle = useCallback(
    async (_checked: boolean) => {
      if (!token) return;
      setToggling(true);
      setEvalError(null);
      try {
        // The useFlagToggle hook handles the API call and safety gate.
        // We pass isProduction: false for onboarding (always non-production).
        await instantToggle({
          flagKey,
          flagName: flagKey,
          envName: "Development",
          isProduction: false,
        });
      } catch (err: unknown) {
        setEvalError(
          err instanceof Error ? err.message : "Failed to toggle flag",
        );
      } finally {
        setToggling(false);
      }
    },
    [token, flagKey, instantToggle],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Big Toggle */}
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm font-medium text-[var(--signal-fg-secondary)]">
          Toggle{" "}
          <code className="bg-[var(--signal-bg-secondary)] px-1.5 py-0.5 rounded text-[var(--signal-fg-accent)] font-mono text-[13px]">
            {flagKey}
          </code>
        </p>

        <div className="flex items-center gap-4">
          {/* Satisfying big toggle */}
          <button
            type="button"
            onClick={() => !toggling && handleToggle(!enabled)}
            disabled={toggling}
            className={cn(
              "relative inline-flex h-16 w-28 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-300 ease-out",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--signal-fg-accent)]/30 focus-visible:ring-offset-2",
              "disabled:cursor-wait disabled:opacity-70",
              enabled
                ? "border-[#1f883d] bg-[#1f883d] shadow-[0_0_20px_rgba(31,136,61,0.3)]"
                : "border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]",
            )}
            aria-label={`Toggle ${flagKey} ${enabled ? "off" : "on"}`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={cn(
                "pointer-events-none flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-out",
                enabled ? "translate-x-[3.25rem]" : "translate-x-1.5",
              )}
            >
              {toggling ? (
                <svg
                  className="h-5 w-5 animate-spin text-[var(--signal-fg-secondary)]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : enabled ? (
                <CheckIcon className="h-6 w-6 text-[#1f883d]" />
              ) : (
                <span className="h-3 w-3 rounded-full bg-[var(--signal-border-emphasis)]" />
              )}
            </span>
          </button>

          {/* Status label */}
          <div className="flex flex-col items-start">
            <span
              className={cn(
                "text-lg font-bold transition-colors duration-300",
                enabled ? "text-[#1f883d]" : "text-[var(--signal-fg-secondary)]",
              )}
            >
              {enabled ? "ON" : "OFF"}
            </span>
            <span className="text-xs text-[var(--signal-fg-tertiary)]">
              for demo-user-123
            </span>
          </div>
        </div>
      </div>

      {/* Production Safety Gate */}
      <ProductionSafetyGate
        open={instantGateOpen}
        onOpenChange={(open) => {
          if (!open) closeInstantGate();
        }}
        onConfirm={handleInstantGateConfirm}
        flagName={instantGateContext?.flagName ?? ""}
        flagKey={instantGateContext?.flagKey ?? ""}
        action={instantGateAction}
      />

      {/* Evaluation Result */}
      <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)] mb-3">
          <ZapIcon className="h-3.5 w-3.5" />
          Live Evaluation Result
        </h4>

        {evalLoading && !evalResult && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {evalError && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] px-3 py-2.5 text-sm text-[var(--signal-fg-danger)]">
            <XCircleFillIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{evalError}</p>
          </div>
        )}

        {evalResult && !evalLoading && (
          <div className="animate-scale-in space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--signal-fg-secondary)]">
                Flag Key
              </span>
              <code className="text-sm font-medium text-[var(--signal-fg-primary)] font-mono">
                {evalResult.flag_key}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--signal-fg-secondary)]">Value</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  evalResult.value
                    ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                )}
              >
                {evalResult.value ? (
                  <CheckIcon className="h-3 w-3" />
                ) : (
                  <span className="h-3 w-3" />
                )}
                {String(evalResult.value)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--signal-fg-secondary)]">
                Matched Rule
              </span>
              <span className="text-sm font-medium text-[var(--signal-fg-primary)] capitalize">
                {evalResult.reason.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-[var(--signal-fg-secondary)]">
                <ClockIcon className="h-3 w-3" />
                Latency
              </span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
                  evalResult.latency_ms < 5
                    ? "text-[var(--signal-fg-success)]"
                    : evalResult.latency_ms < 20
                      ? "text-[var(--signal-fg-warning)]"
                      : "text-[var(--signal-fg-danger)]",
                )}
              >
                {evalResult.latency_ms}ms
              </span>
            </div>
          </div>
        )}
      </div>

      {evalLoading && evalResult && (
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--signal-fg-tertiary)]">
          <svg
            className="h-3 w-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Re-evaluating...
        </div>
      )}
    </div>
  );
}

/* ── What Just Happened? ─────────────────────────────────────────── */

interface WhatHappenedProps {
  flagKey: string;
  evalResult: EvalResult | null;
  className?: string;
}

export function WhatJustHappened({
  flagKey,
  evalResult,
  className,
}: WhatHappenedProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-emphasis)] text-[10px] font-bold text-white">
            1
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
              Your app requests a flag evaluation
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
              <code className="bg-[var(--signal-bg-primary)] px-1 py-0.5 rounded text-[var(--signal-fg-accent)] font-mono text-[11px]">
                client.isEnabled(&quot;{flagKey}&quot;, &#123; key:
                &quot;demo-user-123&quot; &#125;)
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-emphasis)] text-[10px] font-bold text-white">
            2
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
              The SDK sends the request to FeatureSignals
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
              Over HTTPS, authenticated with your API key. The request includes
              the flag key and user identifier.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-emphasis)] text-[10px] font-bold text-white">
            3
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
              FeatureSignals evaluates the flag
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
              The evaluation engine checks targeting rules, percentage rollouts,
              and the flag&apos;s default value — all in under a millisecond.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-emphasis)] text-[10px] font-bold text-white">
            4
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
              Your app receives the result
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
              A simple boolean:{" "}
              <code className="bg-[var(--signal-bg-success-muted)] px-1 py-0.5 rounded text-[var(--signal-fg-success)] font-mono text-[11px]">
                true
              </code>{" "}
              or{" "}
              <code className="bg-[var(--signal-bg-secondary)] px-1 py-0.5 rounded text-[var(--signal-fg-secondary)] font-mono text-[11px]">
                false
              </code>
              . No deployment needed. The flag can be toggled at any time.
            </p>
          </div>
        </div>
      </div>

      {evalResult && (
        <div className="animate-scale-in rounded-xl border border-[var(--signal-fg-accent)]/20 bg-[var(--signal-bg-accent-muted)] p-4">
          <div className="flex items-center gap-2">
            <InfoIcon className="h-4 w-4 text-[var(--signal-fg-accent)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--signal-fg-accent)]">
                Your last evaluation returned{" "}
                <span className="font-bold">{String(evalResult.value)}</span>
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                Flag{" "}
                <code className="font-mono text-[11px]">
                  {evalResult.flag_key}
                </code>{" "}
                matched rule{" "}
                <span className="font-medium">
                  &ldquo;{evalResult.reason.replace(/_/g, " ")}&rdquo;
                </span>{" "}
                in {evalResult.latency_ms}ms
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
