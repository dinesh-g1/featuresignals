"use client";

/**
 * @legacy Use `VisualRuleBuilder` from `@/components/visual-rule-builder` instead.
 * This component is retained for backward compatibility and the "Simple editor"
 * toggle option. It will be removed in a future major version.
 *
 * Migration: Replace `<TargetingRulesEditor>` with `<VisualRuleBuilder>` —
 * the Props interface is identical.
 */

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { FieldHelp } from "@/components/field-help";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  XIcon,
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import type { Condition, TargetingRule } from "@/lib/types";

interface Props {
  rules: TargetingRule[];
  segments: { key: string; name: string }[];
  flagType: string;
  onSave: (rules: TargetingRule[]) => Promise<void>;
}

const OPERATORS = [
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

function ValueInput({
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

export function TargetingRulesEditor({
  rules: initialRules,
  segments,
  flagType,
  onSave,
}: Props) {
  const [rules, setRules] = useState<TargetingRule[]>(
    initialRules.length > 0 ? initialRules : [],
  );
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function updateRule(id: string, patch: Partial<TargetingRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function addRule() {
    const maxPriority = rules.reduce((m, r) => Math.max(m, r.priority), 0);
    const rule = emptyRule(maxPriority + 1);
    setRules((prev) => [...prev, rule]);
    setExpandedRule(rule.id);
    setDirty(true);
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  }

  function addCondition(ruleId: string) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: [...r.conditions, emptyCondition()] }
          : r,
      ),
    );
    setDirty(true);
  }

  function updateCondition(
    ruleId: string,
    idx: number,
    patch: Partial<Condition>,
  ) {
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
  }

  function removeCondition(ruleId: string, idx: number) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter((_, i) => i !== idx) }
          : r,
      ),
    );
    setDirty(true);
  }

  function toggleSegment(ruleId: string, segKey: string) {
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
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(rules);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--signal-fg-secondary)]">
          Targeting Rules ({rules.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-3 py-1.5 text-sm font-medium text-[var(--signal-fg-accent)] shadow-sm transition-all duration-150 hover:bg-[var(--signal-bg-accent-muted)] hover:shadow-md"
          >
            <PlusIcon className="h-4 w-4" />
            Add Rule
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--signal-bg-accent-emphasis)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[var(--signal-bg-accent-emphasis)]-dark hover:shadow-md disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Rules"}
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--signal-border-emphasis)] px-6 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-secondary)] ring-1 ring-slate-100">
            <PlusIcon className="h-5 w-5 text-[var(--signal-fg-tertiary)]" />
          </div>
          <p className="mt-2 text-sm text-[var(--signal-fg-secondary)]">
            No targeting rules configured.
          </p>
          <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
            Click &ldquo;Add Rule&rdquo; to target specific users or segments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => {
              const isExpanded = expandedRule === rule.id;
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-xl border bg-white transition-all duration-200",
                    isExpanded
                      ? "border-[var(--signal-border-accent-muted)] ring-2 ring-accent/10 shadow-md"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)] hover:shadow-sm",
                  )}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer"
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)] ring-1 ring-accent/10">
                        {rule.priority}
                      </span>
                      <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                        {rule.description || "Unnamed rule"}
                      </span>
                      <span className="text-xs text-[var(--signal-fg-tertiary)]">
                        {rule.conditions.length} condition
                        {rule.conditions.length !== 1 ? "s" : ""}
                        {(rule.segment_keys?.length ?? 0) > 0 &&
                          ` · ${rule.segment_keys!.length} segment${rule.segment_keys!.length !== 1 ? "s" : ""}`}
                        {` · ${(rule.percentage / 100).toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRule(rule.id);
                        }}
                        className="rounded-lg p-1 text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-danger-muted)] hover:text-red-500"
                        title="Delete rule"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-5 animate-fade-in">
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
                            value={rule.description}
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

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-[var(--signal-fg-secondary)]">
                              Conditions
                            </label>
                            <FieldHelp docsKey="targeting" label="conditions" />
                            <Select
                              value={rule.match_type || "all"}
                              onValueChange={(val) =>
                                updateRule(rule.id, { match_type: val })
                              }
                              options={MATCH_TYPE_OPTIONS}
                              size="sm"
                            />
                          </div>
                          <button
                            onClick={() => addCondition(rule.id)}
                            className="text-xs font-medium text-[var(--signal-fg-accent)] hover:text-[var(--signal-fg-accent)]"
                          >
                            + Add Condition
                          </button>
                        </div>
                        {rule.conditions.length === 0 ? (
                          <p className="text-xs text-[var(--signal-fg-tertiary)] italic">
                            No conditions — rule matches all users.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {rule.conditions.map((cond, ci) => (
                              <div
                                key={ci}
                                className="flex items-center gap-2 rounded-lg bg-[var(--signal-bg-secondary)] p-2 ring-1 ring-slate-100"
                              >
                                <input
                                  type="text"
                                  value={cond.attribute}
                                  onChange={(e) =>
                                    updateCondition(rule.id, ci, {
                                      attribute: e.target.value,
                                    })
                                  }
                                  placeholder="attribute (e.g. plan)"
                                  aria-label="Condition attribute"
                                  className="w-36 rounded-lg border border-[var(--signal-border-default)] bg-white px-2 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                                />
                                <Select
                                  value={cond.operator}
                                  onValueChange={(val) =>
                                    updateCondition(rule.id, ci, {
                                      operator: val,
                                    })
                                  }
                                  options={OPERATORS}
                                  size="sm"
                                />
                                <input
                                  type="text"
                                  value={cond.values.join(", ")}
                                  onChange={(e) =>
                                    updateCondition(rule.id, ci, {
                                      values: e.target.value
                                        .split(",")
                                        .map((v) => v.trim()),
                                    })
                                  }
                                  placeholder="value(s), comma-separated"
                                  className="flex-1 rounded-lg border border-[var(--signal-border-default)] bg-white px-2 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                                />
                                <button
                                  onClick={() => removeCondition(rule.id, ci)}
                                  className="rounded-lg p-1 text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-danger-muted)] hover:text-red-500"
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {segments.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-2">
                            Target Segments
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {segments.map((seg) => {
                              const active = (rule.segment_keys ?? []).includes(
                                seg.key,
                              );
                              return (
                                <button
                                  key={seg.key}
                                  onClick={() =>
                                    toggleSegment(rule.id, seg.key)
                                  }
                                  className={cn(
                                    "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                                    active
                                      ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-1 ring-accent/30 shadow-sm"
                                      : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
                                  )}
                                >
                                  {seg.name || seg.key}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                            Rollout %
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
                              className="flex-1 accent-accent"
                            />
                            <span className="rounded-lg bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-xs font-mono font-semibold text-[var(--signal-fg-accent)] ring-1 ring-accent/10">
                              {(rule.percentage / 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                            Value when matched
                          </label>
                          <ValueInput
                            flagType={flagType}
                            value={rule.value}
                            onChange={(v) => updateRule(rule.id, { value: v })}
                          />
                        </div>
                      </div>
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
