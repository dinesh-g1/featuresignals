"use client";

import { useState } from "react";

interface Condition {
  attribute: string;
  operator: string;
  values: string[];
}

interface Props {
  rules: Condition[];
  matchType: string;
  onSave: (rules: Condition[], matchType: string) => Promise<void>;
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

export function SegmentRulesEditor({ rules: initialRules, matchType: initialMatchType, onSave }: Props) {
  const [rules, setRules] = useState<Condition[]>(initialRules ?? []);
  const [matchType, setMatchType] = useState(initialMatchType || "all");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function addCondition() {
    setRules((prev) => [...prev, { attribute: "", operator: "eq", values: [""] }]);
    setDirty(true);
  }

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setRules((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    setDirty(true);
  }

  function removeCondition(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function handleMatchTypeChange(val: string) {
    setMatchType(val);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(rules, matchType);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Conditions</span>
          <select
            value={matchType}
            onChange={(e) => handleMatchTypeChange(e.target.value)}
            className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Match ALL</option>
            <option value="any">Match ANY</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addCondition}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Add Condition
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          No conditions — this segment matches all users. Click &ldquo;+ Add Condition&rdquo; to define who belongs to this segment.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-100">
              <input
                type="text"
                value={cond.attribute}
                onChange={(e) => updateCondition(i, { attribute: e.target.value })}
                placeholder="attribute (e.g. plan)"
                className="w-36 rounded border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value })}
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
                  updateCondition(i, {
                    values: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
                placeholder="value(s), comma-separated"
                className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => removeCondition(i)}
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
  );
}
