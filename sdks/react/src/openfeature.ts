/**
 * OpenFeature Web Provider for FeatureSignals React SDK.
 *
 * Requires `@openfeature/web-sdk` and optionally `@openfeature/react-sdk`
 * as peer dependencies.
 *
 * Usage:
 * ```ts
 * import { OpenFeature } from "@openfeature/web-sdk";
 * import { FeatureSignalsWebProvider } from "@featuresignals/react/openfeature";
 *
 * const provider = new FeatureSignalsWebProvider({
 *   sdkKey: "fs_cli_...",
 *   envKey: "production",
 * });
 * await OpenFeature.setProviderAndWait(provider);
 * const client = OpenFeature.getClient();
 * const enabled = client.getBooleanValue("dark-mode", false);
 * ```
 */

const ErrorCode = {
  FLAG_NOT_FOUND: "FLAG_NOT_FOUND",
  TYPE_MISMATCH: "TYPE_MISMATCH",
} as const;

const Reason = {
  CACHED: "CACHED",
  ERROR: "ERROR",
} as const;

export interface ResolutionDetails<T> {
  value: T;
  variant?: string;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
  flagMetadata?: Record<string, unknown>;
}

export interface WebProviderOptions {
  /** Environment API key (client-side key, e.g. "fs_cli_..."). */
  sdkKey: string;
  /** Environment slug (e.g. "production"). */
  envKey: string;
  /** Base URL of the FeatureSignals API. */
  baseURL?: string;
  /** User key for targeting. Default "anonymous". */
  userKey?: string;
  /** Polling interval in ms. Default 30000. */
  pollingIntervalMs?: number;
  /** Enable SSE streaming. Default false. */
  streaming?: boolean;
}

/**
 * FeatureSignalsWebProvider implements the OpenFeature web provider
 * interface (synchronous resolution methods, initialize, onClose).
 *
 * It fetches flags from the FeatureSignals API, caches them locally,
 * and provides synchronous lookups for the OpenFeature client.
 */
export class FeatureSignalsWebProvider {
  readonly metadata = { name: "FeatureSignals" } as const;
  readonly runsOn = "client" as const;

  private flags: Record<string, unknown> = {};
  private opts: Required<WebProviderOptions>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private eventSource?: EventSource;

  constructor(options: WebProviderOptions) {
    this.opts = {
      baseURL: "https://api.featuresignals.com",
      userKey: "anonymous",
      pollingIntervalMs: 30_000,
      streaming: false,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    await this.fetchFlags();
    this.startBackground();
  }

  async onClose(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
  ): ResolutionDetails<boolean> {
    const val = this.flags[flagKey];
    if (val === undefined) {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.FLAG_NOT_FOUND };
    }
    if (typeof val !== "boolean") {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.TYPE_MISMATCH };
    }
    return { value: val, reason: Reason.CACHED };
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
  ): ResolutionDetails<string> {
    const val = this.flags[flagKey];
    if (val === undefined) {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.FLAG_NOT_FOUND };
    }
    if (typeof val !== "string") {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.TYPE_MISMATCH };
    }
    return { value: val, reason: Reason.CACHED };
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
  ): ResolutionDetails<number> {
    const val = this.flags[flagKey];
    if (val === undefined) {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.FLAG_NOT_FOUND };
    }
    if (typeof val !== "number") {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.TYPE_MISMATCH };
    }
    return { value: val, reason: Reason.CACHED };
  }

  resolveObjectEvaluation<T = unknown>(
    flagKey: string,
    defaultValue: T,
  ): ResolutionDetails<T> {
    const val = this.flags[flagKey];
    if (val === undefined) {
      return { value: defaultValue, reason: Reason.ERROR, errorCode: ErrorCode.FLAG_NOT_FOUND };
    }
    return { value: val as T, reason: Reason.CACHED };
  }

  private async fetchFlags(): Promise<void> {
    const { baseURL, envKey, userKey, sdkKey } = this.opts;
    const url = `${baseURL}/v1/client/${encodeURIComponent(envKey)}/flags?key=${encodeURIComponent(userKey)}`;
    const res = await fetch(url, { headers: { "X-API-Key": sdkKey } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (data !== null && typeof data === "object" && !Array.isArray(data)) {
      this.flags = data as Record<string, unknown>;
    }
  }

  private startBackground(): void {
    const { streaming, pollingIntervalMs, baseURL, envKey, sdkKey } = this.opts;
    if (streaming && typeof EventSource !== "undefined") {
      const sseUrl = `${baseURL}/v1/stream/${encodeURIComponent(envKey)}?api_key=${encodeURIComponent(sdkKey)}`;
      this.eventSource = new EventSource(sseUrl);
      this.eventSource.addEventListener("flag-update", () => {
        this.fetchFlags().catch(() => {});
      });
    } else if (pollingIntervalMs > 0) {
      this.pollTimer = setInterval(() => {
        this.fetchFlags().catch(() => {});
      }, pollingIntervalMs);
    }
  }
}
