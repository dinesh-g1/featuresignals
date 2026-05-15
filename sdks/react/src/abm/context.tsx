/**
 * React Context + Provider for the ABM client.
 *
 * The ABM client is a singleton stored in the provider. Hooks use
 * this context to access the client for resolve/track operations.
 *
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 *
 * @module abm/context
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ABMConfig } from "./types.ts";

// ── LRU Cache ─────────────────────────────────────────────────────────────

interface CacheEntry {
  response: import("./types.ts").ResolveResponse;
  expiresAt: number;
}

/**
 * LRU cache with TTL. Uses a Map with delete-and-reinsert for LRU ordering.
 * Keyed by `{behaviorKey}:{agentId}`. Per ABM_SDK_SPECIFICATION.md §1.3.
 */
class LRUCache {
  private map = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (entry) {
      // Refresh LRU order: delete and re-insert at end.
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

const DEFAULT_BASE_URL = "https://app.featuresignals.io";
const DEFAULT_CACHE_TTL = 10;
const DEFAULT_MAX_CACHE = 10000;
const DEFAULT_TIMEOUT_MS = 5000;
const BUFFER_MAX_SIZE = 256;
const FLUSH_INTERVAL_MS = 5000;
const RETRY_BACKOFF_MS = [100, 1000, 10000];

/**
 * Client for the FeatureSignals Agent Behavior Mesh (ABM).
 *
 * Resolves which behavior variant an agent should use and tracks agent
 * actions for analytics. Resolved behaviors are cached locally for fast access.
 *
 * **Error handling:** Per ABM_SDK_SPECIFICATION.md §3, this client MUST NOT
 * throw. All errors result in a fallback response with `reason: "fallback"`.
 */
export class ABMClient {
  private baseUrl: string;
  private environmentKey: string;
  private cacheTtl: number;
  cache: LRUCache;
  private timeoutMs: number;

  // Event buffering (per ABM_SDK_SPECIFICATION.md §4).
  private eventBuffer: TrackEventInternal[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private closed = false;

  constructor(config: ABMConfig) {
    if (!config.environmentKey) {
      throw new Error("ABMClient: environmentKey is required");
    }

    this.environmentKey = config.environmentKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.cacheTtl = config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cache = new LRUCache(config.maxCacheEntries ?? DEFAULT_MAX_CACHE);

    // Start periodic flush timer.
    this.flushTimer = setInterval(() => this.flushBuffer(), FLUSH_INTERVAL_MS);
    // Allow timer to not keep process alive (Node.js).
    if (
      this.flushTimer &&
      typeof this.flushTimer === "object" &&
      "unref" in this.flushTimer
    ) {
      // Allow timer to not keep process alive in Node.js environments.
      // Use type-safe approach without NodeJS namespace dependency.
      const timer = this.flushTimer as unknown as { unref?: () => void };
      timer.unref?.();
    }
  }

  // ── Resolve (per contract) ────────────────────────────────────────────

  /**
   * Resolve which variant an agent should use for a behavior.
   *
   * Results are cached locally. Use {@link resolveFresh} to bypass cache.
   * **Never throws** — returns a fallback response on error.
   */
  async resolve(
    behaviorKey: string,
    agentId: string,
    attributes?: Record<string, unknown>,
  ): Promise<import("./types.ts").ResolveResponse> {
    const cacheKey = `${behaviorKey}:${agentId}`;

    // Check cache first.
    if (this.cacheTtl > 0) {
      const entry = this.cache.get(cacheKey);
      if (entry && Date.now() < entry.expiresAt) {
        return entry.response;
      }
    }

    return this.resolveRemote(behaviorKey, agentId, attributes);
  }

  /**
   * Resolve a behavior bypassing the local cache.
   * **Never throws** — returns a fallback response on error.
   */
  async resolveFresh(
    behaviorKey: string,
    agentId: string,
    attributes?: Record<string, unknown>,
  ): Promise<import("./types.ts").ResolveResponse> {
    return this.resolveRemote(behaviorKey, agentId, attributes);
  }

  private async resolveRemote(
    behaviorKey: string,
    agentId: string,
    attributes?: Record<string, unknown>,
  ): Promise<import("./types.ts").ResolveResponse> {
    const url = `${this.baseUrl}/v1/client/${encodeURIComponent(this.environmentKey)}/abm/resolve`;
    const body = JSON.stringify({
      behavior_key: behaviorKey,
      agent_id: agentId,
      attributes: attributes ?? {},
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.environmentKey}`,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.status === 404) {
        return this.fallbackResponse(behaviorKey, "", {}, "default");
      }

      if (resp.status === 429) {
        // Try to respect Retry-After, but return cached if available.
        const cacheKey = `${behaviorKey}:${agentId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return { ...cached.response, reason: "fallback" };
        }
        return this.fallbackResponse(behaviorKey, "", {}, "fallback");
      }

      if (!resp.ok) {
        // 5xx or other errors — return fallback with cached if available.
        const cacheKey = `${behaviorKey}:${agentId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return { ...cached.response, reason: "fallback" };
        }
        return this.fallbackResponse(behaviorKey, "", {}, "fallback");
      }

      const data: Record<string, unknown> = await resp.json();

      const result: import("./types.ts").ResolveResponse = {
        behaviorKey: (data.behavior_key as string) ?? behaviorKey,
        variant: (data.variant as string) ?? "",
        configuration:
          (data.configuration as Record<string, unknown>) ??
          (data.config as Record<string, unknown>) ??
          {},
        reason:
          (data.reason as import("./types.ts").ResolveResponse["reason"]) ??
          "default",
        cacheTtlSeconds: (data.cache_ttl_seconds as number) ?? this.cacheTtl,
        evaluatedAt: (data.evaluated_at as string) ?? new Date().toISOString(),
      };

      // Update cache.
      if (this.cacheTtl > 0) {
        const ttl =
          result.cacheTtlSeconds > 0 ? result.cacheTtlSeconds : this.cacheTtl;
        const cacheKey = `${behaviorKey}:${agentId}`;
        this.cache.set(cacheKey, {
          response: result,
          expiresAt: Date.now() + ttl * 1000,
        });
      }

      return result;
    } catch {
      clearTimeout(timeout);
      // Network error or timeout — return fallback with cached if available.
      const cacheKey = `${behaviorKey}:${agentId}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached.response, reason: "fallback" };
      }
      return this.fallbackResponse(behaviorKey, "", {}, "fallback");
    }
  }

  private fallbackResponse(
    behaviorKey: string,
    variant: string,
    configuration: Record<string, unknown>,
    reason: import("./types.ts").ResolveResponse["reason"],
  ): import("./types.ts").ResolveResponse {
    return {
      behaviorKey,
      variant,
      configuration,
      reason,
      cacheTtlSeconds: this.cacheTtl,
      evaluatedAt: new Date().toISOString(),
    };
  }

  // ── Track (per contract) ──────────────────────────────────────────────

  /**
   * Record an agent behavior event for analytics and billing.
   *
   * Events are queued in a local buffer and flushed periodically (every 5s)
   * or when the buffer reaches 256 events. Fire-and-forget.
   * Per ABM_SDK_SPECIFICATION.md §4.
   */
  track(
    behaviorKey: string,
    agentId: string,
    variant: string,
    event: string,
    value?: number,
  ): void {
    const trackEvent: TrackEventInternal = {
      behaviorKey,
      agentId,
      variant,
      event,
      value,
      timestamp: new Date().toISOString(),
    };
    this.enqueue(trackEvent);
  }

  /**
   * Record multiple events. They are added to the same buffer and flushed
   * together. Per ABM_SDK_SPECIFICATION.md §4.
   */
  trackBatch(events: import("./types.ts").TrackEvent[]): void {
    if (events.length === 0) return;
    const now = new Date().toISOString();
    for (const evt of events) {
      this.enqueue({
        behaviorKey: evt.behaviorKey,
        agentId: evt.agentId,
        variant: evt.variant,
        event: evt.event,
        value: evt.value,
        timestamp: evt.timestamp || now,
      });
    }
  }

  // ── Event Buffering (spec §4) ─────────────────────────────────────────

  private enqueue(event: TrackEventInternal): void {
    if (this.closed) return;
    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= BUFFER_MAX_SIZE) {
      this.flushBuffer();
    }
  }

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0 || this.flushing || this.closed) return;

    const batch = this.eventBuffer.splice(0, this.eventBuffer.length);
    this.sendBatchWithRetry(batch, 0);
  }

  private sendBatchWithRetry(
    events: TrackEventInternal[],
    attempt: number,
  ): void {
    this.flushing = true;

    const url = `${this.baseUrl}/v1/client/${encodeURIComponent(this.environmentKey)}/abm/track`;
    const body = JSON.stringify(
      events.map((e) => ({
        behavior_key: e.behaviorKey,
        agent_id: e.agentId,
        variant: e.variant,
        event: e.event,
        value: e.value,
        timestamp: e.timestamp,
      })),
    );

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
        if (resp.status !== 202 && resp.status !== 200) {
          this.retryOrDrop(events, attempt);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        this.flushing = false;
        this.retryOrDrop(events, attempt);
      });
  }

  private retryOrDrop(events: TrackEventInternal[], attempt: number): void {
    if (attempt >= RETRY_BACKOFF_MS.length) {
      // Drop events after max retries.
      return;
    }
    const delay = RETRY_BACKOFF_MS[attempt];
    setTimeout(() => this.sendBatchWithRetry(events, attempt + 1), delay);
  }

  // ── Cache Management ──────────────────────────────────────────────────

  /** Clear the local resolution cache for a specific behavior+agent pair. */
  invalidateCache(behaviorKey: string, agentId: string): void {
    const cacheKey = `${behaviorKey}:${agentId}`;
    this.cache.delete(cacheKey);
  }

  /** Clear all locally cached resolutions. */
  invalidateAllCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up resources. Flushes pending events, stops the timer.
   * Returns a Promise that resolves when pending flushes complete.
   */
  async close(): Promise<void> {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush before marking closed (flushBuffer bails out if closed).
    this.flushBuffer();
    // Wait for any in-flight flush to complete (poll flushing flag).
    let retries = 0;
    while (this.flushing && retries < 50) {
      await new Promise((r) => setTimeout(r, 100));
      retries++;
    }
    this.closed = true;
    this.invalidateAllCache();
  }
}

/** Internal track event shape used inside the buffer. */
interface TrackEventInternal {
  behaviorKey: string;
  agentId: string;
  variant: string;
  event: string;
  value?: number;
  timestamp: string;
}

// ── React Context ─────────────────────────────────────────────────────────

/** Context value holding the ABM client instance. */
export interface ABMContextValue {
  client: ABMClient | null;
}

export const ABMContext = createContext<ABMContextValue>({ client: null });

// ── Provider ──────────────────────────────────────────────────────────────

export interface ABMProviderProps {
  config: ABMConfig;
  children: ReactNode;
}

/**
 * Provider that creates an ABM client and makes it available via context.
 *
 * The client is created once (lazily) and survives re-renders.
 * Wrap your app (or a subtree) with this provider to use ABM hooks.
 *
 * ```tsx
 * <ABMProvider config={{ environmentKey: "fs_env_abc123" }}>
 *   <App />
 * </ABMProvider>
 * ```
 */
export function ABMProvider({ config, children }: ABMProviderProps) {
  const client = useMemo(() => {
    try {
      return new ABMClient(config);
    } catch {
      return null;
    }
  }, [
    config.environmentKey,
    config.baseUrl,
    config.cacheTtlSeconds,
    config.maxCacheEntries,
    config.timeoutMs,
  ]);

  const value = useMemo<ABMContextValue>(() => ({ client }), [client]);

  return <ABMContext.Provider value={value}>{children}</ABMContext.Provider>;
}

/** Hook to access the raw ABM client from context. Used internally by the hooks. */
export function useABMClient(): ABMClient | null {
  return useContext(ABMContext).client;
}
