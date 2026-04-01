/**
 * EvalContext represents the evaluation context sent with flag lookups.
 * `key` identifies the user/entity. `attributes` carry targeting data
 * (plan tier, country, email, etc.).
 */
export interface EvalContext {
  key: string;
  attributes?: Record<string, unknown>;
}
