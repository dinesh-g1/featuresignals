# ABM SDK Specification — Cross-Language Contract v1.0

> **Version:** 1.0.0  
> **Status:** All SDKs MUST implement this contract  
> **Applies To:** All 8 SDK languages (Go, Node.js, Python, Java, .NET, Ruby, React, Vue)  
> **Classification:** Public — Committed to git  
> **PRS Requirement IDs:** FS-S1-ABM-001 through FS-S1-ABM-008

---

## §1 — Overview

The Agent Behavior Mesh (ABM) SDK provides runtime resolution and event tracking for AI agent behaviors. It is the agent equivalent of feature flag evaluation — deterministic, cached, sub-millisecond resolution of which behavior variant an agent should receive, with async event tracking for analytics.

### 1.1 Core Methods

Every ABM SDK MUST implement:

| Method | Signature | Description |
|--------|-----------|-------------|
| `resolve` | `(ctx, key, agentId, attributes) → ResolveResponse` | Resolve which variant an agent gets for a behavior |
| `resolveFresh` | `(ctx, key, agentId, attributes) → ResolveResponse` | Bypass cache, resolve directly from server |
| `track` | `(ctx, key, agentId, variant, event, value?) → void` | Track an event for a resolved behavior |
| `trackBatch` | `(ctx, events[]) → void` | Track multiple events in a single request |

### 1.2 Resolution Algorithm

1. Check local cache (TTL: 10s default, configurable)
2. If cache hit and not expired → return cached variant
3. If cache miss or expired → POST to `/v1/client/{envKey}/abm/resolve`
4. Cache the response with TTL from server (`CacheTTLSeconds` field)
5. Return the variant + configuration

### 1.3 Caching Contract

| Property | Default | Notes |
|----------|---------|-------|
| Cache TTL | 10 seconds | Overridden by server response `CacheTTLSeconds` |
| Cache key | `{behaviorKey}:{agentId}` | Per-agent, per-behavior isolation |
| Max cache entries | 10,000 | LRU eviction when exceeded |
| Invalidation | `invalidateCache(key, agentId)` | Called after behavior config changes |

---

## §2 — Data Types

> **Naming convention:** The TypeScript interfaces below use camelCase (e.g., `behaviorKey`,
> `cacheTTLSeconds`) as language-idiomatic names. The JSON wire format uses snake_case
> (e.g., `behavior_key`, `cache_ttl_seconds`). Each language SDK maps between idiomatic
> field names and wire-format names. The Go SDK uses PascalCase struct fields with
> `json:"snake_case"` tags. The Python SDK uses snake_case dataclass fields matching
> the wire format directly.

### 2.1 ResolveResponse

```typescript
interface ResolveResponse {
  behaviorKey: string;
  variant: string;
  configuration: Record<string, unknown>;
  reason: "targeting_match" | "default" | "percentage_rollout" | "fallback";
  cacheTTLSeconds: number;
  evaluatedAt: string; // RFC 3339
}
```

### 2.2 TrackEvent

```typescript
interface TrackEvent {
  behaviorKey: string;
  agentId: string;
  variant: string;
  event: string;       // e.g., "behavior.applied", "behavior.error"
  value?: number;      // optional numeric value
  timestamp: string;   // RFC 3339, set by SDK if empty
}
```

### 2.3 ABM Config

```typescript
interface ABMConfig {
  environmentKey: string;     // Server SDK key for the environment
  baseUrl?: string;           // Default: "https://app.featuresignals.io"
  cacheTTLSeconds?: number;   // Default: 10
  maxCacheEntries?: number;   // Default: 10000
  timeoutMs?: number;         // Default: 5000
}
```

---

## §3 — Error Handling

| Scenario | Behavior |
|----------|----------|
| Network error | Return fallback variant (`reason: "fallback"`) with cached configuration if available |
| 404 (behavior not found) | Return fallback with `variant: ""` and empty configuration |
| 429 (rate limited) | Retry after `Retry-After` header, return cached if available |
| 500 (server error) | Return fallback with cached configuration |
| Timeout | Return fallback with cached configuration |

**The ABM SDK MUST NOT throw exceptions.** All errors result in a fallback response. The caller decides how to handle the fallback.

---

## §4 — Track (Event Recording)

`track` is fire-and-forget. Events are:
1. Queued in a local buffer (max 256 events or 5 seconds, whichever comes first)
2. Flushed to `POST /v1/client/{envKey}/abm/track/batch`
3. If flush fails, events are retried with exponential backoff (100ms → 1s → 10s → drop)
4. Events are not persisted to disk — if the process crashes, unsent events are lost

---

## §5 — Language-Specific Implementation Status

| Language | Status | Notes |
|----------|--------|-------|
| **Go** | ✅ Complete | `sdks/go/abm/` — `Resolve()`, `ResolveFresh()`, `Track()`, `TrackBatch()`, LRU cache with TTL |
| **Node.js** | ✅ Phase 1 | `sdks/node/src/abm/` — Full resolve + buffered track with retry, LRU cache, configurable logger |
| **Python** | ✅ Phase 1 | `sdks/python/src/featuresignals/abm/` — Full resolve + buffered track with retry, LRU cache |
| **Java** | 🔴 Not started | Needs `com.featuresignals.abm` package |
| **.NET** | 🔴 Not started | Needs `FeatureSignals.Abm` namespace |
| **Ruby** | 🔴 Not started | Needs `FeatureSignals::ABM` module |
| **React** | 🔴 Not started | Needs `@featuresignals/react-abm` hooks |
| **Vue** | 🔴 Not started | Needs `@featuresignals/vue-abm` composables |

### 5.1 Implementation Order (Phase 1-2)

1. **Go** ✅ (reference implementation)
2. **Python** — Phase 1 (highest AI/ML adoption)
3. **Node.js** — Phase 1 (highest web adoption)
4. **React** — Phase 2 (dashboard integration)
5. **Java** — Phase 2 (enterprise)
6. **.NET** — Phase 2 (enterprise)
7. **Ruby** — Phase 3
8. **Vue** — Phase 3

---

## §6 — Testing Requirements

Each SDK MUST pass these tests:

| Test | Description |
|------|-------------|
| `test_resolve_returns_variant` | Resolve a known behavior, verify variant + configuration |
| `test_resolve_uses_cache` | Two resolves within TTL → second hits cache |
| `test_resolve_fresh_bypasses_cache` | `resolveFresh` after resolve → different HTTP request |
| `test_resolve_fallback_on_error` | Network error → fallback response with reason "fallback" |
| `test_track_buffers_and_flushes` | Track 100 events → 1 batch request |
| `test_track_batch_drops_when_full` | Track > 256 events → older events dropped |
| `test_cache_invalidation` | `invalidateCache` → next resolve fetches fresh |
| `test_lru_eviction` | 10,001 cache entries → oldest evicted |

---

## §7 — Go SDK Reference Implementation

```go
// Create an ABM client
client := abm.NewClient(abm.Config{
    EnvironmentKey: "fs_env_abc123",
    CacheTTLSeconds: 10,
})

// Resolve a behavior
resp, err := client.Resolve(ctx, "model-selection", "agent-123", map[string]any{
    "region": "us-east",
})
// resp.Variant → "gpt-4o"
// resp.Configuration → {"model": "gpt-4o", "temperature": 0.7}

// Track an event
client.Track(ctx, "model-selection", "agent-123", resp.Variant, "behavior.applied", nil)

// Resolve fresh (bypass cache)
resp, err := client.ResolveFresh(ctx, "model-selection", "agent-123", nil)
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-23 | Engineering | Initial ABM SDK cross-language specification: core methods, resolution algorithm, caching contract, data types, error handling, track semantic, implementation status per language, testing requirements, Go reference implementation. Closes P0 item #1 from PRE_IMPLEMENTATION_GAP_ANALYSIS. |
