/**
 * FeatureSignals Agent Behavior Mesh (ABM) Node.js/TypeScript SDK.
 *
 * ABM is the agent equivalent of feature flags. It allows customer applications
 * to manage AI agent behaviors — resolving behavior variants, tracking agent
 * actions, and measuring outcomes — with the same governance and observability
 * as feature flags.
 *
 * Basic usage:
 * ```ts
 * import { ABMClient, ResolveRequest, TrackEvent } from "@featuresignals/node/abm";
 *
 * const client = new ABMClient({
 *   environmentKey: process.env.FS_ENVIRONMENT_KEY!,
 * });
 *
 * const resp = await client.resolve({
 *   behaviorKey: "search-ranking",
 *   agentId: "recommender-v2",
 *   agentType: "recommender",
 * });
 *
 * client.track({
 *   behaviorKey: "search-ranking",
 *   agentId: "recommender-v2",
 *   variant: resp.variant,
 *   action: "search.ranked",
 *   outcome: "displayed",
 * });
 * ```
 *
 * @module abm
 */

export { ABMClient } from "./client.ts";
export type { ABMConfig, ResolveRequest, ResolveResponse, TrackEvent } from "./types.ts";
export { ABMError } from "./client.ts";
