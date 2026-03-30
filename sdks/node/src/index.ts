export { FeatureSignalsClient } from "./client";
export { EvalContext } from "./context";
export type { ClientOptions } from "./client";

import { FeatureSignalsClient, ClientOptions } from "./client";

export function init(sdkKey: string, options?: Partial<ClientOptions>): FeatureSignalsClient {
  return new FeatureSignalsClient(sdkKey, options);
}

export default { init };
