/**
 * ABM Client — the main entry point for resolving agent behaviors and tracking events.
 *
 * Implements the cross-language contract defined in ABM_SDK_SPECIFICATION.md.
 * Mirrors the Go reference implementation at sdks/go/abm/client.go.
 *
 * See: product/wiki/public/ABM_SDK_SPECIFICATION.md
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */

import type {
  ABMConfig,
  ABMLogger,
  ResolveRequest,
  ResolveResponse,
  TrackEvent,
} from "./types.ts";

// ── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  response: ResolveResponse;
  expiresAt: number;
}

/** LRU cache with TTL. Tracks insertion order for eviction. */
class LRUCache {
  private map = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (entry) {
      // Refresh LRU order: delete and re-insert.
      this.map.delete(key);
      this.map.set(key, entry);
    }
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    // Evict oldest if at capacity.
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, entry);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// ── ABM Client ────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://app.featuresignals.com";
const DEFAULT_CACHE_TTL = 10; // Per ABM_SDK_SPECIFICATION.md §1.3
const DEFAULT_MAX_CACHE = 10000;
const DEFAULT_TIMEOUT_MS = 10000;
const BUFFER_MAX_SIZE = 256; // Per ABM_SDK_SPECIFICATION.md §4
const FLUSH_INTERVAL_MS = 5000; // Per ABM_SDK_SPECIFICATION.md §4
// Retry backoff: 100ms → 1s → 10s → drop (per spec §4)
const RETRY_BACKOFF_MS = [100, 1000, 10000];

/** No-op logger used when the caller doesn't provide one. */
const noopLogger: ABMLogger = { warn: () => {} };

/**
 * Client for the FeatureSignals Agent Behavior Mesh (ABM).
 *
 * Resolves which behavior variant an agent should use and tracks agent
 * actions for analytics. Resolved behaviors are cached locally for fast access.
 */
export class ABMClient {
  private baseUrl: string;
  private environmentKey: string;
  private cacheTtl: number;
  private cache: LRUCache;
  private timeoutMs: number;
  private logger: ABMLogger;

  // Event buffering (per ABM_SDK_SPECIFICATION.md §4).
  private eventBuffer: TrackEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(config: ABMConfig) {
    if (!config.environmentKey) {
      throw new ABMError("environmentKey is required");
    }

    this.environmentKey = config.environmentKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.cacheTtl = config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cache = new LRUCache(config.maxCacheEntries ?? DEFAULT_MAX_CACHE);
    this.logger = config.logger ?? noopLogger;

    // Start periodic flush timer.
    this.flushTimer = setInterval(() => this.flushBuffer(), FLUSH_INTERVAL_MS);
    // Allow the timer to not keep the process alive.
    if (
      this.flushTimer &&
      typeof this.flushTimer === "object" &&
      "unref" in this.flushTimer
    ) {
      (this.flushTimer as NodeJS.Timeout).unref();
    }
  }

  // ── Resolve ───────────────────────────────────────────────────────────

  /**
   * Resolve which variant an agent should use for a behavior.
   *
   * Results are cached locally based on `cacheTtlSeconds`. Use {@link resolveFresh}
   * to bypass the cache.
   *
   * @throws {ABMError} On network errors, non-200 responses, or JSON decode failures.
   */
  async resolve(req: ResolveRequest): Promise<ResolveResponse> {
    const cacheKey = `${req.behaviorKey}:${req.agentId}`;

    // Check cache first.
    if (this.cacheTtl > 0) {
      const entry = this.cache.get(cacheKey);
      if (entry && Date.now() < entry.expiresAt) {
        return entry.response;
      }
    }

    return this.resolveRemote(req);
  }

  /**
   * Resolve a behavior bypassing the local cache.
   *
   * Always fetches from the server. Use this when you need the latest
   * configuration regardless of cache state.
   */
  async resolveFresh(req: ResolveRequest): Promise<ResolveResponse> {
    return this.resolveRemote(req);
  }

  private async resolveRemote(req: ResolveRequest): Promise<ResolveResponse> {
    const url = `${this.baseUrl}/v1/abm/resolve`;
    const body = JSON.stringify(this.reqToJson(req));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.environmentKey}`,
          "User-Agent": "FeatureSignals-ABM-Node/0.1.0",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => "");
        throw new ABMError(
          `resolve ${JSON.stringify(req.behaviorKey)}: status ${resp.status}: ${bodyText}`,
        );
      }

      let data: Record<string, unknown>;
      try {
        data = (await resp.json()) as Record<string, unknown>;
      } catch (err) {
        throw new ABMError(
          `resolve ${JSON.stringify(req.behaviorKey)}: invalid JSON response: ${String(err)}`,
          { cause: err },
        );
      }

      const result: ResolveResponse = {
        behaviorKey: (data.behavior_key as string) ?? req.behaviorKey,
        variant: (data.variant as string) ?? "",
        config: data.config as Record<string, unknown> | undefined,
        reason: (data.reason as ResolveResponse["reason"]) ?? "default",
        resolvedAt: (data.resolved_at as string) ?? new Date().toISOString(),
        isSticky: (data.is_sticky as boolean) ?? false,
        ttlSeconds: (data.ttl_seconds as number) ?? this.cacheTtl,
      };

      // Update cache.
      if (this.cacheTtl > 0) {
        const ttl = result.ttlSeconds > 0 ? result.ttlSeconds : this.cacheTtl;
        const cacheKey = `${req.behaviorKey}:${req.agentId}`;
        this.cache.set(cacheKey, {
          response: result,
          expiresAt: Date.now() + ttl * 1000,
        });
      }

      return result;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof ABMError) {
        throw err;
      }
      throw new ABMError(
        `resolve ${JSON.stringify(req.behaviorKey)}: network error: ${String(err)}`,
        { cause: err },
      );
    }
  }

  // ── Track ─────────────────────────────────────────────────────────────

  /**
   * Record an agent behavior event for analytics and billing.
   *
   * Events are queued in a local buffer and flushed periodically (every 5s)
   * or when the buffer reaches 256 events — whichever comes first.
   * Per ABM_SDK_SPECIFICATION.md §4. Tracking is fire-and-forget.
   */
  track(event: TrackEvent): void {
    if (!event.recordedAt) {
      event.recordedAt = new Date().toISOString();
    }
    this.enqueue(event);
  }

  /**
   * Record multiple events. Events are added to the same buffer as track()
   * and flushed together per ABM_SDK_SPECIFICATION.md §4.
   */
  trackBatch(events: TrackEvent[]): void {
    if (events.length === 0) return;
    const now = new Date().toISOString();
    for (const evt of events) {
      if (!evt.recordedAt) {
        evt.recordedAt = now;
      }
      this.enqueue(evt);
    }
  }

  // ── Event Buffering (spec §4) ─────────────────────────────────────────

  /** Add a single event to the buffer; flush immediately if full. */
  private enqueue(event: TrackEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= BUFFER_MAX_SIZE) {
      this.flushBuffer();
    }
  }

  /** Drain the buffer and send events to the server via batch endpoint. */
  private flushBuffer(): void {
    if (this.eventBuffer.length === 0 || this.flushing) return;

    const batch = this.eventBuffer.splice(0, this.eventBuffer.length);
    this.sendBatchWithRetry(batch, 0);
  }

  /** Send a batch of events with exponential backoff retry. */
  private sendBatchWithRetry(events: TrackEvent[], attempt: number): void {
    this.flushing = true;

    const url = `${this.baseUrl}/v1/abm/track/batch`;
    const body = JSON.stringify(events.map((e) => this.eventToJson(e)));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.environmentKey}`,
      },
      body,
      signal: controller.signal,
    })
      .then(async (resp: Response) => {
        clearTimeout(timeout);
        this.flushing = false;
        if (resp.status !== 202) {
          const bodyText = await resp.text().catch(() => "");
          this.logger.warn(
            `[featuresignals-abm] flush buffer: status ${resp.status}: ${bodyText}`,
          );
          this.retryOrDrop(events, attempt);
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        this.flushing = false;
        this.logger.warn(
          `[featuresignals-abm] flush buffer: network error: ${String(err)}`,
        );
        this.retryOrDrop(events, attempt);
      });
  }

  /** Retry with exponential backoff or drop events after max retries. */
  private retryOrDrop(events: TrackEvent[], attempt: number): void {
    if (attempt >= RETRY_BACKOFF_MS.length) {
      this.logger.warn(
        `[featuresignals-abm] dropping ${events.length} events after ${attempt} failed attempts`,
      );
      return;
    }
    const delay = RETRY_BACKOFF_MS[attempt];
    setTimeout(() => this.sendBatchWithRetry(events, attempt + 1), delay);
  }

  // ── Cache Management ──────────────────────────────────────────────────

  /**
   * Clear the local resolution cache for a specific behavior+agent pair.
   */
  invalidateCache(behaviorKey: string, agentId: string): void {
    const cacheKey = `${behaviorKey}:${agentId}`;
    this.cache.delete(cacheKey);
  }

  /** Clear all locally cached resolutions. */
  invalidateAllCache(): void {
    this.cache.clear();
  }

  /** Current number of cached entries (for observability). */
  get cacheSize(): number {
    return this.cache.size;
  }

  /** Clean up resources. Flushes any pending events, stops the timer. Safe to call multiple times. */
  close(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Final flush of any pending events.
    this.flushBuffer();
    this.invalidateAllCache();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  // reqToJson and eventToJson convert language-idiomatic camelCase fields
  // to the snake_case JSON wire format expected by the FeatureSignals API.
  // See ABM_SDK_SPECIFICATION.md §2 naming convention note.

  private reqToJson(req: ResolveRequest): Record<string, unknown> {
    const d: Record<string, unknown> = {
      behavior_key: req.behaviorKey,
      agent_id: req.agentId,
      agent_type: req.agentType,
    };
    if (req.userId !== undefined) d.user_id = req.userId;
    if (req.attributes !== undefined) d.attributes = req.attributes;
    if (req.sessionId !== undefined) d.session_id = req.sessionId;
    return d;
  }

  private eventToJson(event: TrackEvent): Record<string, unknown> {
    const d: Record<string, unknown> = {
      behavior_key: event.behaviorKey,
      agent_id: event.agentId,
      agent_type: event.agentType,
      variant: event.variant,
      action: event.action,
    };
    if (event.outcome !== undefined) d.outcome = event.outcome;
    if (event.value !== undefined) d.value = event.value;
    if (event.metadata !== undefined) d.metadata = event.metadata;
    if (event.userId !== undefined) d.user_id = event.userId;
    if (event.sessionId !== undefined) d.session_id = event.sessionId;
    if (event.recordedAt !== undefined) d.recorded_at = event.recordedAt;
    return d;
  }
}

// ── ABM Error ─────────────────────────────────────────────────────────────

/**
 * Base error for all ABM SDK errors.
 *
 * The ABM SDK does not throw on tracking failures (those are logged).
 * Resolve failures throw ABMError — callers should handle with a fallback.
 */
export class ABMError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ABMError";
  }
}
