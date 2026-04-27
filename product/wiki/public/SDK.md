---
title: SDK Architecture & Patterns
tags: [sdk, development, core]
domain: sdk
sources:
  - sdks/go/README.md (Go SDK API reference, options, thread safety, OpenFeature)
  - sdks/node/README.md (Node.js SDK API reference, events, TypeScript types)
  - sdks/python/README.md (Python SDK API reference, callbacks, Flask/FastAPI patterns)
  - sdks/java/README.md (Java SDK API reference, Spring Boot patterns, AutoCloseable)
  - sdks/dotnet/README.md (.NET SDK API reference, ASP.NET Core DI, hosted service patterns)
  - sdks/ruby/README.md (Ruby SDK API reference, Rails initializer, stdlib-only)
  - sdks/react/README.md (React SDK provider/hooks, client-side patterns)
  - sdks/vue/README.md (Vue SDK plugin/composables, client-side patterns)
  - docs/docs/sdks/overview.md (SDK architecture overview, common patterns)
  - docs/docs/sdks/go.md (Go SDK docs-site reference)
  - docs/docs/sdks/nodejs.md (Node.js SDK docs-site reference)
  - docs/docs/sdks/python.md (Python SDK docs-site reference)
  - docs/docs/sdks/java.md (Java SDK docs-site reference)
  - docs/docs/sdks/dotnet.md (.NET SDK docs-site reference)
  - docs/docs/sdks/ruby.md (Ruby SDK docs-site reference)
  - docs/docs/sdks/react.md (React SDK docs-site reference)
  - docs/docs/sdks/vue.md (Vue SDK docs-site reference)
  - docs/docs/sdks/openfeature.md (OpenFeature provider integration across all SDKs)
  - server/internal/eval/engine.go (Evaluation engine: flag lookup, targeting rules, rollout, variants)
  - server/internal/eval/hash.go (MurmurHash3 consistent hashing for bucketing)
  - server/internal/domain/eval_context.go (EvalContext type definition)
  - server/internal/domain/ruleset.go (Ruleset type definition)
related:
  - [[ARCHITECTURE.md]] (Evaluation hot path, consistent hashing, data flow)
  - [[DEVELOPMENT.md]] (Go standards, package map, testing patterns)
  - [[PERFORMANCE.md]] (Eval latency benchmarks, cache hit rates)
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

FeatureSignals ships **8 official SDKs** — 6 server-side (Go, Node.js, Python, Java, .NET, Ruby) and 2 client-side (React, Vue). All SDKs follow the same core architecture: fetch flags on startup, cache locally, evaluate with zero network calls, and keep flags fresh via background polling or SSE streaming. Every SDK ships a built-in [OpenFeature](https://openfeature.dev) provider for vendor-neutral evaluation.

This page documents the cross-SDK contract: the shared patterns, language-specific deviations, consistent hashing algorithm, OpenFeature bridge, and the checklist for adding a new SDK.

---

## SDK Design Philosophy

The SDK architecture is built on five principles that apply across every language:

### 1. Local Evaluation

Every flag evaluation reads from an in-memory cache. There are zero network calls per `BoolVariation` / `boolVariation` / `bool_variation` call. After initialization, the SDK is entirely self-sufficient — it can evaluate every flag for any user context against the cached ruleset. This guarantees sub-millisecond evaluation latency regardless of network conditions.

The server-side counterpart (the `eval.Engine` in `server/internal/eval/engine.go`) implements the same evaluation algorithm. The SDKs implement a **client-side subset**: they do not re-implement the full targeting rule engine. Instead, the server pre-computes flag values for evaluation contexts and returns the resolved values in the flag payload. The SDK simply maps flag keys to cached values and applies percentage rollouts based on the consistent hash of (flag key + user key).

### 2. OpenFeature Providers

Every SDK ships a built-in OpenFeature provider (`FeatureSignalsProvider` or equivalent). This is not an optional add-on — it is a first-class export from the SDK package. Users can choose between the native SDK API and the OpenFeature API without installing additional packages. The provider wraps the same local cache and returns `reason: "CACHED"` for all successful evaluations.

### 3. No Network Per Check

This follows directly from local evaluation. The SDK never makes a network call during a variation method. Network calls happen only:
- On startup (initial flag fetch)
- During background sync (polling interval or SSE event trigger)

### 4. SSE Streaming

Server-Sent Events provide real-time flag updates. When enabled, the SDK opens a persistent HTTP connection to `GET /v1/stream/{envKey}` and listens for `flag-update` events. On receiving an event, the SDK triggers a full flag refresh. SSE is preferred over WebSockets because it uses standard HTTP, works through all proxies and load balancers, and requires no special server infrastructure.

All SDKs implement exponential backoff with jitter for SSE reconnection. The first retry is immediate, then 1s, 2s, 4s, 8s, capped at the configured `sseRetry` interval (default 5s).

### 5. Graceful Degradation

Every SDK implements a three-tier fallback chain:
1. **Cached flags** — if a flag was previously loaded, use its cached value
2. **Default value (user-provided)** — if no cache entry exists, return the fallback passed to the variation method
3. **Zero value** — if no fallback was provided (for languages that allow it), return the type's zero value

This ensures flag evaluation never blocks or throws even if the SDK has never successfully connected.

---

## SDK Comparison Table

| SDK | Language | Runtime | Package | Type | OpenFeature Provider | Key Prefix | Dependencies |
|-----|----------|---------|---------|------|---------------------|------------|--------------|
| Go | Go | Go 1.22+ | `github.com/featuresignals/sdk-go` | Server | `featuresignals.NewProvider(client)` | `fs_srv_` | Stdlib only |
| Node.js | TypeScript | Node.js 22+ | `@featuresignals/node` | Server | `@featuresignals/node` exports `FeatureSignalsProvider` | `fs_srv_` | Zero external deps |
| Python | Python | Python 3.9+ | `featuresignals` | Server | `featuresignals.openfeature.FeatureSignalsProvider` | `fs_srv_` | Zero external deps |
| Java | Java | Java 17+ | `com.featuresignals:sdk-java` | Server | `com.featuresignals.sdk.FeatureSignalsProvider` | `fs_srv_` | Gson only |
| .NET | C# | .NET 8.0+, C# 12 | `FeatureSignals` | Server | `FeatureSignals.OpenFeature.FeatureSignalsProvider` | `fs_srv_` | Zero external deps |
| Ruby | Ruby | Ruby 3.1+ | `featuresignals` | Server | `FeatureSignals::OpenFeature::Provider` | `fs_srv_` | Stdlib only |
| React | TypeScript | React 18+ | `@featuresignals/react` | Client | `@featuresignals/react` exports `FeatureSignalsWebProvider` | `fs_cli_` | React (peer) |
| Vue | TypeScript | Vue 3.3+ | `@featuresignals/vue` | Client | `@featuresignals/vue` exports `createOpenFeatureProvider()` | `fs_cli_` | Vue (peer) |

**Key differences between server and client SDKs:**
- **Server SDKs** use long-lived API keys (`fs_srv_...`) authenticated via HTTP header. They can create `EvalContext` with any user key and attributes. They support both polling and SSE.
- **Client SDKs** use short-lived client keys (`fs_cli_...`) designed for browser exposure. They accept a single `userKey` at the provider/plugin level (not per-evaluation). SSE is recommended for real-time updates. Resolution is synchronous (required by `@openfeature/web-sdk`).
- **React** uses a `<FeatureSignalsProvider>` context wrapper with hooks (`useFlag`, `useFlags`, `useReady`, `useError`).
- **Vue** uses a Vue plugin via `app.use(FeatureSignalsPlugin, {...})` with composables (`useFlag`, `useFlags`, `useReady`, `useError`).

---

## Common Architecture

All SDKs follow the same lifecycle:

```
┌─────────────────────────────────────────────────────────────────┐
│                         SDK Client                               │
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌────────────────────┐  │
│  │  INIT    │────▶│  FETCH FLAGS  │────▶│  IN-MEMORY CACHE  │  │
│  │ (config) │     │  GET /v1/...  │     │  (sync.Map / Map) │  │
│  └──────────┘     └──────┬───────┘     └─────────┬──────────┘  │
│                          │                       │             │
│                          ▼                       ▼             │
│                   ┌──────────────┐     ┌────────────────────┐  │
│                   │ BACKGROUND   │     │  VARIATION METHODS │  │
│                   │ SYNC THREAD  │     │  (local read,      │  │
│                   │              │     │   zero network)    │  │
│                   │  Polling or  │     │                    │  │
│                   │  SSE Stream  │     │  boolVariation()   │  │
│                   │              │     │  stringVariation() │  │
│                   │  On update:  │     │  numberVariation() │  │
│                   │  → refetch   │     │  jsonVariation()   │  │
│                   │  → update    │     └────────────────────┘  │
│                   │    cache     │                             │
│                   └──────────────┘                             │
│                                                                  │
│  ┌──────────┐                                                    │
│  │  CLOSE   │  → stops background sync, releases resources      │
│  └──────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-step lifecycle:

1. **Initialization**: The user creates a client with an SDK key and environment key. Server SDKs also accept an `EvalContext` for the initial fetch. Client SDKs accept a `userKey` prop.
2. **Initial fetch**: The client makes `GET /v1/client/{envKey}/flags` (authenticated via `X-API-Key` header or `api_key` query param — header is preferred, query param is deprecated). The response is a JSON map of `{flagKey: value}`.
3. **Cache population**: All flags are stored in an in-memory data structure (thread-safe map).
4. **Ready signal**: The client signals readiness via a channel (Go), promise (Node.js), blocking call (Python/Java/Ruby), event (all), or reactive flag (React/Vue).
5. **Evaluation**: Variation methods read from the cache. No network calls.
6. **Background sync**: If SSE is enabled, the client opens a persistent connection. On `flag-update` events, it refetches all flags. If polling is enabled (or SSE falls back), the client fetches on a timer.
7. **Shutdown**: The user calls `close()` / `Close()` / `Dispose()` / `client.close` to stop background goroutines/threads/timers.

---

## OpenFeature Implementation

All SDKs implement an OpenFeature provider that wraps the native client. The implementation follows a consistent pattern across languages:

### Provider Architecture

```
OpenFeature SDK API          FeatureSignals OpenFeature Provider    FeatureSignals Client
─────────────────           ─────────────────────────────────    ────────────────────
getBooleanValue("x", d) ──▶ resolveBooleanEvaluation("x", d) ──▶ client.boolVariation("x", ctx, d)
                              │                                    │
                              │ return {value, reason: "CACHED"}   │ cache lookup
                              ◀────────────────────────────────────◀
                           ◀────────────────────
```

### Provider Contract

| Aspect | Server SDKs (Go, Node, Python, Java, .NET, Ruby) | Client SDKs (React, Vue) |
|--------|---------------------------------------------------|--------------------------|
| Lifecycle | Wraps a `FeatureSignalsClient` passed or created in constructor | Standalone provider, manages its own HTTP fetching |
| Initialization | `initialize()` calls `waitForReady()` on the client | `initialize()` fetches flags directly via HTTP |
| Resolution | Delegates to the client's variation methods | Reads from internal cache (synchronous) |
| Events | Bridges client events (`update` → `PROVIDER_CONFIGURATION_CHANGED`, `error` → `PROVIDER_ERROR`) | Bridges internal fetch events |
| `runsOn` | `"server"` | `"client"` |
| Shutdown | `shutdown()` calls `client.close()` | `onClose()` stops polling/SSE |

### Language-Specific Details

**Go** (`featuresignals.NewProvider(client)`):
- Implements `FeatureProvider`, `StateHandler`, `EventHandler`
- `Init` blocks until client is ready (30s timeout)
- Exposes `BooleanEvaluation`, `StringEvaluation`, `FloatEvaluation`, `IntEvaluation`, `ObjectEvaluation`
- Integer evaluation converts `float64` (from JSON unmarshaling) to `int64`
- Register with `of.SetProviderAndWait(fs.NewProvider(client))`

**Node.js** (`new FeatureSignalsProvider(fsClient)`):
- Implements `resolveBooleanEvaluation`, `resolveStringEvaluation`, `resolveNumberEvaluation`, `resolveObjectEvaluation`
- EventEmitter bridges `update` → `PROVIDER_CONFIGURATION_CHANGED` and `error` → `PROVIDER_ERROR`
- Register with `OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient))`

**Python** (`FeatureSignalsProvider(sdk_key, options)`):
- Extends `AbstractProvider` from `openfeature-sdk`
- Owns the client internally — creates it in constructor, tears it down in `shutdown()`
- Exposes `resolve_boolean_details`, `resolve_string_details`, `resolve_integer_details`, `resolve_float_details`, `resolve_object_details`
- Integer and float resolution handle both `int` and `float` cache values

**Java** (`new FeatureSignalsProvider(sdkKey, options)`):
- Implements `FeatureProvider` and `AutoCloseable`
- `initialize()` calls `waitForReady` with 30s timeout
- Exposes `getBooleanEvaluation`, `getStringEvaluation`, `getIntegerEvaluation`, `getDoubleEvaluation`, `getObjectEvaluation`
- Numeric evaluations handle `Number` subtypes via `intValue()` / `doubleValue()`

**.NET** (`new FeatureSignalsProvider(client)` or `new FeatureSignalsProvider(sdkKey, options)`):
- Extends the `FeatureProvider` abstract class, implements `IDisposable`
- `InitializeAsync` calls `WaitForReadyAsync` on the client
- All resolution methods are async: `ResolveBooleanValueAsync`, `ResolveStringValueAsync`, `ResolveIntegerValueAsync`, `ResolveDoubleValueAsync`, `ResolveStructureValueAsync`

**Ruby** (`FeatureSignals::OpenFeature::Provider.new(sdkKey, options)`):
- Uses keyword arguments for all resolution methods (ruby convention)
- `init` calls `wait_for_ready`; `shutdown` closes the client
- Exposes `fetch_boolean_value`, `fetch_string_value`, `fetch_number_value`, `fetch_object_value`

**React** (`new FeatureSignalsWebProvider(options)`):
- Standalone provider with built-in HTTP fetching
- Returns `runsOn: "client"` as required by `@openfeature/web-sdk`
- `initialize()` fetches flags and starts background refresh
- Resolution is synchronous — reads from internal cache

**Vue** (`createOpenFeatureProvider(options)` or `new FeatureSignalsWebProvider(options)`):
- Factory function returns same `FeatureSignalsWebProvider` class as React
- Identical implementation — standalone HTTP fetching, synchronous resolution

### Resolution Details Contract

All providers return resolution details following this contract:

| Field | Value on success | Value on error |
|-------|-----------------|----------------|
| `value` | The resolved flag value | The `defaultValue` passed by the caller |
| `reason` | `CACHED` | `ERROR` |
| `variant` | Empty (not used by FeatureSignals) | Empty |
| `errorCode` | — | `FLAG_NOT_FOUND` or `TYPE_MISMATCH` |
| `errorMessage` | — | Human-readable description |

The `reason` is always `CACHED` because all evaluations come from the local in-memory cache. The `variant` field is always empty because FeatureSignals returns flat key-value pairs rather than variant maps (OpenFeature's variant concept doesn't map to FeatureSignals' architecture).

---

## Consistent Hashing

All SDKs implement (or delegate to the server) the same consistent hashing algorithm used for percentage rollouts and A/B variant assignment.

### Algorithm

The server-side implementation lives in `server/internal/eval/hash.go`:

```
hash = MurmurHash3_x86_32(flagKey + "." + userKey, seed=0)
bucket = hash % 10000   // range: 0–9999 (inclusive)
```

**Properties:**
- **Deterministic**: Same flag key + same user key always produces the same bucket
- **Uniform**: Output is uniformly distributed across 0–9999
- **Stable**: Adding more users does not change existing users' buckets
- **Collision-resistant**: MurmurHash3 has excellent avalanche properties

### Usage in Evaluation

The bucket is used in three places within the evaluation engine (`engine.go`):

1. **Percentage rollouts on targeting rules** (`rule.Percentage` in basis points): If `bucket < rule.Percentage`, the user receives the rule's value. Otherwise, evaluation continues to the next rule.

2. **Default percentage rollout** (`state.PercentageRollout` in basis points): If no targeting rule matched and the flag state has a default rollout, the user is assigned to the rollout if `bucket < state.PercentageRollout`.

3. **A/B variant assignment** (`state.Variants`): Variants have weighted buckets. The user walks through variants by cumulative weight. When `bucket < cumulative`, that variant is assigned.

4. **Mutual exclusion groups**: Among all enabled flags in the same mutual exclusion group, the flag with the lowest `BucketUser(flagKey, userKey)` value wins. Ties are broken by lexicographic key comparison (`key < winnerKey`).

### SDK Implementation

Server SDKs implement this hashing locally to evaluate percentage rollouts in the SDK cache layer. The server pre-computes flag values per user context, but the SDK must still apply percentage-based rollouts consistently. The implementation mirrors the server's MurmurHash3 exactly to ensure deterministic matching.

Client SDKs (React, Vue) do not re-implement the hashing — they receive pre-computed flag values from the server and simply cache them. The server evaluates all targeting rules, rollouts, and variants before sending the response.

---

## Code Examples by Language

### Initialization

```go
// Go
client := fs.NewClient("fs_srv_abc123", "production",
    fs.WithBaseURL("http://localhost:8080"),
    fs.WithSSE(true),
)
defer client.Close()
<-client.Ready()
```

```typescript
// Node.js
import { init } from "@featuresignals/node";
const client = init("fs_srv_xxx", { envKey: "production", streaming: true });
await client.waitForReady();
```

```python
# Python
from featuresignals import FeatureSignalsClient, ClientOptions
client = FeatureSignalsClient("fs_srv_xxx", ClientOptions(env_key="production"))
client.wait_for_ready()
```

```java
// Java
var options = new ClientOptions("production").streaming(true);
var client = new FeatureSignalsClient("fs_srv_xxx", options);
client.waitForReady(5000);
```

```csharp
// .NET
var client = new FeatureSignalsClient("fs_srv_xxx", new ClientOptions { EnvKey = "production" });
await client.WaitForReadyAsync();
```

```ruby
# Ruby
options = FeatureSignals::ClientOptions.new(env_key: "production")
client = FeatureSignals::Client.new("fs_srv_xxx", options)
client.wait_for_ready
```

```tsx
// React
<FeatureSignalsProvider sdkKey="fs_cli_xxx" envKey="production" userKey="user-42">
  <App />
</FeatureSignalsProvider>
```

```typescript
// Vue
app.use(FeatureSignalsPlugin, { sdkKey: "fs_cli_xxx", envKey: "production" });
```

### Boolean Variation

```go
// Go
enabled := client.BoolVariation("dark-mode", user, false)
```

```typescript
// Node.js
const enabled = client.boolVariation("dark-mode", ctx, false);
```

```python
# Python
enabled = client.bool_variation("dark-mode", ctx, False)
```

```java
// Java
boolean enabled = client.boolVariation("dark-mode", ctx, false);
```

```csharp
// .NET
bool enabled = client.BoolVariation("dark-mode", ctx, false);
```

```ruby
# Ruby
enabled = client.bool_variation("dark-mode", ctx, false)
```

```tsx
// React
const darkMode = useFlag("dark-mode", false);
```

```typescript
// Vue
const darkMode = useFlag("dark-mode", false);
```

### String Variation

```go
// Go
text := client.StringVariation("banner-text", user, "Welcome!")
```

```typescript
// Node.js
const text = client.stringVariation("banner-text", ctx, "Welcome!");
```

```python
# Python
text = client.string_variation("banner-text", ctx, "Welcome!")
```

```java
// Java
String text = client.stringVariation("banner-text", ctx, "Welcome!");
```

```csharp
// .NET
string text = client.StringVariation("banner-text", ctx, "Welcome!");
```

```ruby
# Ruby
text = client.string_variation("banner-text", ctx, "Welcome!")
```

```tsx
// React
const banner = useFlag("banner-text", "Welcome!");
```

```typescript
// Vue
const banner = useFlag<string>("banner-text", "Welcome!");
```

### Evaluation Context

```go
// Go
user := fs.NewContext("user-42").
    WithAttribute("plan", "enterprise").
    WithAttribute("country", "US")
```

```typescript
// Node.js
const ctx = { key: "user-42", attributes: { plan: "enterprise", country: "US" } };
```

```python
# Python
ctx = EvalContext(key="user-42", attributes={"plan": "enterprise", "country": "US"})
```

```java
// Java
var ctx = new EvalContext("user-42")
    .withAttribute("plan", "enterprise")
    .withAttribute("country", "US");
```

```csharp
// .NET
var ctx = new EvalContext("user-42")
    .WithAttribute("plan", "enterprise")
    .WithAttribute("country", "US");
```

```ruby
# Ruby
ctx = FeatureSignals::EvalContext.new(key: "user-42", attributes: { "plan" => "enterprise" })
```

```tsx
// React — userKey is set at the provider level, not per-evaluation
<FeatureSignalsProvider sdkKey="fs_cli_xxx" envKey="production" userKey="user-42">
```

```typescript
// Vue — userKey is set at the plugin level
app.use(FeatureSignalsPlugin, { sdkKey: "fs_cli_xxx", envKey: "production", userKey: "user-42" });
```

EvalContext is **immutable** in all SDKs. `WithAttribute` / `with_attribute` returns a new copy. The `key` field is required and is used for:
- Percentage rollout bucketing (via MurmurHash3)
- A/B variant assignment
- Mutual exclusion group resolution

### SSE Streaming

```go
// Go
client := fs.NewClient(key, "production", fs.WithSSE(true), fs.WithSSERetryInterval(3*time.Second))
```

```typescript
// Node.js
const client = init("fs_srv_xxx", { envKey: "production", streaming: true, sseRetryMs: 3000 });
```

```python
# Python
client = FeatureSignalsClient("fs_srv_xxx", ClientOptions(env_key="production", streaming=True, sse_retry=3.0))
```

```java
// Java
var options = new ClientOptions("production").streaming(true).sseRetry(Duration.ofSeconds(3));
```

```csharp
// .NET
var options = new ClientOptions { EnvKey = "production", Streaming = true, SseRetry = TimeSpan.FromSeconds(3) };
```

```ruby
# Ruby
options = FeatureSignals::ClientOptions.new(env_key: "production", streaming: true, sse_retry: 3)
```

```tsx
// React
<FeatureSignalsProvider sdkKey="fs_cli_xxx" envKey="production" streaming={true}>
```

```typescript
// Vue
app.use(FeatureSignalsPlugin, { sdkKey: "fs_cli_xxx", envKey: "production", streaming: true });
```

When SSE is enabled, the SDK connects to `GET /v1/stream/{envKey}` (authenticated via `X-API-Key` header). On receiving a `flag-update` event, the SDK triggers a full flag refetch. The SSE connection uses standard HTTP with `text/event-stream` content type — no special protocol, works through all proxies and load balancers.

### Shutdown

```go
// Go
client.Close()   // idempotent
```

```typescript
// Node.js
client.close();  // idempotent
```

```python
# Python
client.close()   # idempotent (uses daemon threads as fallback)
```

```java
// Java
client.close();  // AutoCloseable, works with try-with-resources
```

```csharp
// .NET
client.Dispose();  // IDisposable, works with using
```

```ruby
# Ruby
client.close   # idempotent
```

```tsx
// React
// Provider handles cleanup automatically on unmount
```

```typescript
// Vue
// Plugin handles cleanup automatically on app unmount
```

Server SDKs implement `Close()` / `close()` as idempotent — safe to call multiple times. Client SDKs (React, Vue) handle cleanup automatically when the provider unmounts or the app is destroyed.

---

## Migration Integration

FeatureSignals SDKs support migrating from other feature flag platforms via OpenFeature. Since all FeatureSignals SDKs ship OpenFeature providers, any application already using OpenFeature can switch to FeatureSignals by changing the provider registration — no application code changes required.

### Migration Paths

**From LaunchDarkly:**
1. Replace `ldclient.Init("sdk-key")` with FeatureSignals client initialization
2. Replace `ldclient.BoolVariation("flag-key", user, false)` with `client.boolVariation("flag-key", ctx, false)` (or keep using OpenFeature API)
3. LaunchDarkly uses a similar `EvalContext` pattern — `key`, `attributes` map directly
4. LaunchDarkly's `LDUser` maps to `EvalContext`

**From Flagsmith:**
1. Replace `flagsmith.get_environment_flags()` with FeatureSignals client initialization
2. Flagsmith's `get_value("flag-key", default)` maps to `client.stringVariation("flag-key", ctx, default)` (or equivalent)
3. Flagsmith's identity-based evaluation maps to EvalContext with `key` set to the user identity

**From Unleash:**
1. Replace `new UnleashClient(config)` with FeatureSignals client initialization
2. Unleash's `isEnabled("flag-key", context)` maps to `client.boolVariation("flag-key", ctx, false)`
3. Unleash's `getVariant("flag-key", context)` maps to `client.jsonVariation("flag-key", ctx, default)`

**Zero-Lock-In Path:**
```typescript
// Always write against OpenFeature — switch providers without touching business logic
import { OpenFeature } from "@openfeature/server-sdk";

// Today: FeatureSignals
await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));

// Tomorrow: Any other OF-compatible provider
// await OpenFeature.setProviderAndWait(new OtherProvider(otherClient));

const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue("dark-mode", false);
```

---

## Cross-Cutting Concerns

### Error Handling

All SDKs follow a consistent error handling contract:

| Condition | Behavior |
|-----------|----------|
| Flag not found in cache | Return fallback value |
| Type mismatch (e.g., string flag requested as bool) | Return fallback value |
| Network failure during initial fetch | Return fallback values for all evaluations; retry on next polling interval |
| SSE connection drop | Automatic reconnection with exponential backoff + jitter |
| HTTP request timeout (configurable, default 10s) | Abort request, queue retry on next interval |
| 429 rate limited | Respect `Retry-After` header or exponential backoff |
| 401/403 API key invalid | Surface error via `onError` callback / `error` event; stop retrying |

The SDK never throws exceptions on evaluation calls. Errors during background sync are surfaced via callbacks/events:
- **Go**: `WithOnError(func(err error) { ... })`
- **Node.js**: `client.on("error", (err) => { ... })`
- **Python**: `on_error=lambda err: ...`
- **Java**: `client.setOnError(err -> { ... })`
- **.NET**: `client.OnError = (err) => { ... }`
- **Ruby**: `on_error: ->(err) { ... }`
- **React**: `useError()` hook returns the latest error
- **Vue**: `useError()` composable returns the latest error

### Reconnection Logic

SSE reconnection uses exponential backoff with jitter:

```
attempt 0: immediate retry
attempt 1: ~1s  (± random jitter)
attempt 2: ~2s  (± random jitter)
attempt 3: ~4s  (± random jitter)
...
cap: sseRetry interval (default 5s)
```

The retry interval is configured via `sseRetry` / `sse_retry` / `SSERetryInterval` / `SseRetry` option. When the maximum is reached, retries continue at that interval until the connection succeeds.

### Caching

All flag data is cached in memory. The cache is:

- **Thread-safe**: Backed by `sync.RWMutex` (Go), `Mutex` (Ruby), `ReaderWriterLockSlim` (.NET), or equivalent concurrency primitives
- **Atomic**: Updates replace the entire flag map in one operation — readers never see partial updates
- **Unbounded**: The flag set per environment is small (typically hundreds to low thousands of flags), so no eviction or size limiting is needed
- **Invalidated via**: Polling timer or SSE `flag-update` event → full refetch

### Thread Safety

| SDK | Concurrency Mechanism | Safe for Concurrent Reads? | Safe for Read + Write? |
|-----|----------------------|---------------------------|------------------------|
| Go | `sync.RWMutex` + atomic operations | Yes | Yes |
| Node.js | JavaScript single-threaded (async I/O) | Yes | Yes (no shared mutable state) |
| Python | `threading.Lock` | Yes | Yes |
| Java | `ReentrantReadWriteLock` | Yes | Yes |
| .NET | `ReaderWriterLockSlim` | Yes | Yes |
| Ruby | `Mutex` | Yes | Yes |
| React | React state management (immutable updates) | Yes | Yes |
| Vue | Vue reactive system (immutable flag map) | Yes | Yes |

All variation methods are safe for concurrent use in all SDKs. `EvalContext` is immutable — `WithAttribute` / `with_attribute` returns a new copy, so the original can be safely shared across goroutines/threads.

### Logging

- **Go**: Uses `slog.Logger`. Accepts custom logger via `WithLogger(logger)`. Default: `slog.Default()`.
- **Node.js**: No built-in logging. Errors emitted via `error` event.
- **Python**: No built-in logging. Errors via `on_error` callback.
- **Java**: Uses `java.util.logging`. Configurable via standard JUL configuration.
- **.NET**: Uses `Microsoft.Extensions.Logging.ILogger<T>` when available. Falls back to `System.Diagnostics.Debug`.
- **Ruby**: No built-in logging. Errors via `on_error` callback.

SDKs do not emit verbose internal logs. Logging is focused on errors and lifecycle events. Debug-level logging can be enabled in development for troubleshooting connection issues.

---

## Adding a New SDK

This section documents the interfaces and behaviors a new SDK must implement to be a conformant FeatureSignals SDK.

### Required Interfaces

```go
// Conceptual Go interface — implement the equivalent in your target language
type FeatureSignalsClient interface {
    // Lifecycle
    NewClient(sdkKey string, envKey string, options ClientOptions) *Client
    Close() error
    WaitForReady(timeout time.Duration) bool
    IsReady() bool

    // Variation methods
    BoolVariation(flagKey string, ctx EvalContext, fallback bool) bool
    StringVariation(flagKey string, ctx EvalContext, fallback string) string
    NumberVariation(flagKey string, ctx EvalContext, fallback float64) float64
    JSONVariation(flagKey string, ctx EvalContext, fallback interface{}) interface{}

    // Bulk access
    AllFlags() map[string]interface{}

    // Optional SSE
    SetStreaming(enabled bool)
}

type EvalContext interface {
    Key() string
    Attributes() map[string]interface{}
    WithAttribute(name string, value interface{}) EvalContext
}

type ClientOptions struct {
    BaseURL         string        // default: https://api.featuresignals.com
    PollingInterval time.Duration // default: 30s
    Streaming       bool          // default: false
    SSERetry        time.Duration // default: 5s
    Timeout         time.Duration // default: 10s
    DefaultContext  EvalContext   // default: {key: "server"}
}
```

### Implementation Checklist

- [ ] **Client constructor**: Accept `sdkKey`, `envKey`, and options. Store config.
- [ ] **Initial fetch**: Make `GET /v1/client/{envKey}/flags` with `X-API-Key` header. Cache response as `map[flagKey]value`.
- [ ] **Ready signal**: Emit ready once initial fetch succeeds (channel, promise, blocking call, or event).
- [ ] **Variation methods**: Read from cache by flag key. Type-check and convert value. Return fallback on miss/mismatch.
- [ ] **Polling**: Implement background timer at `pollingInterval`. On tick, refetch flags and update cache atomically.
- [ ] **SSE**: Implement `EventSource` client (or equivalent). Connect to `GET /v1/stream/{envKey}` with `X-API-Key` header. On `flag-update` event, trigger full refetch. Implement automatic reconnection with exponential backoff + jitter, capped at `sseRetry`.
- [ ] **EvalContext**: Implement immutable context with `key` (required string) and `attributes` (optional map). `WithAttribute` returns a new copy.
- [ ] **Callbacks/events**: Provide `onReady`, `onError`, `onUpdate` hooks (or language equivalent).
- [ ] **AllFlags**: Return the full cached flag map.
- [ ] **Close/Dispose**: Stop all background goroutines/threads/timers. Idempotent.
- [ ] **Thread safety**: All variation methods safe for concurrent use. Cache updates are atomic.
- [ ] **Graceful degradation**: Return fallback values on any error. Never throw on evaluation calls.
- [ ] **OpenFeature provider**: Implement `FeatureProvider` interface (or language equivalent). Bridge client events. Return `reason: "CACHED"` on success.
- [ ] **Testing**: Support mocking via HTTP mock server. Include unit tests for all variation methods, error paths, and thread safety.

### Client SDK Extras (React, Vue, etc.)

- [ ] **Context/state management**: Use the framework's reactivity system (React context + hooks, Vue plugin + composables).
- [ ] **Provider component**: Wrap the app so all components can access flags.
- [ ] **Synchronous resolution**: Read flags from reactive state (no async resolution).
- [ ] **Dynamic user key**: Support changing the user key (triggers refetch).
- [ ] **Client key (`fs_cli_` prefix)**: Use client-safe API keys, not server keys.

### Testing Guidance

Every SDK test suite should cover:

| Test Case | Description |
|-----------|-------------|
| Initial fetch and cache population | Client fetches flags, cache is populated, ready signal fires |
| Bool variation (flag exists) | Returns the correct boolean value |
| Bool variation (flag missing) | Returns the fallback value |
| Bool variation (type mismatch) | Returns the fallback value (e.g., string flag requested as bool) |
| String variation | Returns the correct string value |
| Number variation | Returns the correct numeric value |
| JSON variation | Returns the correct object value |
| AllFlags | Returns all cached flags |
| Not ready state | Returns fallbacks before initial fetch completes |
| Close idempotency | Closing multiple times does not error |
| Concurrent reads | Multiple goroutines/threads read simultaneously without race |
| SSE event handling | On `flag-update` event, flags are refetched |
| Polling interval | Flags are refetched at the configured interval |
| Network error during fetch | Error callback fires, fallbacks are returned |
| SSE reconnection | After connection drop, SDK reconnects with backoff |

**Mock server approach** — all SDKs can be tested against a local HTTP mock:

```go
// Go — mock server approach (applicable in any language)
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]interface{}{
        "dark-mode": true,
        "banner":    "Test banner",
    })
}))
defer srv.Close()

client := fs.NewClient("test-key", "test",
    fs.WithBaseURL(srv.URL),
    fs.WithPollingInterval(time.Hour), // disable polling for test
)
defer client.Close()
<-client.Ready()
```

---

## Cross-References

- [[ARCHITECTURE.md]] — Evaluation hot path (section 4), consistent hashing algorithm (section 4.2), data flow for flag change propagation (section 5), SSE connection management (section 5.3), hexagonalt architecture (section 2).

- [[DEVELOPMENT.md]] — Package map showing SDK locations, Go server testing patterns for mock-based SDK testing, handler patterns that use SDK client injection.

- [[PERFORMANCE.md]] — Eval latency benchmarks from the server side (sub-ms p99), cache hit rates, network round-trip comparisons between polling and SSE.

---

## Sources

- `sdks/go/README.md` — Go SDK full API reference: constructor, options, variation methods, EvalContext, OpenFeature provider, thread safety guarantees, configuration patterns for web servers and workers.

- `sdks/node/README.md` — Node.js SDK API: `init` factory, `FeatureSignalsClient` constructor, `waitForReady` promise, event emitter lifecycle, zero-dependency constraint.

- `sdks/python/README.md` — Python SDK API: `FeatureSignalsClient`, `ClientOptions`, `EvalContext.with_attribute`, callback pattern, Flask/FastAPI/Django integration patterns, thread safety via `threading.Lock`.

- `sdks/java/README.md` — Java SDK API: `ClientOptions` fluent builder, `AutoCloseable` with try-with-resources, Spring Boot `@Bean` pattern, Gson single dependency.

- `sdks/dotnet/README.md` — .NET SDK API: `ClientOptions` properties, `WaitForReadyAsync`, `IDisposable`, ASP.NET Core DI and hosted service patterns, `ReaderWriterLockSlim` thread safety.

- `sdks/ruby/README.md` — Ruby SDK API: `ClientOptions` keyword constructor, `on_ready`/`on_error`/`on_update` lambda callbacks, Rails `config/initializers` pattern, stdlib-only constraint.

- `sdks/react/README.md` — React SDK: `<FeatureSignalsProvider>` props, `useFlag`/`useFlags`/`useReady`/`useError` hooks, SSE streaming in browser, `FeatureSignalsWebProvider` for OpenFeature.

- `sdks/vue/README.md` — Vue SDK: `FeatureSignalsPlugin` for `app.use()`, composables (`useFlag`, `useFlags`, `useReady`, `useError`), Nuxt 3 plugin pattern, `createOpenFeatureProvider` factory.

- `docs/docs/sdks/overview.md` — SDK architecture overview: initial load via `GET /v1/client/{envKey}/flags`, polling vs SSE, variation methods table, readiness pattern, lifecycle.

- `docs/docs/sdks/go.md` — Go SDK docs-site version: configuration options table, options reference, streaming vs polling behavior (SSE triggers full refetch, not direct update).

- `docs/docs/sdks/nodejs.md` — Node.js SDK docs-site version: `init` helper, options reference, event emitter details (`ready`, `error`, `update`), ESM requirement.

- `docs/docs/sdks/python.md` — Python SDK docs-site version: callbacks, options reference, daemon thread cleanup behavior, abstract provider integration.

- `docs/docs/sdks/java.md` — Java SDK docs-site version: options builder pattern, callbacks, AutoCloseable lifecycle, Maven/Gradle coordinates.

- `docs/docs/sdks/dotnet.md` — .NET SDK docs-site version: ASP.NET Core DI registration, hosted service wrapper, middleware pattern, OpenFeature abstract class extension.

- `docs/docs/sdks/ruby.md` — Ruby SDK docs-site version: Rails initializer pattern with `Rails.application.config.to_prepare`, `at_exit` cleanup, Sinatra integration.

- `docs/docs/sdks/react.md` — React SDK docs-site version: dynamic `userKey` prop triggers refetch, `FeatureGate` component pattern, provider lifecycle on unmount.

- `docs/docs/sdks/vue.md` — Vue SDK docs-site version: Nuxt 3 `defineNuxtPlugin` pattern, `FeatureGate` slot component, mock injection via `FEATURE_SIGNALS_KEY`.

- `docs/docs/sdks/openfeature.md` — OpenFeature integration: provider architecture for each language, resolution details contract (reason `CACHED`, variant empty), error codes (`FLAG_NOT_FOUND`, `TYPE_MISMATCH`), event bridging from client to OF provider.

- `server/internal/eval/engine.go` — Server-side evaluation engine: full evaluation algorithm (flag lookup → expiration check → enabled check → mutex group → prerequisites → targeting rules → default rollout → variant assignment → fallthrough), targeting rule matching with segments and conditions, mutual exclusion group winner determination via lowest bucket.

- `server/internal/eval/hash.go` — MurmurHash3_x86_32 implementation: `BucketUser(flagKey, userKey) int` returning 0–9999, `flagKey + "." + userKey` as hash input, used for percentage rollouts (basis points), variant weights, and mutex group winner.

- `server/internal/domain/eval_context.go` — `EvalContext` type definition: `Key string` and `Attributes map[string]interface{}`, `GetAttribute(name)` method checking key as special attribute first, `EvalResult` struct with `FlagKey`, `Value`, `Reason`, `VariantKey`, reason constants (NOT_FOUND, DISABLED, TARGETED, ROLLOUT, FALLTHROUGH, VARIANT, PREREQUISITE_FAILED, MUTUALLY_EXCLUDED, ERROR).

- `server/internal/domain/ruleset.go` — `Ruleset` type: immutable snapshot of `Flags map[string]*Flag`, `States map[string]*FlagState`, `Segments map[string]*Segment` for a single environment, built by the cache layer and passed to the evaluation engine.