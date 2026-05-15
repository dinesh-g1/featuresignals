/**
 * ABM SDK data types — TypeScript interfaces matching the cross-language contract.
 *
 * See: product/wiki/public/ABM_SDK_SPECIFICATION.md §2 — Data Types
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */

/**
 * Logger interface for ABM SDK diagnostics.
 *
 * The ABM SDK never uses `console.log` or `console.warn` directly.
 * Pass a logger that implements this interface to capture SDK warnings
 * (e.g., failed track flushes, buffer overflows). The default is a no-op.
 */
export interface ABMLogger {
  warn(message: string, ...args: unknown[]): void;
}

/** Configuration for the ABM client. */
export interface ABMConfig {
  /** Server-side environment key for the ABM API. */
  environmentKey: string;

  /** FeatureSignals API base URL. Default: "https://app.featuresignals.com" */
  baseUrl?: string;

  /**
   * How long resolved behaviors are cached locally (seconds).
   * Default 10 (per ABM_SDK_SPECIFICATION.md §1.3). 0 disables caching.
   */
  cacheTtlSeconds?: number;

  /** Maximum number of cache entries before LRU eviction. Default 10000. */
  maxCacheEntries?: number;

  /** HTTP request timeout in milliseconds. Default 10000. */
  timeoutMs?: number;

  /**
   * Optional logger for SDK diagnostics (e.g., track flush failures).
   * Default is a no-op. Use to integrate with your application's logging.
   */
  logger?: ABMLogger;
}

/** Request to resolve which behavior variant an agent should use. */
export interface ResolveRequest {
  /** The behavior key to resolve (e.g., "search-ranking"). */
  behaviorKey: string;

  /** Unique identifier for the agent instance. */
  agentId: string;

  /** The type/category of agent (e.g., "recommender"). */
  agentType: string;

  /** Optional end-user identifier. */
  userId?: string;

  /** Arbitrary key-value pairs for targeting. */
  attributes?: Record<string, unknown>;

  /** Optional session identifier for sticky behaviors. */
  sessionId?: string;
}

/** Result of resolving a behavior. */
export interface ResolveResponse {
  /** The behavior key that was resolved. */
  behaviorKey: string;

  /** The selected variant name. */
  variant: string;

  /** Arbitrary configuration for the variant. */
  config?: Record<string, unknown>;

  /** Why this variant was selected. */
  reason: "targeting_match" | "default" | "percentage_rollout" | "fallback";

  /** UTC timestamp of resolution (ISO 8601). */
  resolvedAt: string;

  /** Whether this resolution should persist for the session. */
  isSticky: boolean;

  /** Cache TTL recommended by the server (seconds). */
  ttlSeconds: number;
}

/** An agent behavior event for analytics and billing. */
export interface TrackEvent {
  /** The behavior key this event relates to. */
  behaviorKey: string;

  /** Unique identifier for the agent instance. */
  agentId: string;

  /** The type/category of agent. */
  agentType: string;

  /** The variant that was applied. */
  variant: string;

  /** The action taken (e.g., "behavior.applied", "search.ranked"). */
  action: string;

  /** Optional outcome classification (e.g., "displayed", "clicked"). */
  outcome?: string;

  /** Optional numeric value for cost/billing attribution. */
  value?: number;

  /** Arbitrary key-value metadata. */
  metadata?: Record<string, unknown>;

  /** Optional end-user identifier. */
  userId?: string;

  /** Optional session identifier. */
  sessionId?: string;

  /** UTC timestamp (set by client if not provided). ISO 8601. */
  recordedAt?: string;
}
