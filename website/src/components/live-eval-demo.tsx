"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ZapIcon } from "@primer/octicons-react";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  evaluateFlag,
  createTempFlag,
  DEMO_FLAG,
  DEMO_CONTEXT,
  type FlagRule,
  type EvaluationContext,
  type EvaluationResult,
} from "@/lib/eval-engine";

function LatencyBadge({ latencyMs }: { latencyMs: number }) {
  const isSubMs = latencyMs < 1;
  return (
    <motion.span
      key={latencyMs}
      initial={{ scale: 1.2, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      suppressHydrationWarning
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold tabular-nums ${
        isSubMs
          ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
          : "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]"
      }`}
    >
      <ZapIcon size={12} />
      {latencyMs.toFixed(2)}ms
      {isSubMs && (
        <span className="text-[10px] font-normal">(sub-millisecond ✓)</span>
      )}
    </motion.span>
  );
}

export function LiveEvalDemo() {
  const [flagEnabled, setFlagEnabled] = useState(DEMO_FLAG.enabled);
  const [customKey, setCustomKey] = useState("");
  // Stable default for SSR — real evaluation computed in useEffect below
  const [evalResult, setEvalResult] = useState<EvaluationResult>({
    flagKey: DEMO_FLAG.key,
    value: DEMO_FLAG.defaultVariant as boolean,
    matchedRule: null,
    reason: "Loading…",
    latencyMs: 0,
    enabled: Boolean(DEMO_FLAG.defaultVariant),
  });

  // Compute real evaluation on mount (performance.now() doesn't exist server-side)
  useEffect(() => {
    setEvalResult(evaluateFlag(DEMO_FLAG, DEMO_CONTEXT));
  }, []);
  const [lastEvalKey, setLastEvalKey] = useState(DEMO_FLAG.key);

  // The currently active flag (demo flag or temp custom flag)
  const flag: FlagRule = useMemo(() => {
    if (customKey.trim()) {
      return createTempFlag(customKey.trim(), flagEnabled);
    }
    return { ...DEMO_FLAG, enabled: flagEnabled };
  }, [flagEnabled, customKey]);

  const handleToggle = useCallback(() => {
    setFlagEnabled((prev) => !prev);
  }, []);

  // Re-evaluate whenever flag changes
  const handleEvaluate = useCallback(() => {
    const result = evaluateFlag(flag, DEMO_CONTEXT);
    setEvalResult(result);
    setLastEvalKey(flag.key);
  }, [flag]);

  // Auto-evaluate on flag toggle or custom key change
  const handleToggleAndEval = useCallback(() => {
    setFlagEnabled((prev) => {
      const next = !prev;
      const updatedFlag = { ...flag, enabled: next };
      const result = evaluateFlag(updatedFlag, DEMO_CONTEXT);
      setEvalResult(result);
      setLastEvalKey(updatedFlag.key);
      return next;
    });
  }, [flag]);

  const handleCustomKeySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!customKey.trim()) return;
      const tempFlag = createTempFlag(customKey.trim(), flagEnabled);
      const result = evaluateFlag(tempFlag, DEMO_CONTEXT);
      setEvalResult(result);
      setLastEvalKey(tempFlag.key);
    },
    [customKey, flagEnabled],
  );

  const isEnabled = evalResult.enabled;
  const matchedRule = evalResult.matchedRule;

  return (
    <section
      id="live-demo"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)] border-y border-[var(--signal-border-subtle)]"
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="demo-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Sub-millisecond. In your browser. Right now.
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 max-w-2xl mx-auto">
            This is real flag evaluation. No server. No API call. No &ldquo;it
            depends on your setup.&rdquo; Toggle the switch and watch the result
            come back in under a millisecond. The same engine our SDKs run. The
            same one your app would use.
          </p>
        </div>

        {/* Split panel: Code + Result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code Editor */}
          <CodeEditor flagKey={lastEvalKey} defaultLanguage="node" />

          {/* Right: Evaluation Result */}
          <div
            className="rounded-xl border border-[var(--signal-border-default)] bg-white p-6"
            style={{ boxShadow: "var(--signal-shadow-sm)" }}
          >
            <h3 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-5">
              Evaluation Result
            </h3>

            {/* Flag key */}
            <div className="mb-4">
              <div className="text-xs text-[var(--signal-fg-tertiary)] mb-1">
                Flag
              </div>
              <div className="text-lg font-mono font-bold text-[var(--signal-fg-primary)]">
                {evalResult.flagKey}
              </div>
            </div>

            {/* Result display */}
            <motion.div
              key={String(isEnabled) + String(evalResult.latencyMs)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl p-5 mb-4 ${
                isEnabled
                  ? "bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]"
                  : "bg-[var(--signal-bg-danger-muted)] border border-[var(--borderColor-danger-muted)]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
                  Result
                </div>
                <LatencyBadge latencyMs={evalResult.latencyMs} />
              </div>

              <div
                className={`text-2xl font-bold ${
                  isEnabled
                    ? "text-[var(--signal-fg-success)]"
                    : "text-[var(--signal-fg-danger)]"
                }`}
              >
                {isEnabled ? "✅ ENABLED" : "❌ DISABLED"}
              </div>

              {/* Reason */}
              <div className="text-sm text-[var(--signal-fg-secondary)] mt-2">
                {evalResult.reason}
              </div>

              {/* Matched rule highlight */}
              {matchedRule && (
                <div className="mt-3 p-3 rounded-lg bg-white/60 border border-[var(--signal-border-subtle)]">
                  <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] mb-1">
                    Matched Rule
                  </div>
                  <div className="text-sm font-mono text-[var(--signal-fg-primary)]">
                    {matchedRule.attribute}{" "}
                    <span className="text-[var(--signal-fg-accent)]">
                      {matchedRule.operator}
                    </span>{" "}
                    <span className="text-[var(--signal-fg-info)]">
                      {JSON.stringify(matchedRule.value)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-subtle)] mb-4">
              <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                Toggle this flag
              </span>
              <button
                onClick={handleToggleAndEval}
                role="switch"
                aria-checked={flagEnabled}
                aria-label={`Flag ${flagEnabled ? "enabled" : "disabled"}. Click to toggle.`}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:ring-offset-2 ${
                  flagEnabled
                    ? "bg-[var(--signal-bg-success-emphasis)]"
                    : "bg-[var(--signal-border-default)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
                    flagEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Try your own flag */}
            <form onSubmit={handleCustomKeySubmit}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Try your own flag key..."
                  className="flex-1 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
                  aria-label="Custom flag key"
                />
                <button
                  type="submit"
                  disabled={!customKey.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--signal-fg-accent)] hover:bg-[#0757ba] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Evaluate
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
