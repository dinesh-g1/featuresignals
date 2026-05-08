/**
 * EvaluationReason describes why a flag evaluated to a particular value.
 * Standardised across all FeatureSignals SDKs — see sdks/INTELLIGENCE.md.
 */
export const EvaluationReason = {
  /** Flag was served from the local cache. */
  CACHED: "CACHED",
  /** Flag was not found in cache; fallback / default returned. */
  DEFAULT: "DEFAULT",
  /** Flag found but type did not match requested type. */
  ERROR: "ERROR",
  /** Flag is disabled in the management interface. */
  DISABLED: "DISABLED",
  /** Flag is a static / kill-switch flag. */
  STATIC: "STATIC",
  /** A targeting rule matched for this evaluation context. */
  TARGET_MATCH: "TARGET_MATCH",
  /** A percentage rollout / split evaluation determined the value. */
  SPLIT: "SPLIT",
} as const;

export type EvaluationReason =
  (typeof EvaluationReason)[keyof typeof EvaluationReason];

/**
 * EvaluationDetail is the rich return type for flag evaluations. It carries
 * both the resolved value and metadata about how the decision was reached.
 */
export interface EvaluationDetail {
  /** The flag key that was evaluated. */
  flagKey: string;

  /** The resolved value (or the fallback). */
  value: unknown;

  /** How the value was determined. */
  reason: EvaluationReason;

  /** The ID of the matching rule (empty if no rule matched). */
  ruleId: string;

  /** 0-based index of the matching rule (-1 if none). */
  ruleIndex: number;

  /** Wall-clock time this evaluation took in milliseconds. */
  evaluationTimeMs: number;

  /** Error object when reason === ERROR, null otherwise. */
  error: Error | null;
}
