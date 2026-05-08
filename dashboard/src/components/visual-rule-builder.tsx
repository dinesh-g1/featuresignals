"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  AlertTriangle,
  Info,
  ArrowUp,
  ArrowDown,
  X,
  Check,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Condition, TargetingRule } from "@/lib/types";
import {
  detectConflicts,
  getConflictsForRule,
  type Conflict,
  type SampleUser,
  evaluateRule,
} from "./rule-conflict-detector";
import { RuleLivePreview, SAMPLE_USERS } from "./rule-live-preview";

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  rules: TargetingRule[];
  segments: { key: string; name: string }[];
  flagType: string;
  onSave: (rules: TargetingRule[]) => Promise<void>;
  /** Optional override for sample users (useful in tests) */
  sampleUsers?: SampleUser[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const ALL_OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "in", label: "in list" },
  { value: "notIn", label: "not in list" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "regex", label: "matches regex" },
  { value: "exists", label: "exists" },
];

const MATCH_TYPE_OPTIONS = [
  { value: "all", label: "Match ALL" },
  { value: "any", label: "Match ANY" },
];

const BOOLEAN_OPTIONS = [
  { value: "true", label: "true" },
  { value: "false", label: "false" },
];

/**
 * Smart operator suggestions based on the attribute name.
 * Inspired by Airtable/Notion filter UX — the operators that make sense
 * for a given attribute type are shown first/promoted.
 */
function getSuggestedOperators(
  attribute: string,
): { value: string; label: string }[] {
  const attr = attribute.toLowerCase().trim();

  // Email attributes
  if (attr.includes("email")) {
    return ALL_OPERATORS.filter((op) =>
      ["eq", "neq", "contains", "startsWith", "endsWith", "exists"].includes(
        op.value,
      ),
    );
  }

  // String identifiers (id, key, name, slug, etc.)
  if (
    attr.includes("id") ||
    attr.includes("key") ||
    attr.includes("name") ||
    attr.includes("slug") ||
    attr === "country" ||
    attr === "plan" ||
    attr === "tier"
  ) {
    return ALL_OPERATORS.filter((op) =>
      ["eq", "neq", "in", "notIn", "exists"].includes(op.value),
    );
  }

  // Numeric attributes
  if (
    attr.includes("age") ||
    attr.includes("count") ||
    attr.includes("score") ||
    attr.includes("number") ||
    attr.includes("price") ||
    attr.includes("amount")
  ) {
    return ALL_OPERATORS.filter((op) =>
      ["eq", "neq", "gt", "gte", "lt", "lte", "exists"].includes(op.value),
    );
  }

  // Boolean attributes
  if (attr.includes("beta") || attr.includes("flag") || attr.includes("enabled")) {
    return ALL_OPERATORS.filter((op) =>
      ["eq", "neq", "exists"].includes(op.value),
    );
  }

  // Default: all operators
  return ALL_OPERATORS;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRule(priority: number): TargetingRule {
  return {
    id: generateId(),
    priority,
    description: "",
    conditions: [],
    segment_keys: [],
    percentage: 10000,
    value: true,
    match_type: "all",
  };
}

function emptyCondition(): Condition {
  return { attribute: "", operator: "eq", values: [""] };
}

// ── Sub-component: ServeValueInput ──────────────────────────────────────────

function ServeValueInput({
  flagType,
  value,
  onChange,
}: {
  flagType: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (flagType === "boolean") {
    return (
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(v === "true")}
        options={BOOLEAN_OPTIONS}
        size="sm"
      />
    );
  }

  if (flagType === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-32 rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
      />
    );
  }

  if (flagType === "json") {
    return (
      <textarea
        value={
          typeof value === "string" ? value : JSON.stringify(value, null, 2)
        }
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        rows={2}
        className="w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
        placeholder='{"key": "value"}'
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
      placeholder="Value when rule matches"
    />
  );
}

// ── Sub-component: ConflictBadge ────────────────────────────────────────────

function ConflictBadge({ conflict }: { conflict: Conflict }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
        conflict.severity === "warning"
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
      )}
      role="alert"
    >
      {conflict.severity === "warning" ? (
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      ) : (
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      )}
      <div>
        <p className="font-medium">{conflict.message}</p>
        {conflict.detail && (
          <p className="mt-0.5 opacity-75">{conflict.detail}</p>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: DeleteConfirmPopover ─────────────────────────────────────

function DeleteConfirmPopover({
  onConfirm,
  children,
}: {
  onConfirm: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-lg p-1.5 text-[var(--signal-fg-tertiary)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
        title="Delete rule"
        aria-label="Delete rule"
      >
        {children}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-red-500 font-medium">Delete?</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
          setOpen(false);
        }}
        className="rounded-lg p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
        aria-label="Confirm delete"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
        className="rounded-lg p-1 text-[var(--signal-fg-tertiary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
        aria-label="Cancel delete"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function VisualRuleBuilder({
  rules: initialRules,
  segments,
  flagType,
  onSave,
  sampleUsers = SAMPLE_USERS,
}: Props) {
  const [rules, setRules] = useState<TargetingRule[]>(
    initialRules.length > 0 ? initialRules : [],
  );
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Per-rule live preview expansion
  const [previewExpanded, setPreviewExpanded] = useState<Set<string>>(
    new Set(),
  );

  // ── Conflict detection (memoized) ─────────────────────────────────────────
  const conflicts = useMemo(
    () => detectConflicts(rules, sampleUsers),
    [rules, sampleUsers],
  );

  // ── Rule CRUD ─────────────────────────────────────────────────────────────

  const updateRule = useCallback((id: string, patch: Partial<TargetingRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }, []);

  const addRule = useCallback(() => {
    const maxPriority = rules.reduce((m, r) => Math.max(m, r.priority), 0);
    const rule = emptyRule(maxPriority + 1);
    setRules((prev) => [...prev, rule]);
    setExpandedRule(rule.id);
    setDirty(true);
  }, [rules]);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  }, []);

  const moveRule = useCallback(
    (id: string, direction: "up" | "down") => {
      setRules((prev) => {
        const sorted = [...prev].sort((a, b) => a.priority - b.priority);
        const idx = sorted.findIndex((r) => r.id === id);
        if (idx === -1) return prev;

        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

        // Swap priorities
        const temp = sorted[idx].priority;
        sorted[idx] = { ...sorted[idx], priority: sorted[swapIdx].priority };
        sorted[swapIdx] = { ...sorted[swapIdx], priority: temp };

        // Re-sort
        sorted.sort((a, b) => a.priority - b.priority);
        return sorted;
      });
      setDirty(true);
    },
    [],
  );

  // ── Condition CRUD ────────────────────────────────────────────────────────

  const addCondition = useCallback((ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: [...r.conditions, emptyCondition()] }
          : r,
      ),
    );
    setDirty(true);
  }, []);

  const updateCondition = useCallback(
    (ruleId: string, idx: number, patch: Partial<Condition>) => {
      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId
            ? {
                ...r,
                conditions: r.conditions.map((c, i) =>
                  i === idx ? { ...c, ...patch } : c,
                ),
              }
            : r,
        ),
      );
      setDirty(true);
    },
    [],
  );

  const removeCondition = useCallback((ruleId: string, idx: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter((_, i) => i !== idx) }
          : r,
      ),
    );
    setDirty(true);
  }, []);

  const toggleSegment = useCallback((ruleId: string, segKey: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const current = r.segment_keys ?? [];
        const keys = current.includes(segKey)
          ? current.filter((k) => k !== segKey)
          : [...current, segKey];
        return { ...r, segment_keys: keys };
      }),
    );
    setDirty(true);
  }, []);

  const togglePreview = useCallback((ruleId: string) => {
    setPreviewExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(rules);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [onSave, rules]);

  // ── Render ────────────────────────────────────────────────────────────────

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.priority - b.priority),
    [rules],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--signal-fg-secondary)]">
          Targeting Rules ({rules.length})
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-3 py-1.5 text-sm font-medium text-[var(--signal-fg-accent)] shadow-sm transition-all duration-150 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--signal-bg-accent-emphasis)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Rules"}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--signal-border-emphasis)] px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--signal-bg-secondary)] ring-1 ring-[var(--signal-border-default)]">
            <Plus className="h-6 w-6 text-[var(--signal-fg-tertiary)]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--signal-fg-secondary)]">
            No targeting rules configured
          </p>
          <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
            Click &ldquo;Add Rule&rdquo; to create a visual rule block and
            target specific users.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRules.map((rule, ruleIndex) => {
            const isExpanded = expandedRule === rule.id;
            const ruleConflicts = getConflictsForRule(conflicts, rule.id);
            const isPreviewOpen = previewExpanded.has(rule.id);

            return (
              <div
                key={rule.id}
                className={cn(
                  "rounded-xl border bg-white transition-all duration-200",
                  isExpanded
                    ? "border-[var(--signal-border-accent-muted)] ring-2 ring-[var(--signal-border-accent-muted)]/20 shadow-md"
                    : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)] hover:shadow-sm",
                  ruleConflicts.some((c) => c.severity === "warning") &&
                    "ring-1 ring-amber-200 dark:ring-amber-800",
                )}
              >
                {/* ── Rule header ────────────────────────────────────────── */}
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedRule(isExpanded ? null : rule.id);
                    }
                  }}
                >
                  {/* Drag handle area + reorder buttons */}
                  <div className="flex items-center gap-0.5 mr-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(rule.id, "up");
                      }}
                      disabled={ruleIndex === 0}
                      className="rounded p-0.5 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] disabled:opacity-30 transition-colors"
                      aria-label="Move rule up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(rule.id, "down");
                      }}
                      disabled={ruleIndex === sortedRules.length - 1}
                      className="rounded p-0.5 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] disabled:opacity-30 transition-colors"
                      aria-label="Move rule down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <GripVertical className="h-4 w-4 text-[var(--signal-fg-tertiary)] ml-0.5" />
                  </div>

                  {/* Priority badge */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)] ring-1 ring-[var(--signal-border-accent-muted)]">
                    {rule.priority}
                  </span>

                  {/* Rule name */}
                  <span className="text-sm font-medium text-[var(--signal-fg-primary)] truncate">
                    {rule.description || "Unnamed rule"}
                  </span>

                  {/* Summary chips */}
                  <span className="hidden sm:inline text-xs text-[var(--signal-fg-tertiary)]">
                    {rule.conditions.length} condition
                    {rule.conditions.length !== 1 ? "s" : ""}
                    {(rule.segment_keys?.length ?? 0) > 0 &&
                      ` · ${rule.segment_keys!.length} segment${rule.segment_keys!.length !== 1 ? "s" : ""}`}
                    {` · ${(rule.percentage / 100).toFixed(0)}%`}
                  </span>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Conflict indicator */}
                  {ruleConflicts.length > 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        ruleConflicts.some((c) => c.severity === "warning")
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                      )}
                    >
                      {ruleConflicts.some((c) => c.severity === "warning") ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Info className="h-3 w-3" />
                      )}
                      {ruleConflicts.length}
                    </span>
                  )}

                  {/* Delete */}
                  <DeleteConfirmPopover onConfirm={() => removeRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </DeleteConfirmPopover>

                  {/* Expand/collapse chevron */}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>

                {/* ── Rule body (expanded) ────────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[var(--signal-border-default)] px-4 py-4 space-y-4 animate-fade-in">
                    {/* Conflict warnings */}
                    {ruleConflicts.length > 0 && (
                      <div className="space-y-1.5">
                        {ruleConflicts.map((c) => (
                          <ConflictBadge key={c.id} conflict={c} />
                        ))}
                      </div>
                    )}

                    {/* Priority + Description */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                          Priority
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={rule.priority}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              priority: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={rule.description ?? ""}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g. Beta testers, Premium users"
                          className="w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                        />
                      </div>
                    </div>

                    {/* Conditions section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={rule.match_type || "all"}
                            onValueChange={(val) =>
                              updateRule(rule.id, { match_type: val })
                            }
                            options={MATCH_TYPE_OPTIONS}
                            size="sm"
                          />
                          <span className="text-xs text-[var(--signal-fg-tertiary)]">
                            of the following conditions:
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addCondition(rule.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add condition
                        </button>
                      </div>

                      {rule.conditions.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[var(--signal-border-default)] px-4 py-3 text-center">
                          <p className="text-xs text-[var(--signal-fg-tertiary)]">
                            No conditions — this rule matches all users.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rule.conditions.map((cond, ci) => {
                            const suggestedOps = getSuggestedOperators(
                              cond.attribute,
                            );
                            return (
                              <div
                                key={ci}
                                className="group flex flex-wrap items-center gap-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-3 py-2 transition-colors hover:border-[var(--signal-border-emphasis)]"
                              >
                                {/* Attribute input */}
                                <input
                                  type="text"
                                  value={cond.attribute}
                                  onChange={(e) =>
                                    updateCondition(rule.id, ci, {
                                      attribute: e.target.value,
                                    })
                                  }
                                  placeholder="attribute"
                                  className="w-28 rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                                  aria-label={`Condition ${ci + 1} attribute`}
                                />

                                {/* Operator select */}
                                <Select
                                  value={cond.operator}
                                  onValueChange={(val) =>
                                    updateCondition(rule.id, ci, {
                                      operator: val,
                                    })
                                  }
                                  options={suggestedOps}
                                  size="sm"
                                />

                                {/* Values input */}
                                <input
                                  type="text"
                                  value={cond.values.join(", ")}
                                  onChange={(e) =>
                                    updateCondition(rule.id, ci, {
                                      values: e.target.value
                                        .split(",")
                                        .map((v) => v.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="value(s), comma-separated"
                                  className="flex-1 min-w-[120px] rounded-lg border border-[var(--signal-border-default)] bg-white px-2.5 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                                  aria-label={`Condition ${ci + 1} values`}
                                />

                                {/* Remove condition */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCondition(rule.id, ci)
                                  }
                                  className="rounded-lg p-1 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100"
                                  aria-label={`Remove condition ${ci + 1}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Segments */}
                    {segments.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-2">
                          Target Segments
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {segments.map((seg) => {
                            const active = (
                              rule.segment_keys ?? []
                            ).includes(seg.key);
                            return (
                              <button
                                key={seg.key}
                                type="button"
                                onClick={() =>
                                  toggleSegment(rule.id, seg.key)
                                }
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                                  active
                                    ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm"
                                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-primary)]",
                                )}
                              >
                                {seg.name || seg.key}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Serve value + Percentage */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Percentage slider */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                          Percentage rollout
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={10000}
                            step={100}
                            value={rule.percentage}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                percentage: parseInt(e.target.value),
                              })
                            }
                            className="flex-1 accent-[var(--signal-fg-accent)]"
                            aria-label="Percentage rollout"
                          />
                          <span className="rounded-lg bg-[var(--signal-bg-accent-muted)] px-2.5 py-0.5 text-xs font-mono font-semibold text-[var(--signal-fg-accent)] ring-1 ring-[var(--signal-border-accent-muted)] min-w-[3rem] text-center">
                            {(rule.percentage / 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Serve value */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                          Then serve
                        </label>
                        <ServeValueInput
                          flagType={flagType}
                          value={rule.value}
                          onChange={(v) =>
                            updateRule(rule.id, { value: v })
                          }
                        />
                      </div>
                    </div>

                    {/* ── Live Preview ───────────────────────────────────── */}
                    <RuleLivePreview
                      rule={rule}
                      sampleUsers={sampleUsers}
                      expanded={isPreviewOpen}
                      onToggle={() => togglePreview(rule.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
