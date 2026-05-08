export { FeatureSignalsClient } from "./client.ts";
export type { ClientOptions, ClientEvents } from "./client.ts";

export type { EvalContext } from "./context.ts";

export { EvaluationReason } from "./evaluation.ts";
export type { EvaluationDetail } from "./evaluation.ts";

export { AnomalyDetector } from "./anomaly.ts";
export type {
  AnomalyDetectorConfig,
  WarnHandler,
  Warning,
  WarningLevel,
} from "./anomaly.ts";

export { FeatureSignalsProvider } from "./openfeature.ts";
export type { ResolutionDetails, ProviderMetadata } from "./openfeature.ts";

import { FeatureSignalsClient, type ClientOptions } from "./client.ts";

/**
 * Convenience initialiser — creates and returns a new client.
 *
 * ```ts
 * import fs from "@featuresignals/node";
 * const client = fs.init("fs_srv_...", {
 *   envKey: "production",
 *   baseURL: "http://localhost:8080",
 *   onWarning: (w) => console.warn("[fs]", w.code, w.message),
 * });
 * await client.waitForReady();
 *
 * // Simple evaluation
 * const darkMode = client.boolVariation("dark-mode", { key: "user-1" }, false);
 *
 * // Rich evaluation with detail
 * const detail = client.boolDetail("dark-mode", { key: "user-1" }, false);
 * console.log(detail.reason, `${detail.evaluationTimeMs.toFixed(2)}ms`);
 * ```
 */
export function init(
  sdkKey: string,
  options: Pick<ClientOptions, "envKey"> &
    Partial<Omit<ClientOptions, "envKey">>,
): FeatureSignalsClient {
  return new FeatureSignalsClient(sdkKey, options);
}

export default { init };
