export { FeatureSignalsClient } from "./client.ts";
export { EvalContext } from "./context.ts";
export { FeatureSignalsProvider } from "./openfeature.ts";
export type { ClientOptions, ClientEvents } from "./client.ts";
export type { EvaluationContext, ResolutionDetails, ProviderMetadata } from "./openfeature.ts";

import { FeatureSignalsClient, ClientOptions } from "./client.ts";

/**
 * Convenience initialiser — creates and returns a new client.
 *
 * ```ts
 * import fs from "@featuresignals/node";
 * const client = fs.init("fs_srv_...", {
 *   envKey: "production",
 *   baseURL: "http://localhost:8080",
 * });
 * await client.waitForReady();
 * const darkMode = client.boolVariation("dark-mode", { key: "user-1" }, false);
 * ```
 */
export function init(
  sdkKey: string,
  options: Pick<ClientOptions, "envKey"> & Partial<Omit<ClientOptions, "envKey">>,
): FeatureSignalsClient {
  return new FeatureSignalsClient(sdkKey, options);
}

export default { init };
