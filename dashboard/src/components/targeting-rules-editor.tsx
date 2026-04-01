"use client";

import { useState } from "react";

interface Condition {
  attribute: string;
  operator: string;
  values: string[];
}

interface TargetingRule {
  id: string;
  priority: number;
  description: string;
  conditions: Condition[];
  segment_keys: string[];
  percentage: number;
  value: unknown;
  match_type: string;
}

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
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "true")}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (flagType === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    );
  }
  if (flagType === "json") {
    return (
      <textarea
        value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        placeholder='{"key": "value"}'
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      placeholder="Value when rule matches"
    />
  );
}

export function TargetingRulesEditor({ rules: initialRules, segments, flagType, onSave }: Props) {
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
        r.id === ruleId ? { ...r, conditions: [...r.conditions, emptyCondition()] } : r,
      ),
    );
    setDirty(true);
  }

  function updateCondition(ruleId: string, idx: number, patch: Partial<Condition>) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)) }
          : r,
      ),
    );
    setDirty(true);
  }

  function removeCondition(ruleId: string, idx: number) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, conditions: r.conditions.filter((_, i) => i !== idx) } : r,
      ),
    );
    setDirty(true);
  }

  function toggleSegment(ruleId: string, segKey: string) {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const keys = r.segment_keys.includes(segKey)
          ? r.segment_keys.filter((k) => k !== segKey)
          : [...r.segment_keys, segKey];
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
        <h3 className="text-sm font-medium text-slate-500">
          Targeting Rules ({rules.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Rule
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Rules"}
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <p className="mt-2 text-sm text-slate-500">No targeting rules configured.</p>
          <p className="mt-1 text-xs text-slate-400">
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
                  className={`rounded-xl border bg-white transition-all ${isExpanded ? "border-indigo-300 ring-2 ring-indigo-100 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer"
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                        {rule.priority}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {rule.description || "Unnamed rule"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
                        {rule.segment_keys.length > 0 && ` · ${rule.segment_keys.length} segment${rule.segment_keys.length !== 1 ? "s" : ""}`}
                        {` · ${(rule.percentage / 100).toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRule(rule.id);
                        }}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete rule"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-5">
                      {/* Basic fields */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                          <input
                            type="number"
                            min={0}
                            value={rule.priority}
                            onChange={(e) => updateRule(rule.id, { priority: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={rule.description}
                            onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                            placeholder="e.g. Beta testers, Premium users"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Conditions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-500">Conditions</label>
                            <select
                              value={rule.match_type || "all"}
                              onChange={(e) => updateRule(rule.id, { match_type: e.target.value })}
                              className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="all">Match ALL</option>
                              <option value="any">Match ANY</option>
                            </select>
                          </div>
                          <button
                            onClick={() => addCondition(rule.id)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            + Add Condition
                          </button>
                        </div>
                        {rule.conditions.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No conditions — rule matches all users.</p>
                        ) : (
                          <div className="space-y-2">
                            {rule.conditions.map((cond, ci) => (
                              <div key={ci} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-100">
                                <input
                                  type="text"
                                  value={cond.attribute}
                                  onChange={(e) => updateCondition(rule.id, ci, { attribute: e.target.value })}
                                  placeholder="attribute (e.g. plan)"
                                  className="w-36 rounded border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <select
                                  value={cond.operator}
                                  onChange={(e) => updateCondition(rule.id, ci, { operator: e.target.value })}
                                  className="rounded border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                                >
                                  {OPERATORS.map((op) => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={cond.values.join(", ")}
                                  onChange={(e) =>
                                    updateCondition(rule.id, ci, {
                                      values: e.target.value.split(",").map((v) => v.trim()),
                                    })
                                  }
                                  placeholder="value(s), comma-separated"
                                  className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => removeCondition(rule.id, ci)}
                                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Segment targeting */}
                      {segments.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-2">Target Segments</label>
                          <div className="flex flex-wrap gap-2">
                            {segments.map((seg) => {
                              const active = rule.segment_keys.includes(seg.key);
                              return (
                                <button
                                  key={seg.key}
                                  onClick={() => toggleSegment(rule.id, seg.key)}
                                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    active
                                      ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {seg.name || seg.key}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Percentage and value */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Rollout %</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={10000}
                              step={100}
                              value={rule.percentage}
                              onChange={(e) => updateRule(rule.id, { percentage: parseInt(e.target.value) })}
                              className="flex-1 accent-indigo-600"
                            />
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-700 ring-1 ring-indigo-100">
                              {(rule.percentage / 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Value when matched</label>
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
