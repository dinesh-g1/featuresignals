/**
 * FeatureSignals Agent Behavior Mesh (ABM) React SDK.
 *
 * ABM is the agent equivalent of feature flags. It allows customer applications
 * to manage AI agent behaviors — resolving behavior variants, tracking agent
 * actions, and measuring outcomes — with the same governance and observability
 * as feature flags.
 *
 * Basic usage:
 * ```tsx
 * import { ABMProvider, useABM, useABMTrack } from "@featuresignals/react/abm";
 *
 * function App() {
 *   return (
 *     <ABMProvider config={{ environmentKey: "fs_env_abc123" }}>
 *       <MyComponent />
 *     </ABMProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { variant, configuration, loading } = useABM("model-selection", "agent-123");
 *   const { track } = useABMTrack("model-selection", "agent-123", variant);
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <p>Using variant: {variant}</p>
 *       <button onClick={() => track("behavior.applied")}>Apply</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module abm
 */

export { ABMProvider, ABMClient, useABMClient, ABMContext } from "./context.js";
export type { ABMProviderProps, ABMContextValue } from "./context.js";
export { useABM, useABMFresh, useABMTrack } from "./hooks.js";
export type {
  ABMConfig,
  ResolveResponse,
  TrackEvent,
  UseABMResult,
  UseABMTrackResult,
} from "./types.js";
