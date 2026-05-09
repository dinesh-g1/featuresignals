"use client";

import React, { useState, useCallback, useMemo } from "react";
import { CircleCheck, CircleX, Plus, X, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Attribute = "email" | "country" | "plan" | "custom";
type Operator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "regex"
  | "exists";

interface Condition {
  attribute: string;
  operator: Operator;
  values: string[];
}

interface TargetingRule {
  priority: number;
  description: string;
  match_type: "all" | "any";
  conditions: Condition[];
  value: boolean;
  percentage: number;
}

interface EvalContext {
  key: string;
  attributes: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATTRIBUTE_OPTIONS: {
  value: Attribute;
  label: string;
  placeholder: string;
}[] = [
  { value: "email", label: "Email", placeholder: "user@example.com" },
  { value: "country", label: "Country", placeholder: "US" },
  { value: "plan", label: "Plan", placeholder: "enterprise" },
  { value: "custom", label: "Custom Attribute", placeholder: "attribute_name" },
];

const OPERATOR_OPTIONS: {
  value: Operator;
  label: string;
  needsValue: boolean;
}[] = [
  { value: "eq", label: "Equals", needsValue: true },
  { value: "neq", label: "Not Equals", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  { value: "startsWith", label: "Starts With", needsValue: true },
  { value: "endsWith", label: "Ends With", needsValue: true },
  { value: "in", label: "In (comma-separated)", needsValue: true },
  { value: "notIn", label: "Not In (comma-separated)", needsValue: true },
  { value: "gt", label: "Greater Than", needsValue: true },
  { value: "gte", label: "Greater Than or Equal", needsValue: true },
  { value: "lt", label: "Less Than", needsValue: true },
  { value: "lte", label: "Less Than or Equal", needsValue: true },
  { value: "regex", label: "Regex", needsValue: true },
  { value: "exists", label: "Exists", needsValue: false },
];

const PRESET_CONTEXTS: { name: string; context: EvalContext }[] = [
  {
    name: "US Enterprise User",
    context: {
      key: "user-123",
      attributes: {
        country: "US",
        plan: "enterprise",
        email: "alice@acme.com",
        beta: "true",
      },
    },
  },
  {
    name: "EU Free User",
    context: {
      key: "user-456",
      attributes: {
        country: "DE",
        plan: "free",
        email: "bob@example.de",
        beta: "false",
      },
    },
  },
  {
    name: "US Free User",
    context: {
      key: "user-789",
      attributes: {
        country: "US",
        plan: "free",
        email: "carol@startup.io",
        beta: "false",
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Evaluation Logic
// ---------------------------------------------------------------------------

function matchesCondition(
  condition: Condition,
  attributes: Record<string, string>,
): boolean {
  const attrValue = attributes[condition.attribute];
  if (attrValue === undefined && condition.operator !== "exists") return false;

  const vals = condition.values;

  switch (condition.operator) {
    case "eq":
      return attrValue === vals[0];
    case "neq":
      return attrValue !== vals[0];
    case "contains":
      return attrValue?.includes(vals[0]) ?? false;
    case "startsWith":
      return attrValue?.startsWith(vals[0]) ?? false;
    case "endsWith":
      return attrValue?.endsWith(vals[0]) ?? false;
    case "in":
      return vals.some((v) => v.trim() === attrValue);
    case "notIn":
      return !vals.some((v) => v.trim() === attrValue);
    case "gt":
      return Number(attrValue) > Number(vals[0]);
    case "gte":
      return Number(attrValue) >= Number(vals[0]);
    case "lt":
      return Number(attrValue) < Number(vals[0]);
    case "lte":
      return Number(attrValue) <= Number(vals[0]);
    case "regex":
      try {
        return new RegExp(vals[0]).test(attrValue ?? "");
      } catch {
        return false;
      }
    case "exists":
      return attributes[condition.attribute] !== undefined;
    default:
      return false;
  }
}

function evaluateRule(
  rule: TargetingRule,
  context: EvalContext,
): { matches: boolean; reason: string } {
  if (rule.conditions.length === 0) {
    return { matches: false, reason: "No conditions defined" };
  }

  const results = rule.conditions.map((c) => ({
    condition: c,
    matches: matchesCondition(c, context.attributes),
  }));

  const allMatch = results.every((r) => r.matches);
  const anyMatch = results.some((r) => r.matches);

  const matched = rule.match_type === "all" ? allMatch : anyMatch;

  if (matched) {
    const matchedConditions = results
      .filter((r) => r.matches)
      .map((r) => r.condition);
    const details = matchedConditions
      .map(
        (c) =>
          `\`${c.attribute}\` ${c.operator === "exists" ? "exists" : `${c.operator} "${c.values.join(", ")}"`}`,
      )
      .join(" AND ");
    return {
      matches: true,
      reason: `${rule.match_type === "all" ? "All" : "At least one"} condition${rule.match_type === "all" && matchedConditions.length > 1 ? "s" : ""} matched: ${details}`,
    };
  }

  const failedConditions = results
    .filter((r) => !r.matches)
    .map((r) => r.condition);
  const failDetails = failedConditions
    .map(
      (c) =>
        `\`${c.attribute}\` ${c.operator === "exists" ? "missing" : `${c.operator} "${c.values.join(", ")}"`}`,
    )
    .join(", ");
  return {
    matches: false,
    reason: `Failed conditions: ${failDetails}`,
  };
}

// ---------------------------------------------------------------------------
// Sub-Component: ConditionRow
// ---------------------------------------------------------------------------

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  condition: Condition;
  index: number;
  onChange: (index: number, c: Condition) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const operator = OPERATOR_OPTIONS.find((o) => o.value === condition.operator);
  const needsValue = operator?.needsValue ?? true;
  const isCustomAttr = !ATTRIBUTE_OPTIONS.slice(0, 4).some(
    (a) => a.value === condition.attribute,
  );

  const selectClasses = cn(
    "min-w-[100px] flex-1",
    "px-2 py-2",
    "border border-[var(--signal-border-default)]",
    "rounded-[var(--signal-radius-sm)]",
    "text-[13px]",
    "bg-[var(--signal-bg-primary)]",
    "text-[var(--signal-fg-primary)]",
    "cursor-pointer transition-colors duration-[var(--signal-duration-fast)]",
    "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
  );

  const inputClasses = cn(
    "min-w-[100px] flex-[2]",
    "px-2 py-2",
    "border border-[var(--signal-border-default)]",
    "rounded-[var(--signal-radius-sm)]",
    "text-[13px] font-[var(--signal-font-mono)]",
    "bg-[var(--signal-bg-primary)]",
    "text-[var(--signal-fg-primary)]",
    "transition-colors duration-[var(--signal-duration-fast)]",
    "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
    "focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]",
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        "p-2",
        "bg-[var(--signal-bg-secondary)]",
        "rounded-[var(--signal-radius-sm)]",
        "border border-[var(--signal-border-subtle)]",
      )}
    >
      <span className="text-[11px] font-bold text-[var(--signal-fg-tertiary)] min-w-[1.2em]">
        #{index + 1}
      </span>

      <select
        className={selectClasses}
        value={condition.attribute}
        onChange={(e) =>
          onChange(index, { ...condition, attribute: e.target.value })
        }
        aria-label={`Condition ${index + 1} attribute`}
      >
        {ATTRIBUTE_OPTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      {isCustomAttr && (
        <input
          className={inputClasses}
          type="text"
          placeholder="attribute_name"
          value={condition.attribute}
          onChange={(e) =>
            onChange(index, { ...condition, attribute: e.target.value })
          }
          aria-label="Custom attribute name"
        />
      )}

      <select
        className={selectClasses}
        value={condition.operator}
        onChange={(e) =>
          onChange(index, {
            ...condition,
            operator: e.target.value as Operator,
          })
        }
        aria-label={`Condition ${index + 1} operator`}
      >
        {OPERATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {needsValue && (
        <input
          className={inputClasses}
          type="text"
          placeholder={
            ATTRIBUTE_OPTIONS.find((a) => a.value === condition.attribute)
              ?.placeholder ?? "value"
          }
          value={condition.values.join(", ")}
          onChange={(e) =>
            onChange(index, {
              ...condition,
              values: e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
          aria-label={`Condition ${index + 1} value`}
        />
      )}

      {canRemove && (
        <button
          className={cn(
            "flex items-center justify-center",
            "w-6 h-6 p-0",
            "border border-transparent rounded-[var(--signal-radius-sm)]",
            "bg-transparent text-[var(--signal-fg-secondary)]",
            "cursor-pointer transition-all duration-[var(--signal-duration-fast)]",
            "flex-shrink-0",
            "hover:text-[var(--signal-fg-danger)]",
            "hover:bg-[var(--signal-bg-danger-muted)]",
            "hover:border-[var(--signal-border-danger-emphasis)]",
          )}
          onClick={() => onRemove(index)}
          aria-label={`Remove condition ${index + 1}`}
          title="Remove"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TargetingRuleDemo(): React.ReactElement {
  const [matchType, setMatchType] = useState<"all" | "any">("all");
  const [description, setDescription] = useState("Beta users in US");
  const [conditions, setConditions] = useState<Condition[]>([
    { attribute: "country", operator: "eq", values: ["US"] },
    { attribute: "beta", operator: "eq", values: ["true"] },
  ]);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [showJson, setShowJson] = useState(false);

  const currentContext = PRESET_CONTEXTS[selectedPreset].context;

  const rule: TargetingRule = useMemo(
    () => ({
      priority: 1,
      description,
      match_type: matchType,
      conditions,
      value: true,
      percentage: 10000,
    }),
    [description, matchType, conditions],
  );

  const evalResult = useMemo(
    () => evaluateRule(rule, currentContext),
    [rule, currentContext],
  );

  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { attribute: "country", operator: "eq", values: [""] },
    ]);
  }, []);

  const updateCondition = useCallback(
    (index: number, updated: Condition) => {
      setConditions((prev) =>
        prev.map((c, i) => (i === index ? updated : c)),
      );
    },
    [],
  );

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const jsonRule = useMemo(
    () => JSON.stringify({ rules: [rule] }, null, 2),
    [rule],
  );

  const inputClasses = cn(
    "w-full px-2 py-2",
    "border border-[var(--signal-border-default)]",
    "rounded-[var(--signal-radius-sm)]",
    "text-[13px] font-[var(--signal-font-mono)]",
    "bg-[var(--signal-bg-primary)]",
    "text-[var(--signal-fg-primary)]",
    "transition-colors duration-[var(--signal-duration-fast)]",
    "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
    "focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]",
  );

  return (
    <div
      className={cn(
        "my-6 overflow-hidden",
        "rounded-[var(--signal-radius-lg)]",
        "border border-[var(--signal-border-default)]",
        "bg-[var(--signal-bg-primary)]",
        "shadow-[var(--signal-shadow-sm)]",
      )}
      data-demo="targeting"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className={cn(
          "px-5 py-5 sm:px-6",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center",
            "text-[11px] font-semibold uppercase tracking-[0.06em]",
            "text-[var(--signal-fg-accent)]",
            "bg-[var(--signal-bg-accent-muted)]",
            "px-2.5 py-0.5",
            "rounded-[var(--signal-radius-sm)]",
          )}
        >
          Interactive Demo
        </span>
        <h3 className="mt-1.5 mb-1 text-lg font-semibold text-[var(--signal-fg-primary)]">
          Targeting Rule Builder
        </h3>
        <p className="m-0 text-[13px] leading-relaxed text-[var(--signal-fg-secondary)]">
          Build a targeting rule and test it against a sample user context to
          see if the flag would be ON or OFF.
        </p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-2",
          "divide-y lg:divide-y-0 lg:divide-x divide-[var(--signal-border-subtle)]",
        )}
      >
        {/* ── Left: Rule Builder ─────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--signal-fg-secondary)]">
            Rule Configuration
          </h4>

          {/* Match type */}
          <div className="mb-4">
            <label className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]">
              Match Type
            </label>
            <div className="flex gap-2">
              <label
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5",
                  "px-3 py-2",
                  "border rounded-[var(--signal-radius-sm)]",
                  "text-[13px] font-medium cursor-pointer",
                  "transition-all duration-[var(--signal-duration-fast)]",
                  matchType === "all"
                    ? [
                        "border-[var(--signal-border-accent-emphasis)]",
                        "bg-[var(--signal-bg-accent-muted)]",
                        "text-[var(--signal-fg-accent)]",
                      ]
                    : [
                        "border-[var(--signal-border-default)]",
                        "bg-[var(--signal-bg-primary)]",
                        "text-[var(--signal-fg-primary)]",
                        "hover:border-[var(--signal-border-accent-emphasis)]",
                      ],
                )}
              >
                <input
                  type="radio"
                  name="matchType"
                  value="all"
                  checked={matchType === "all"}
                  onChange={() => setMatchType("all")}
                  className="sr-only"
                />
                ALL (AND)
              </label>
              <label
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5",
                  "px-3 py-2",
                  "border rounded-[var(--signal-radius-sm)]",
                  "text-[13px] font-medium cursor-pointer",
                  "transition-all duration-[var(--signal-duration-fast)]",
                  matchType === "any"
                    ? [
                        "border-[var(--signal-border-accent-emphasis)]",
                        "bg-[var(--signal-bg-accent-muted)]",
                        "text-[var(--signal-fg-accent)]",
                      ]
                    : [
                        "border-[var(--signal-border-default)]",
                        "bg-[var(--signal-bg-primary)]",
                        "text-[var(--signal-fg-primary)]",
                        "hover:border-[var(--signal-border-accent-emphasis)]",
                      ],
                )}
              >
                <input
                  type="radio"
                  name="matchType"
                  value="any"
                  checked={matchType === "any"}
                  onChange={() => setMatchType("any")}
                  className="sr-only"
                />
                ANY (OR)
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
              htmlFor="tr-desc"
            >
              Description
            </label>
            <input
              id="tr-desc"
              className={inputClasses}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Beta users in US"
            />
          </div>

          {/* Conditions */}
          <div className="mb-4">
            <label className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]">
              Conditions
            </label>
            <div className="flex flex-col gap-2 mb-2">
              {conditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  condition={c}
                  index={i}
                  onChange={updateCondition}
                  onRemove={removeCondition}
                  canRemove={conditions.length > 1}
                />
              ))}
            </div>
            <button
              className={cn(
                "inline-flex items-center gap-1.5",
                "px-3 py-1.5",
                "border border-dashed border-[var(--signal-border-emphasis)]",
                "rounded-[var(--signal-radius-sm)]",
                "bg-transparent text-[var(--signal-fg-secondary)]",
                "text-xs font-medium cursor-pointer",
                "transition-all duration-[var(--signal-duration-fast)]",
                "hover:border-[var(--signal-border-accent-emphasis)]",
                "hover:text-[var(--signal-fg-accent)]",
                "hover:bg-[var(--signal-bg-accent-muted)]",
              )}
              onClick={addCondition}
            >
              <Plus size={13} />
              Add Condition
            </button>
          </div>

          {/* JSON toggle */}
          <button
            className={cn(
              "inline-flex items-center gap-1",
              "px-2.5 py-1",
              "bg-transparent border-none",
              "text-[var(--signal-fg-accent)]",
              "text-xs font-medium cursor-pointer",
              "transition-colors duration-[var(--signal-duration-fast)]",
              "hover:text-[var(--signal-bg-accent-hover)]",
            )}
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
            {showJson ? "Hide" : "Show"} JSON Rule
          </button>
          {showJson && (
            <pre
              className={cn(
                "mt-2 px-3 py-3",
                "bg-[var(--signal-bg-secondary)]",
                "rounded-[var(--signal-radius-sm)]",
                "border border-[var(--signal-border-subtle)]",
                "text-xs font-[var(--signal-font-mono)]",
                "overflow-x-auto",
              )}
            >
              <code>{jsonRule}</code>
            </pre>
          )}
        </div>

        {/* ── Right: Evaluation ───────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--signal-fg-secondary)]">
            Test Evaluation
          </h4>

          {/* Context selector */}
          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
              htmlFor="tr-context"
            >
              Sample User
            </label>
            <select
              id="tr-context"
              className={cn(
                "w-full px-2 py-2",
                "border border-[var(--signal-border-default)]",
                "rounded-[var(--signal-radius-sm)]",
                "text-[13px]",
                "bg-[var(--signal-bg-primary)]",
                "text-[var(--signal-fg-primary)]",
                "cursor-pointer transition-colors duration-[var(--signal-duration-fast)]",
                "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
              )}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(Number(e.target.value))}
            >
              {PRESET_CONTEXTS.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Context attributes */}
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-[var(--signal-fg-primary)] mb-1.5">
              Context Attributes
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "inline-flex px-2 py-1",
                  "text-xs font-[var(--signal-font-mono)]",
                  "bg-[var(--signal-bg-secondary)]",
                  "border border-[var(--signal-border-subtle)]",
                  "rounded-[var(--signal-radius-sm)]",
                  "text-[var(--signal-fg-primary)]",
                )}
              >
                <strong>key:</strong> {currentContext.key}
              </span>
              {Object.entries(currentContext.attributes).map(([k, v]) => (
                <span
                  key={k}
                  className={cn(
                    "inline-flex px-2 py-1",
                    "text-xs font-[var(--signal-font-mono)]",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "rounded-[var(--signal-radius-sm)]",
                    "text-[var(--signal-fg-primary)]",
                  )}
                >
                  <strong>{k}:</strong> {v}
                </span>
              ))}
            </div>
          </div>

          {/* Evaluation result */}
          <div
            className={cn(
              "p-4 rounded-[var(--signal-radius-md)] mb-4",
              "border-2",
              evalResult.matches
                ? [
                    "bg-[var(--signal-bg-success-muted)]",
                    "border-[var(--signal-border-success-emphasis)]",
                  ]
                : [
                    "bg-[var(--signal-bg-danger-muted)]",
                    "border-[var(--signal-border-danger-emphasis)]",
                  ],
            )}
          >
            <div
              className={cn(
                "text-base font-bold mb-1.5 flex items-center gap-1.5",
                evalResult.matches
                  ? "text-[var(--signal-fg-success)]"
                  : "text-[var(--signal-fg-danger)]",
              )}
            >
              {evalResult.matches ? (
                <>
                  <CircleCheck size={18} />
                  FLAG ON
                </>
              ) : (
                <>
                  <CircleX size={18} />
                  FLAG OFF
                </>
              )}
            </div>
            <div className="text-[13px] text-[var(--signal-fg-secondary)] leading-relaxed">
              {evalResult.reason}
            </div>
          </div>

          {/* Condition-by-condition breakdown */}
          <div>
            <div className="text-[13px] font-semibold text-[var(--signal-fg-primary)] mb-1.5">
              Condition Breakdown
            </div>
            {rule.conditions.map((c, i) => {
              const matches = matchesCondition(
                c,
                currentContext.attributes,
              );
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2",
                    "px-2 py-1.5 mt-1",
                    "rounded-[var(--signal-radius-sm)]",
                    "font-[var(--signal-font-mono)] text-xs",
                    matches
                      ? [
                          "bg-[var(--signal-bg-success-muted)]",
                          "text-[var(--signal-fg-success)]",
                        ]
                      : [
                          "bg-[var(--signal-bg-danger-muted)]",
                          "text-[var(--signal-fg-danger)]",
                        ],
                  )}
                >
                  <span className="font-bold text-[13px] flex-shrink-0">
                    {matches ? (
                      <CircleCheck size={13} />
                    ) : (
                      <CircleX size={13} />
                    )}
                  </span>
                  <span>
                    <code>{c.attribute}</code>{" "}
                    {c.operator === "exists"
                      ? "exists"
                      : `${c.operator} "${c.values.join(", ")}"`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
