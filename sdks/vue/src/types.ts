export interface FeatureSignalsPluginOptions {
  /** Environment API key (client-side key, e.g. "fs_cli_..."). */
  sdkKey: string;
  /** Environment slug (e.g. "production", "staging"). Required. */
  envKey: string;
  /** Base URL of the FeatureSignals API. Default: "https://api.featuresignals.com" */
  baseURL?: string;
  /** User key for targeting. Default: "anonymous" */
  userKey?: string;
  /**
   * Polling interval in ms. Default 30000. Set 0 to disable polling.
   * Polling is automatically disabled when streaming is enabled.
   */
  pollingIntervalMs?: number;
  /** Enable SSE streaming for real-time flag updates. Default false. */
  streaming?: boolean;
}

export interface FeatureSignalsState {
  flags: Record<string, unknown>;
  ready: boolean;
  error: Error | null;
}
