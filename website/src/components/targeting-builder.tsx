"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  TrashIcon,
  ZapIcon,
  ChevronRightIcon,
  CheckIcon,
  AlertIcon,
} from "@primer/octicons-react";
import {
  evaluateFlag,
  type FlagRule,
  type TargetingRule,
  type EvaluationResult,
  type EvaluationContext,
} from "@/lib/eval-engine";

const ATTRIBUTES = [
  { value: "plan", label: "Plan" },
  { value: "country", label: "Country" },
  { value: "beta", label: "Beta Tester" },
  { value: "email", label: "Email Domain" },
  { value: "userId", label: "User ID" },
];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "in", label: "is in" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
] as const;

const DEMO_CONTEXT: EvaluationContext = {
  userId: "usr_demo_42",
  email: "developer@enterprise.co",
  plan: "enterprise",
  country: "US",
  beta: true,
};

interface DraftRule {
  attribute: string;
  operator: (typeof OPERATORS)[number]["value"];
  value: string;
  serveValue: string;
}

const EMPTY_RULE: DraftRule = {
  attribute: "plan",
  operator: "equals",
  value: "",
  serveValue: "true",
};

function parseServeValue(raw: string, type: string): boolean | string | number | Record<string, unknown> {
  if (type === "boolean") return raw === "true";
  if (type === "number") return Number(raw);
  if (type === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function parseRuleValue(raw: string, attribute: string, operator: string): string | number | boolean | string[] {
  if (operator === "in") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (attribute === "beta") return raw === "true";
  return raw;
}

export function TargetingBuilder() {
  const [rules, setRules] = useState<TargetingRule[]>([]);
  const [draft, setDraft] = useState<DraftRule>({ ...EMPTY_RULE });
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [addError, setAddError] = useState<string | null>(null);

  // Build flag from rules + enabled state
  const flag: FlagRule = useMemo(
    () => ({
      key: "new-checkout-flow",
      name: "New Checkout Flow",
      type: "boolean",
      enabled: flagEnabled,
      targeting: rules,
      defaultVariant: false,
    }),
    [rules, flagEnabled],
  );

  // Evaluate against demo context
  const evalResult: EvaluationResult = useMemo(
    () => evaluateFlag(flag, DEMO_CONTEXT),
    [flag],
  );

  const addRule = useCallback(() => {
    setAddError(null);
    if (!draft.value.trim()) {
      setAddError("Value is required");
      return;
    }

    const newRule: TargetingRule = {
      attribute: draft.attribute,
      operator: draft.operator,
      value: parseRuleValue(draft.value, draft.attribute, draft.operator),
      serveValue: parseServeValue(draft.serveValue, "boolean"),
    };

    setRules((prev) => [...prev, newRule]);
    setDraft({ ...EMPTY_RULE });
  }, [draft]);

  const removeRule = useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isEnabled = evalResult.enabled;
  const matchedRuleIndex = evalResult.matchedRule
    ? rules.indexOf(evalResult.matchedRule)
    : -1;

  return (
    <div
      className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-6 sm:p-8"
      style={{ boxShadow: "var(--signal-shadow-lg)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--signal-bg-info-muted)]">
            <ZapIcon size={16} fill="var(--signal-fg-info)" />
          </div>
          <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
            Targeting Rules
          </h3>
        </div>
        {/* Enable/disable toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--signal-fg-tertiary)]">
            Flag is
          </span>
          <button
            onClick={() => setFlagEnabled((p) => !p)}
            role="switch"
            aria-checked={flagEnabled}
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
      </div>

      {/* Rule builder form */}
      <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 mb-4">
        <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-3">
          Add Rule
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {/* Attribute */}
          <select
            value={draft.attribute}
            onChange={(e) => setDraft((d) => ({ ...d, attribute: e.target.value }))}
            className="rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-2 text-xs font-medium text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
          >
            {ATTRIBUTES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={draft.operator}
            onChange={(e) => setDraft((d) => ({ ...d, operator: e.target.value as DraftRule["operator"] }))}
            className="rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-2 text-xs font-medium text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value */}
          <input
            type="text"
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRule();
              }
            }}
            placeholder={
              draft.operator === "in"
                ? "US, CA, GB"
                : draft.attribute === "plan"
                  ? "enterprise"
                  : "value"
            }
            className="rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-2 text-xs font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
          />

          {/* Serve value */}
          <select
            value={draft.serveValue}
            onChange={(e) => setDraft((d) => ({ ...d, serveValue: e.target.value }))}
            className="rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-2 text-xs font-medium text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
          >
            <option value="true">Serve ON</option>
            <option value="false">Serve OFF</option>
          </select>
        </div>

        {addError && (
          <p className="text-xs text-[var(--signal-fg-danger)] mb-2 flex items-center gap-1">
            <AlertIcon size={12} />
            {addError}
          </p>
        )}

        <button
          onClick={addRule}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--signal-fg-accent)] hover:bg-[#0757ba] transition-colors duration-150"
        >
          <PlusIcon size={14} />
          Add Rule
        </button>
      </div>

      {/* Rules list */}
      <div className="space-y-2 mb-5">
        <AnimatePresence>
          {rules.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-xs text-[var(--signal-fg-tertiary)]"
            >
              No targeting rules yet. Add a rule above to see it take effect.
            </motion.div>
          ) : (
            rules.map((rule, i) => (
              <motion.div
                key={`${rule.attribute}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                  i === matchedRuleIndex
                    ? "border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-muted)]"
                    : "border-[var(--signal-border-default)] bg-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {i === matchedRuleIndex && (
                    <CheckIcon size={14} fill="var(--signal-fg-success)" />
                  )}
                  <span className="font-medium text-[var(--signal-fg-primary)] shrink-0">
                    IF
                  </span>
                  <span className="font-mono text-[var(--signal-fg-accent)] truncate">
                    {rule.attribute}
                  </span>
                  <span className="text-[var(--signal-fg-tertiary)] shrink-0">
                    {rule.operator}
                  </span>
                  <span className="font-mono text-[var(--signal-fg-info)] truncate">
                    {JSON.stringify(rule.value)}
                  </span>
                  <span className="text-[var(--signal-fg-secondary)] shrink-0">→</span>
                  <span
                    className={`font-semibold shrink-0 ${
                      rule.serveValue
                        ? "text-[var(--signal-fg-success)]"
                        : "text-[var(--signal-fg-danger)]"
                    }`}
                  >
                    {rule.serveValue ? "ON" : "OFF"}
                  </span>
                </div>
                <button
                  onClick={() => removeRule(i)}
                  className="ml-2 p-1 rounded text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)] transition-colors shrink-0"
                  aria-label="Remove rule"
                >
                  <TrashIcon size={14} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Live evaluation display */}
      <div
        className={`rounded-xl p-4 mb-5 ${
          isEnabled
            ? "bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]"
            : "bg-[var(--signal-bg-danger-muted)] border border-[var(--borderColor-danger-muted)]"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
            Live Evaluation
          </span>
          <motion.span
            key={evalResult.latencyMs}
            initial={{ scale: 1.2, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]"
          >
            <ZapIcon size={10} />
            {evalResult.latencyMs.toFixed(2)}ms
          </motion.span>
        </div>

        <div
          className={`text-xl font-bold mb-1 ${
            isEnabled
              ? "text-[var(--signal-fg-success)]"
              : "text-[var(--signal-fg-danger)]"
          }`}
        >
          {isEnabled ? "✅ ENABLED" : "❌ DISABLED"}
        </div>
        <div className="text-xs text-[var(--signal-fg-secondary)]">
          Context: plan=<span className="font-mono font-semibold">{DEMO_CONTEXT.plan}</span>,
          country=<span className="font-mono font-semibold">{DEMO_CONTEXT.country}</span>
        </div>
        <div className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
          {evalResult.reason}
        </div>
      </div>

      {/* CTA */}
      <a
        href="/rollout"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-fg-accent)] hover:bg-[#0757ba] transition-colors duration-150"
      >
        Roll it out gradually
        <ChevronRightIcon size={16} />
      </a>
    </div>
  );
}
