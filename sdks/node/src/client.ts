import { EventEmitter } from "events";
import type { EvalContext } from "./context.ts";

export interface ClientOptions {
  /** Base URL of the FeatureSignals API. */
  baseURL: string;
  /** Environment slug (e.g. "production", "staging"). Required. */
  envKey: string;
  /** Polling interval in milliseconds (default 30 000). */
  pollingIntervalMs: number;
  /** Enable SSE streaming for real-time flag updates. */
  streaming: boolean;
  /** Base SSE reconnect delay in ms (default 1 000). Used as the starting
   *  point for exponential backoff (×2 per attempt, capped at 30 s, +0–25 % jitter). */
  sseRetryMs: number;
  /** Request timeout in milliseconds (default 10 000). */
  timeoutMs: number;
  /** Default evaluation context. */
  context: EvalContext;
}

const DEFAULT_OPTIONS: Omit<ClientOptions, "envKey"> = {
  baseURL: "https://api.featuresignals.com",
  pollingIntervalMs: 30_000,
  streaming: false,
  sseRetryMs: 1_000,
  timeoutMs: 10_000,
  context: { key: "server" },
};

export interface ClientEvents {
  ready: [];
  error: [Error];
  update: [Record<string, unknown>];
}

/**
 * FeatureSignalsClient fetches flag values from the server, caches them
 * locally, and keeps them up to date via polling or SSE streaming.
 *
 * All flag reads (`boolVariation`, etc.) are local — zero network calls
 * per evaluation after init.
 *
 * Events:
 *  - `ready`  — emitted once after the first successful flag fetch
 *  - `error`  — emitted on fetch/stream failures
 *  - `update` — emitted each time the flag map is refreshed
 */
export class FeatureSignalsClient extends EventEmitter {
  private static readonly SSE_BACKOFF_MAX_MS = 30_000;
  private static readonly SSE_BACKOFF_MULTIPLIER = 2;
  private static readonly SSE_JITTER_FACTOR = 0.25;

  private sdkKey: string;
  private options: ClientOptions;
  private flags: Record<string, unknown> = {};
  private _ready = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private sseAbort?: AbortController;
  private sseAttempt = 0;
  private closed = false;

  constructor(sdkKey: string, options: Pick<ClientOptions, "envKey"> & Partial<Omit<ClientOptions, "envKey">>) {
    super();
    if (!sdkKey) throw new Error("sdkKey is required");
    if (!options?.envKey) throw new Error("options.envKey is required (e.g. 'production')");
    this.sdkKey = sdkKey;
    this.options = { ...DEFAULT_OPTIONS, ...options } as ClientOptions;

    // Initial fetch, then start background updates.
    this.refresh()
      .then(() => this.markReady())
      .catch((err) => this.emitError(err));

    if (this.options.streaming) {
      this.startSSE();
    } else {
      this.startPolling();
    }
  }

  // ── Flag access ────────────────────────────────────────────

  boolVariation(key: string, ctx: EvalContext, fallback: boolean): boolean {
    const val = this.flags[key];
    return typeof val === "boolean" ? val : fallback;
  }

  stringVariation(key: string, ctx: EvalContext, fallback: string): string {
    const val = this.flags[key];
    return typeof val === "string" ? val : fallback;
  }

  numberVariation(key: string, ctx: EvalContext, fallback: number): number {
    const val = this.flags[key];
    return typeof val === "number" ? val : fallback;
  }

  /**
   * Returns the flag value cast to `T`, or `fallback` if the flag is missing.
   *
   * **Note:** No runtime shape validation is performed — the caller is
   * responsible for ensuring the stored value conforms to `T`.  This is a
   * deliberate SDK design choice; use a schema library (e.g. zod) at the
   * call-site if strict validation is needed.
   */
  jsonVariation<T = unknown>(key: string, ctx: EvalContext, fallback: T): T {
    return (this.flags[key] as T) ?? fallback;
  }

  allFlags(): Record<string, unknown> {
    return { ...this.flags };
  }

  isReady(): boolean {
    return this._ready;
  }

  /** Returns a promise that resolves when the client has loaded flags. */
  waitForReady(timeoutMs = 10_000): Promise<void> {
    if (this._ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("waitForReady timed out"));
      }, timeoutMs);
      this.once("ready", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.sseAbort) this.sseAbort.abort();
  }

  // ── Internal ───────────────────────────────────────────────

  /** Fetch flags from the server. Exported for testing. */
  async refresh(): Promise<void> {
    const envKey = encodeURIComponent(this.options.envKey);
    const ctxKey = encodeURIComponent(this.options.context.key);
    const url = `${this.options.baseURL}/v1/client/${envKey}/flags?key=${ctxKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": this.sdkKey },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      this.flags = (await res.json()) as Record<string, unknown>;
      this.emit("update", { ...this.flags });
    } finally {
      clearTimeout(timeout);
    }
  }

  private markReady(): void {
    if (this._ready) return;
    this._ready = true;
    this.emit("ready");
  }

  private emitError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.emit("error", error);
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      if (this.closed) return;
      this.refresh()
        .then(() => this.markReady())
        .catch((err) => this.emitError(err));
    }, this.options.pollingIntervalMs);
  }

  private startSSE(): void {
    this.sseLoop().catch((err) => this.emitError(err));
  }

  private async sseLoop(): Promise<void> {
    this.sseAttempt = 0;
    while (!this.closed) {
      try {
        await this.connectSSE();
        this.sseAttempt = 0;
      } catch (err) {
        if (this.closed) return;
        this.emitError(err);
      }
      if (this.closed) return;
      const delay = this.backoffDelay(this.sseAttempt);
      this.sseAttempt++;
      await this.sleep(delay);
    }
  }

  private async connectSSE(): Promise<void> {
    const envKey = encodeURIComponent(this.options.envKey);
    const url = `${this.options.baseURL}/v1/stream/${envKey}?api_key=${encodeURIComponent(this.sdkKey)}`;

    this.sseAbort = new AbortController();
    const res = await fetch(url, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: this.sseAbort.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SSE connect: HTTP ${res.status}: ${body}`);
    }

    if (!res.body) throw new Error("SSE: no response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            if (eventType === "flag-update") {
              await this.refresh().catch((err) => this.emitError(err));
            }
            eventType = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /** Exponential backoff with random jitter: base × 2^attempt, capped, +0–25 % jitter. */
  private backoffDelay(attempt: number): number {
    const base = Math.min(
      this.options.sseRetryMs * Math.pow(FeatureSignalsClient.SSE_BACKOFF_MULTIPLIER, attempt),
      FeatureSignalsClient.SSE_BACKOFF_MAX_MS,
    );
    const jitter = base * FeatureSignalsClient.SSE_JITTER_FACTOR * Math.random();
    return base + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
