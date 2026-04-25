"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { X } from "lucide-react";
import type { Condition } from "@/lib/types";

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

const MATCH_TYPE_OPTIONS = [
  { value: "all", label: "Match ALL" },
  { value: "any", label: "Match ANY" },
];

export function SegmentRulesEditor({
  rules: initialRules,
  matchType: initialMatchType,
  onSave,
}: Props) {
  const [rules, setRules] = useState<Condition[]>(initialRules ?? []);
  const [matchType, setMatchType] = useState(initialMatchType || "all");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function addCondition() {
    setRules((prev) => [
      ...prev,
      { attribute: "", operator: "eq", values: [""] },
    ]);
    setDirty(true);
  }

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setRules((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
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
          <Select
            value={matchType}
            onValueChange={handleMatchTypeChange}
            options={MATCH_TYPE_OPTIONS}
            size="sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={addCondition}
            className="text-xs font-medium text-accent hover:text-accent-dark"
          >
            + Add Condition
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white shadow-sm transition-all hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          No conditions — this segment matches all users. Click &ldquo;+ Add
          Condition&rdquo; to define who belongs to this segment.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((cond, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-100"
            >
              <input
                type="text"
                value={cond.attribute}
                onChange={(e) =>
                  updateCondition(i, { attribute: e.target.value })
                }
                placeholder="attribute (e.g. plan)"
                className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <Select
                value={cond.operator}
                onValueChange={(val) => updateCondition(i, { operator: val })}
                options={OPERATORS}
                size="sm"
              />
              <input
                type="text"
                value={cond.values.join(", ")}
                onChange={(e) =>
                  updateCondition(i, {
                    values: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
                placeholder="value(s), comma-separated"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono shadow-sm transition-all hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={() => removeCondition(i)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
