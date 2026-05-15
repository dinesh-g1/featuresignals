/**
 * ABM SDK data types — TypeScript interfaces matching the cross-language contract.
 *
 * See: product/wiki/public/ABM_SDK_SPECIFICATION.md §2 — Data Types
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 *
 * Wire format uses snake_case; TypeScript types use camelCase.
 * The ABMClient handles the mapping internally.
 *
 * @module abm/types
 */

// ── Configuration ─────────────────────────────────────────────────────────

/** Configuration for the ABM client. */
export interface ABMConfig {
  /** Server-side environment key for the ABM API. Required. */
  environmentKey: string;

  /** FeatureSignals API base URL. Default: "https://app.featuresignals.io" */
  baseUrl?: string;

  /** How long resolved behaviors are cached locally (seconds). Default 10. */
  cacheTtlSeconds?: number;

  /** Maximum number of cache entries before LRU eviction. Default 10000. */
  maxCacheEntries?: number;

  /** HTTP request timeout in milliseconds. Default 5000. */
  timeoutMs?: number;
}

// ── Resolve ───────────────────────────────────────────────────────────────

/**
 * Result of resolving a behavior.
 *
 * The SDK MUST NOT throw on errors — it always returns a fallback response.
 * See ABM_SDK_SPECIFICATION.md §3.
 */
export interface ResolveResponse {
  /** The behavior key that was resolved. */
  behaviorKey: string;
  /** The selected variant name. Empty string on 404/fallback. */
  variant: string;
  /** Arbitrary configuration for the variant (JSON object). */
  configuration: Record<string, unknown>;
  /** Why this variant was selected. */
  reason: "targeting_match" | "default" | "percentage_rollout" | "fallback";
  /** Cache TTL in seconds, as recommended by the server. */
  cacheTtlSeconds: number;
  /** UTC timestamp of resolution (RFC 3339). */
  evaluatedAt: string;
}

// ── Track ─────────────────────────────────────────────────────────────────

/** An agent behavior event for analytics and billing. */
export interface TrackEvent {
  /** The behavior key this event relates to. */
  behaviorKey: string;
  /** Unique identifier for the agent instance. */
  agentId: string;
  /** The variant that was applied. */
  variant: string;
  /** The event name (e.g., "behavior.applied", "behavior.error"). */
  event: string;
  /** Optional numeric value (e.g., cost, latency, tokens). */
  value?: number;
  /** UTC timestamp (RFC 3339). Set by SDK if not provided. */
  timestamp: string;
}

// ── Hook Return Types ─────────────────────────────────────────────────────

/** Return type of the {@link useABM} hook. */
export interface UseABMResult {
  /** The selected variant, or empty string if not yet resolved. */
  variant: string;
  /** Configuration object for the variant. Empty object if not resolved. */
  configuration: Record<string, unknown>;
  /** Why this variant was selected (or "fallback" on error). */
  reason: ResolveResponse["reason"];
  /** Whether a resolve request is currently in-flight. */
  loading: boolean;
  /** Error that occurred during the last resolve, or null. */
  error: string | null;
  /** Manually re-resolve (bypasses cache). */
  refetch: () => void;
}

/** Return type of the {@link useABMTrack} hook. */
export interface UseABMTrackResult {
  /** Track an event for the behavior+agent pair. Fire-and-forget. */
  track: (event: string, value?: number) => void;
}
