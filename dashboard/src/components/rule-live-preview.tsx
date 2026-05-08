"use client";

import { useMemo } from "react";
import { Check, X, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TargetingRule } from "@/lib/types";
import { evaluateRule, type SampleUser } from "./rule-conflict-detector";

// ── Hardcoded sample users ─────────────────────────────────────────────────

export const SAMPLE_USERS: SampleUser[] = [
  {
    id: "user_abc123",
    email: "alice@example.com",
    country: "US",
    plan: "pro",
    beta: true,
    name: "Alice",
  },
  {
    id: "user_def456",
    email: "bob@other.com",
    country: "IN",
    plan: "free",
    beta: false,
    name: "Bob",
  },
  {
    id: "user_ghi789",
    email: "carol@example.com",
    country: "US",
    plan: "enterprise",
    beta: true,
    name: "Carol",
  },
  {
    id: "user_jkl012",
    email: "dave@example.com",
    country: "GB",
    plan: "pro",
    beta: false,
    name: "Dave",
  },
  {
    id: "user_mno345",
    email: "eve@other.com",
    country: "DE",
    plan: "free",
    beta: true,
    name: "Eve",
  },
  {
    id: "user_pqr678",
    email: "frank@example.com",
    country: "US",
    plan: "enterprise",
    beta: false,
    name: "Frank",
  },
  {
    id: "user_stu901",
    email: "grace@example.com",
    country: "CA",
    plan: "pro",
    beta: true,
    name: "Grace",
  },
  {
    id: "user_vwx234",
    email: "heidi@other.com",
    country: "FR",
    plan: "free",
    beta: false,
    name: "Heidi",
  },
  {
    id: "user_yza567",
    email: "ivan@example.com",
    country: "AU",
    plan: "enterprise",
    beta: true,
    name: "Ivan",
  },
  {
    id: "user_bcd890",
    email: "judy@example.com",
    country: "US",
    plan: "pro",
    beta: false,
    name: "Judy",
  },
];

// ── Types ───────────────────────────────────────────────────────────────────

export interface PreviewResult {
  user: SampleUser;
  matches: boolean;
  /** Which condition(s) failed (if any) */
  failureReasons: string[];
}

interface Props {
  rule: TargetingRule;
  /** Optional override for sample users (useful in tests) */
  sampleUsers?: SampleUser[];
  /** Whether the panel is expanded */
  expanded: boolean;
  /** Toggle callback */
  onToggle: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determine why a condition failed for a user.
 */
function diagnoseCondition(
  condition: { attribute: string; operator: string; values: string[] },
  user: Record<string, unknown>,
): string | null {
  const raw = user[condition.attribute];
  const userValue = raw == null ? "<missing>" : String(raw);

  switch (condition.operator) {
    case "eq":
      if (!condition.values.some((v) => userValue === v)) {
        return `${condition.attribute} = "${userValue}" (expected ${condition.values.map((v) => `"${v}"`).join(" or ")})`;
      }
      break;
    case "neq":
      if (condition.values.some((v) => userValue === v)) {
        return `${condition.attribute} = "${userValue}" (should not equal ${condition.values.map((v) => `"${v}"`).join(" or ")})`;
      }
      break;
    case "contains":
      if (!condition.values.some((v) => userValue.includes(v))) {
        return `${condition.attribute} "${userValue}" does not contain "${condition.values.join(", ")}"`;
      }
      break;
    case "startsWith":
      if (!condition.values.some((v) => userValue.startsWith(v))) {
        return `${condition.attribute} "${userValue}" does not start with "${condition.values.join(", ")}"`;
      }
      break;
    case "endsWith":
      if (!condition.values.some((v) => userValue.endsWith(v))) {
        return `${condition.attribute} "${userValue}" does not end with "${condition.values.join(", ")}"`;
      }
      break;
    case "in": {
      const list = condition.values.flatMap((v) =>
        v.split(",").map((s) => s.trim()),
      );
      if (!list.includes(userValue)) {
        return `${condition.attribute} "${userValue}" is not in [${list.join(", ")}]`;
      }
      break;
    }
    case "notIn":
    case "not_in": {
      const list = condition.values.flatMap((v) =>
        v.split(",").map((s) => s.trim()),
      );
      if (list.includes(userValue)) {
        return `${condition.attribute} "${userValue}" is in [${list.join(", ")}] (should not be)`;
      }
      break;
    }
    case "gt":
      if (isNaN(parseFloat(userValue)) || !condition.values.some((v) => parseFloat(userValue) > parseFloat(v))) {
        return `${condition.attribute} = ${userValue} (should be > ${condition.values.join(" or ")})`;
      }
      break;
    case "gte":
      if (isNaN(parseFloat(userValue)) || !condition.values.some((v) => parseFloat(userValue) >= parseFloat(v))) {
        return `${condition.attribute} = ${userValue} (should be >= ${condition.values.join(" or ")})`;
      }
      break;
    case "lt":
      if (isNaN(parseFloat(userValue)) || !condition.values.some((v) => parseFloat(userValue) < parseFloat(v))) {
        return `${condition.attribute} = ${userValue} (should be < ${condition.values.join(" or ")})`;
      }
      break;
    case "lte":
      if (isNaN(parseFloat(userValue)) || !condition.values.some((v) => parseFloat(userValue) <= parseFloat(v))) {
        return `${condition.attribute} = ${userValue} (should be <= ${condition.values.join(" or ")})`;
      }
      break;
    case "exists":
      if (raw == null || raw === "") {
        return `${condition.attribute} is missing or empty`;
      }
      break;
    default:
      break;
  }
  return null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function RuleLivePreview({
  rule,
  sampleUsers = SAMPLE_USERS,
  expanded,
  onToggle,
}: Props) {
  const results: PreviewResult[] = useMemo(() => {
    return sampleUsers.map((user) => {
      const matches = evaluateRule(rule, user);
      const failureReasons: string[] = [];

      if (!matches && rule.conditions.length > 0) {
        // Collect per-condition failure reasons
        for (const condition of rule.conditions) {
          // Skip conditions with no values (unless it's "exists")
          if (
            condition.values.length === 0 &&
            condition.operator !== "exists"
          )
            continue;

          const reason = diagnoseCondition(condition, user);
          if (reason) {
            failureReasons.push(reason);
          }
        }

        // If no specific reason found but still doesn't match, give a generic reason
        if (failureReasons.length === 0) {
          failureReasons.push(
            `does not match ${rule.match_type === "any" ? "any" : "all"} conditions`,
          );
        }
      }
      return { user, matches, failureReasons };
    });
  }, [rule, sampleUsers]);

  const matchCount = results.filter((r) => r.matches).length;
  const totalCount = results.length;

  return (
    <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors",
          "hover:bg-[var(--signal-bg-primary)]/50",
        )}
        aria-expanded={expanded}
        aria-controls={`preview-panel-${rule.id}`}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--signal-fg-secondary)]">
          <Users className="h-3.5 w-3.5" />
          <span>
            Live Preview —{" "}
            <span
              className={cn(
                "font-semibold",
                matchCount > 0
                  ? "text-[var(--signal-fg-accent)]"
                  : "text-[var(--signal-fg-tertiary)]",
              )}
            >
              {matchCount}
            </span>{" "}
            of {totalCount} sample users would match
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Expandable result list */}
      {expanded && (
        <div
          id={`preview-panel-${rule.id}`}
          className="border-t border-[var(--signal-border-default)] animate-slide-down"
        >
          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--signal-border-default)]/50">
            {results.map((result) => (
              <div
                key={result.user.id}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors",
                  result.matches
                    ? "bg-green-50/50 dark:bg-green-950/20"
                    : "bg-red-50/30 dark:bg-red-950/10",
                )}
              >
                {/* Status icon */}
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    result.matches
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : "bg-red-100 text-red-500 dark:bg-red-900 dark:text-red-400",
                  )}
                >
                  {result.matches ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </span>

                {/* User info */}
                <span className="font-mono font-medium text-[var(--signal-fg-primary)] w-28 shrink-0">
                  {result.user.id}
                </span>

                {/* Match status */}
                <span
                  className={cn(
                    "font-medium shrink-0",
                    result.matches
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400",
                  )}
                >
                  {result.matches ? "matches" : "no match"}
                </span>

                {/* Failure reason */}
                {!result.matches && result.failureReasons.length > 0 && (
                  <span className="text-[var(--signal-fg-tertiary)] truncate">
                    — {result.failureReasons[0]}
                  </span>
                )}

                {/* Serve value preview */}
                {result.matches && (
                  <span className="text-[var(--signal-fg-tertiary)] ml-auto">
                    serve:{" "}
                    <span className="font-mono font-medium text-[var(--signal-fg-accent)]">
                      {typeof rule.value === "boolean"
                        ? String(rule.value)
                        : typeof rule.value === "object"
                          ? JSON.stringify(rule.value)
                          : String(rule.value ?? "—")}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
