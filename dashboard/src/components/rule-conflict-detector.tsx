"use client";

import type { Condition, TargetingRule } from "@/lib/types";

// ── Conflict types ──────────────────────────────────────────────────────────

export type ConflictSeverity = "warning" | "info";

export interface Conflict {
  /** Unique ID for this conflict */
  id: string;
  /** Human-readable message */
  message: string;
  /** Which rule IDs are involved */
  ruleIds: string[];
  /** Category */
  type: "overlap" | "dead_rule" | "shadowed_rule";
  /** Visual severity */
  severity: ConflictSeverity;
  /** Optional detail for tooltip */
  detail?: string;
}

// ── Sample user for evaluation simulation ───────────────────────────────────

export interface SampleUser {
  id: string;
  email: string;
  country: string;
  plan: string;
  beta: boolean;
  /** Arbitrary extra attributes for ad-hoc matching */
  [key: string]: unknown;
}

// ── Condition evaluator ─────────────────────────────────────────────────────

/**
 * Evaluate a single condition against a user attributes map.
 * Returns true when the condition matches.
 */
export function evaluateCondition(
  condition: Condition,
  attrs: Record<string, unknown>,
): boolean {
  const raw = attrs[condition.attribute];
  const userValue = raw == null ? "" : String(raw);

  switch (condition.operator) {
    case "eq":
      return condition.values.some((v) => userValue === v);
    case "neq":
      return condition.values.every((v) => userValue !== v);
    case "contains":
      return condition.values.some((v) => userValue.includes(v));
    case "startsWith":
      return condition.values.some((v) => userValue.startsWith(v));
    case "endsWith":
      return condition.values.some((v) => userValue.endsWith(v));
    case "in": {
      const list = condition.values.flatMap((v) =>
        v.split(",").map((s) => s.trim()),
      );
      return list.includes(userValue);
    }
    case "notIn":
    case "not_in": {
      const list = condition.values.flatMap((v) =>
        v.split(",").map((s) => s.trim()),
      );
      return !list.includes(userValue);
    }
    case "gt": {
      const num = parseFloat(userValue);
      return !isNaN(num) && condition.values.some((v) => num > parseFloat(v));
    }
    case "gte": {
      const num = parseFloat(userValue);
      return !isNaN(num) && condition.values.some((v) => num >= parseFloat(v));
    }
    case "lt": {
      const num = parseFloat(userValue);
      return !isNaN(num) && condition.values.some((v) => num < parseFloat(v));
    }
    case "lte": {
      const num = parseFloat(userValue);
      return !isNaN(num) && condition.values.some((v) => num <= parseFloat(v));
    }
    case "regex": {
      try {
        return condition.values.some((v) => new RegExp(v).test(userValue));
      } catch {
        return false;
      }
    }
    case "exists":
      return raw != null && raw !== "";
    default:
      return false;
  }
}

/**
 * Evaluate all conditions for a rule against a single user.
 * Respects `match_type`: "all" = AND, "any" = OR.
 * If no conditions, the rule matches all users (catch-all).
 */
export function evaluateRule(
  rule: TargetingRule,
  user: Record<string, unknown>,
): boolean {
  if (rule.conditions.length === 0) {
    // Catch-all: matches everyone if percentage is > 0
    return rule.percentage > 0;
  }

  const matchType = rule.match_type || "all";

  if (matchType === "any") {
    return rule.conditions.some((c) => evaluateCondition(c, user));
  }
  // "all" — AND
  return rule.conditions.every((c) => evaluateCondition(c, user));
}

// ── Conflict detection logic ────────────────────────────────────────────────

/**
 * Detect all conflicts between targeting rules.
 * Runs client-side — pure function with no side effects.
 */
export function detectConflicts(
  rules: TargetingRule[],
  sampleUsers: SampleUser[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sorted.length; i++) {
    const rule = sorted[i];

    // ── Dead rule detection ───────────────────────────────────────────────
    if (rule.percentage === 0) {
      conflicts.push({
        id: `dead-${rule.id}`,
        message: `Rule #${rule.priority} has 0% rollout — it will never serve`,
        ruleIds: [rule.id],
        type: "dead_rule",
        severity: "warning",
        detail: "Set the percentage above 0% or remove this rule.",
      });
      continue; // Don't check further for dead rules
    }

    const hasImpossibleCondition =
      rule.conditions.length > 0 &&
      rule.conditions.some(
        (c) => c.values.length === 0 && c.operator !== "exists",
      );
    if (hasImpossibleCondition) {
      conflicts.push({
        id: `impossible-${rule.id}`,
        message: `Rule #${rule.priority} has a condition with no values — it may never match`,
        ruleIds: [rule.id],
        type: "dead_rule",
        severity: "warning",
        detail: "Add at least one value to each condition.",
      });
    }

    // ── Check against higher-priority rules for shadowing ─────────────────
    for (let j = 0; j < i; j++) {
      const higher = sorted[j];
      if (higher.percentage === 0) continue; // skip dead rules

      // Check if ALL sample users that would match the lower rule
      // would already be matched by the higher rule
      const matchedByLower = sampleUsers.filter((u) => evaluateRule(rule, u));
      if (matchedByLower.length === 0) continue; // no one matches lower rule anyway

      const allCoveredByHigher = matchedByLower.every((u) =>
        evaluateRule(higher, u),
      );

      if (allCoveredByHigher) {
        conflicts.push({
          id: `shadowed-${rule.id}-by-${higher.id}`,
          message: `Rule #${rule.priority} is shadowed by Rule #${higher.priority} — all matching users are caught by the higher-priority rule`,
          ruleIds: [rule.id, higher.id],
          type: "shadowed_rule",
          severity: "warning",
          detail:
            "Consider removing the lower-priority rule or making its conditions more specific.",
        });
      } else {
        // Check for partial overlap
        const overlapCount = matchedByLower.filter((u) =>
          evaluateRule(higher, u),
        ).length;
        if (overlapCount > 0) {
          conflicts.push({
            id: `overlap-${rule.id}-with-${higher.id}`,
            message: `Rule #${rule.priority} overlaps with Rule #${higher.priority} — ${overlapCount} of ${matchedByLower.length} sample users match both`,
            ruleIds: [rule.id, higher.id],
            type: "overlap",
            severity: "info",
            detail:
              "Overlapping rules aren't necessarily wrong, but review priority ordering to ensure correct evaluation.",
          });
        }
      }
    }
  }

  return conflicts;
}

// ── Helpers for the UI ──────────────────────────────────────────────────────

/**
 * Get conflicts relevant to a specific rule.
 */
export function getConflictsForRule(
  conflicts: Conflict[],
  ruleId: string,
): Conflict[] {
  return conflicts.filter((c) => c.ruleIds.includes(ruleId));
}
