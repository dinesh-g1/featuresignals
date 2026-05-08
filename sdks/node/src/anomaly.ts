/**
 * AnomalyDetector tracks evaluation patterns and emits warnings on
 * suspicious behaviour.
 *
 * Three anomaly types are detected:
 *
 *  1. **Rate anomaly** — the same flag is evaluated more than
 *     `rateThreshold` times within `rateWindowMs`. This typically
 *     signals an unintentional tight loop calling the evaluation API.
 *
 *  2. **Context anomaly** — the same flag is evaluated with an identical
 *     context key more than `contextThreshold` times within
 *     `contextWindowMs`. This often indicates a bug where a user/entity
 *     key is hardcoded rather than dynamically populated.
 *
 *  3. **Drift anomaly** — a flag that was previously found in the cache
 *     is now missing. This can indicate configuration drift or an
 *     out-of-sync cache.
 */

export type WarningLevel = "INFO" | "WARN" | "ERROR";

/** Structured anomaly warning. */
export interface Warning {
  /** Severity level. */
  level: WarningLevel;

  /** Machine-readable identifier for the warning type. */
  code: string;

  /** Human-readable description of the anomaly. */
  message: string;

  /** The flag this warning pertains to (empty if not applicable). */
  flagKey: string;

  /** When the warning was generated. */
  timestamp: Date;

  /** Additional structured data (rate, window, threshold, etc.). */
  detail: Record<string, unknown>;
}

/**
 * Callback for anomaly warnings. Register with `onWarning` in
 * client options or on the AnomalyDetector directly.
 *
 * The handler is called synchronously from the evaluation path, so it
 * must return quickly. For expensive operations (HTTP calls, file I/O),
 * defer the work asynchronously inside the handler.
 */
export type WarnHandler = (warning: Warning) => void;

export interface AnomalyDetectorConfig {
  /** Sliding window for rate anomaly detection (ms). Default: 1000. */
  rateWindowMs: number;

  /** Number of evaluations of the same flag within rateWindowMs that
   *  triggers a rate-anomaly warning. Default: 1000. */
  rateThreshold: number;

  /** Sliding window for context-anomaly detection (ms). Default: 10000. */
  contextWindowMs: number;

  /** Number of evaluations with identical context + flag within
   *  contextWindowMs that triggers a context-anomaly warning.
   *  Default: 100. */
  contextThreshold: number;
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  rateWindowMs: 1_000,
  rateThreshold: 1_000,
  contextWindowMs: 10_000,
  contextThreshold: 100,
};

/** How long to suppress repeat warnings for the same code+flag (ms). */
const SUPPRESS_INTERVAL_MS = 30_000;

/**
 * AnomalyDetector tracks evaluation patterns and emits warnings on
 * suspicious behaviour. It is safe for concurrent use (Node.js is
 * single-threaded, but the detector is designed to be called from
 * async contexts).
 */
export class AnomalyDetector {
  private cfg: AnomalyDetectorConfig;
  private handler: WarnHandler | null;

  // Rate tracking: flag key → array of evaluation timestamps.
  private rateBuckets = new Map<string, number[]>();

  // Context tracking: "flagKey\0contextKey" → array of timestamps.
  private ctxBuckets = new Map<string, number[]>();

  // Drift tracking: flags that have been seen at least once.
  private seenFlags = new Set<string>();

  // Suppression: "code\0flagKey" → last emit timestamp.
  private suppressMap = new Map<string, number>();

  constructor(cfg?: Partial<AnomalyDetectorConfig>, handler?: WarnHandler | null) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.handler = handler ?? null;
  }

  /** Update the warning handler. Pass null to silence warnings. */
  setHandler(handler: WarnHandler | null): void {
    this.handler = handler;
  }

  /**
   * Record a successful flag evaluation for anomaly detection.
   * Call this on every flag read.
   */
  recordEvaluation(flagKey: string): void {
    const now = Date.now();

    // Mark as seen for drift detection.
    this.seenFlags.add(flagKey);

    // Rate anomaly.
    let times = this.rateBuckets.get(flagKey);
    if (!times) {
      times = [];
      this.rateBuckets.set(flagKey, times);
    }
    times.push(now);
    this.pruneTimes(times, now, this.cfg.rateWindowMs);

    if (times.length >= this.cfg.rateThreshold) {
      this.emit({
        level: "WARN",
        code: "RATE_ANOMALY",
        message: `Flag '${flagKey}' is being evaluated at an unusually high rate (${times.length} times in the last ${this.cfg.rateWindowMs}ms). This may indicate a tight loop or missing memoisation.`,
        flagKey,
        timestamp: new Date(now),
        detail: {
          rate: times.length,
          windowMs: this.cfg.rateWindowMs,
          threshold: this.cfg.rateThreshold,
        },
      });
    }
  }

  /**
   * Record an evaluation with context for context-anomaly detection.
   */
  recordEvaluationWithContext(flagKey: string, contextKey: string): void {
    const now = Date.now();
    const composite = `${flagKey}\x00${contextKey}`;

    let times = this.ctxBuckets.get(composite);
    if (!times) {
      times = [];
      this.ctxBuckets.set(composite, times);
    }
    times.push(now);
    this.pruneTimes(times, now, this.cfg.contextWindowMs);

    if (times.length >= this.cfg.contextThreshold) {
      this.emit({
        level: "INFO",
        code: "CONTEXT_ANOMALY",
        message: `Flag '${flagKey}' is being evaluated with identical context '${contextKey}' repeatedly (${times.length} times). This may indicate a hardcoded context key — ensure the context key is dynamically set per user/request.`,
        flagKey,
        timestamp: new Date(now),
        detail: {
          count: times.length,
          windowMs: this.cfg.contextWindowMs,
          threshold: this.cfg.contextThreshold,
          contextKey,
        },
      });
    }
  }

  /**
   * Record that a flag was not found in the cache. If the flag was
   * previously seen (found), emits a drift warning.
   */
  recordMissing(flagKey: string): void {
    const now = Date.now();

    if (this.seenFlags.has(flagKey)) {
      this.emit({
        level: "ERROR",
        code: "DRIFT_ANOMALY",
        message: `Flag '${flagKey}' was previously available but is now missing. This indicates configuration drift — the flag may have been deleted or renamed on the server.`,
        flagKey,
        timestamp: new Date(now),
        detail: {},
      });
      // Remove so we don't spam on every subsequent miss.
      this.seenFlags.delete(flagKey);
    }
  }

  /** Clear all internal state. Useful for testing. */
  reset(): void {
    this.rateBuckets.clear();
    this.ctxBuckets.clear();
    this.seenFlags.clear();
    this.suppressMap.clear();
  }

  // ── Internal ───────────────────────────────────────────────

  private pruneTimes(times: number[], now: number, windowMs: number): void {
    const cutoff = now - windowMs;
    // Most timestamps are added at the end, so we can find the first
    // index that is >= cutoff and slice.
    let i = 0;
    while (i < times.length && times[i] < cutoff) {
      i++;
    }
    if (i > 0) {
      times.splice(0, i);
    }
  }

  private emit(warning: Warning): void {
    if (!this.handler) return;

    const suppressKey = `${warning.code}\x00${warning.flagKey}`;
    const lastEmit = this.suppressMap.get(suppressKey);
    if (lastEmit !== undefined && Date.now() - lastEmit < SUPPRESS_INTERVAL_MS) {
      return;
    }
    this.suppressMap.set(suppressKey, Date.now());
    this.handler(warning);
  }
}
