---
title: Performance Standards & Benchmarks
tags: [performance, architecture]
domain: performance
sources:
  - CLAUDE.md (performance standards L467-489)
  - docs/docs/architecture/evaluation-engine.md (evaluation flow, MurmurHash3)
  - docs/docs/architecture/real-time-updates.md (SSE, LISTEN/NOTIFY pipeline)
  - server/internal/eval/engine.go (evaluation engine implementation)
  - server/internal/eval/hash.go (MurmurHash3 x86_32 implementation)
  - server/internal/store/cache/inmemory.go (ruleset cache with PG LISTEN/NOTIFY)
  - server/internal/sse/server.go (SSE server with connection management)
  - ARCHITECTURE_IMPLEMENTATION.md (performance considerations)
related:
  - [[Architecture]]
  - [[Development]]
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

The flag evaluation hot path (`/v1/evaluate`, `/v1/client/{envKey}/flags`) is the single most performance-critical code path in FeatureSignals. Target: **< 1ms p99 evaluation latency** (excluding network). The evaluation engine is stateless and allocation-free on the hot path. Rulesets are cached in memory with cross-instance invalidation via PostgreSQL `LISTEN/NOTIFY`. No database calls occur on the evaluation hot path — everything comes from the cached ruleset.

## Evaluation Engine Performance

### Design

The `eval.Engine` is a zero-allocation struct with no fields — it is purely behavioral:

```server/internal/eval/engine.go#L30-35
type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}
```

This means every evaluation has zero per-instance memory overhead. The engine is stateless and goroutine-safe by construction — all state is in the immutable `Ruleset` and `EvalContext` parameters.

### Evaluation Algorithm (Short-Circuit)

```
1. Flag exists?          → NO: NOT_FOUND (return flag default)
2. Flag expired?         → YES: DISABLED (return flag default)
3. Env state enabled?    → NO: DISABLED (return flag default)
4. Mutex group winner?   → NO: MUTUALLY_EXCLUDED
5. Prerequisites met?    → NO: PREREQUISITE_FAILED
6. Targeting rules       → MATCH: TARGETED or ROLLOUT value
7. Default rollout       → IN: ROLLOUT value, OUT: FALLTHROUGH
8. A/B variants          → ASSIGN variant via consistent hashing
9. Fallthrough           → return default value
```

Each step short-circuits — the first matching condition determines the result. Evaluating a disabled flag (the most common case for flags that are fully rolled out or off) takes only 3 map lookups and a boolean check.

### Consistent Hashing (MurmurHash3)

All bucket assignments use `MurmurHash3_x86_32`:

```server/internal/eval/hash.go#L41-47
func BucketUser(flagKey, userKey string) int {
	hashKey := flagKey + "." + userKey
	hash := murmurHash3(hashKey, 0)
	return int(hash % 10000)
}
```

Properties:
- **Deterministic**: Same inputs always produce the same bucket (0–9999)
- **Uniform**: Even distribution via the fmix32 finalizer
- **Independent per flag**: Different flags produce different buckets for the same user
- **Constant time**: O(1) regardless of the number of users or flags
- **No allocations**: Pure arithmetic on `uint32` values, zero heap allocations

The implementation is hand-rolled (no external dependency) with canonical constants:

```server/internal/eval/hash.go#L9-L44
func murmurHash3(key string, seed uint32) uint32 {
	data := []byte(key)
	length := len(data)
	nblocks := length / 4
	var h1 uint32 = seed
	const (c1 uint32 = 0xcc9e2d51; c2 uint32 = 0x1b873593)
	for i := 0; i < nblocks; i++ {
		k1 := uint32(data[i*4]) | uint32(data[i*4+1])<<8 |
		      uint32(data[i*4+2])<<16 | uint32(data[i*4+3])<<24
		k1 *= c1; k1 = rotl32(k1, 15); k1 *= c2
		h1 ^= k1; h1 = rotl32(h1, 13)
		h1 = h1*5 + 0xe6546b64
	}
	// Tail: 0-3 remaining bytes with fallthrough
	// Finalization: fmix32 avalanche
	h1 ^= h1 >> 16; h1 *= 0x85ebca6b
	h1 ^= h1 >> 13; h1 *= 0xc2b2ae35
	h1 ^= h1 >> 16
	return h1
}
```

### Targeting Rule Matching

Rules are sorted by `priority` (ascending) and evaluated in order. The `matchRule` implementation is branch-efficient — it short-circuits on the first failing segment or condition:

```server/internal/eval/engine.go#L173-193
func (e *Engine) matchRule(rule domain.TargetingRule, ctx domain.EvalContext, ruleset *domain.Ruleset) bool {
	if len(rule.SegmentKeys) > 0 {
		segmentMatched := false
		for _, segKey := range rule.SegmentKeys {
			seg, ok := ruleset.Segments[segKey]
			if !ok { continue }
			if MatchConditions(seg.Rules, ctx, seg.MatchType) {
				segmentMatched = true
				break
			}
		}
		if !segmentMatched { return false }
	}
	if len(rule.Conditions) > 0 {
		if !MatchConditions(rule.Conditions, ctx, rule.MatchType) { return false }
	}
	return true
}
```

### Prerequisite & Mutex Groups

**Prerequisites** use recursive evaluation with cycle detection via a `visited` map. If a cycle is detected, the flag returns `ReasonPrerequisiteFailed`. For boolean prerequisites, a `true` value is required; non-boolean flags only need to be enabled.

**Mutual exclusion groups** use consistent hashing to deterministically select the winner among enabled flags in the same group — the flag with the lowest `BucketUser` value wins, with lexicographic tiebreak.

## Cache Architecture

### In-Memory Ruleset Cache

The `cache.Cache` stores a `*domain.Ruleset` per environment in a `map[string]*domain.Ruleset` protected by `sync.RWMutex`:

```server/internal/store/cache/inmemory.go#L54-70
type Cache struct {
	mu              sync.RWMutex
	rulesets        map[string]*domain.Ruleset // envID -> ruleset
	store           domain.Store
	logger          *slog.Logger
	broadcaster     Broadcaster      // SSE push (optional, nil in tests)
	webhookNotifier WebhookNotifier  // webhook dispatch (optional)
	listening       bool
}
```

Reads use `RLock` (multiple concurrent readers), writes use full `Lock`. `GetRuleset` returns the cached pointer directly — no copying:

```server/internal/store/cache/inmemory.go#L74-84
func (c *Cache) GetRuleset(envID string) *domain.Ruleset {
	c.mu.RLock()
	rs := c.rulesets[envID]
	c.mu.RUnlock()
	if rs != nil { cacheHitCtr.Add(context.Background(), 1) }
	else { cacheMissCtr.Add(context.Background(), 1) }
	return rs
}
```

A ruleset is pre-populated as a single object graph with three maps (Flags, States, Segments) keyed by `flagKey` for O(1) lookup during evaluation:

```server/internal/store/cache/inmemory.go#L86-122
func (c *Cache) LoadRuleset(ctx context.Context, projectID, envID string) (*domain.Ruleset, error) {
	flags, states, segments, err := c.store.LoadRuleset(ctx, projectID, envID)
	ruleset := &domain.Ruleset{
		Flags:    make(map[string]*domain.Flag, len(flags)),
		States:   make(map[string]*domain.FlagState, len(states)),
		Segments: make(map[string]*domain.Segment, len(segments)),
	}
	// Build flagIDToKey mapping, populate maps
	c.mu.Lock()
	c.rulesets[envID] = ruleset
	c.mu.Unlock()
	return ruleset, nil
}
```

### Cross-Instance Invalidation (PG LISTEN/NOTIFY)

The cache subscribes to PostgreSQL `NOTIFY` via `StartListening`. On flag change, the cached ruleset is evicted and SSE/webhook notifications are dispatched:

```
Flag change → PostgreSQL NOTIFY → Cache listener
    ├── Evict cached ruleset (delete from map)
    ├── SSE broadcast to all connected SDK clients
    └── Webhook dispatcher enqueue (5s timeout context)
```

```server/internal/store/cache/inmemory.go#L140-176
func (c *Cache) StartListening(ctx context.Context) error {
	err := c.store.ListenForChanges(ctx, func(payload string) {
		var change struct {
			FlagID string `json:"flag_id"`
			EnvID  string `json:"env_id"`
			Action string `json:"action"`
		}
		json.Unmarshal([]byte(payload), &change)
		c.mu.Lock()
		delete(c.rulesets, change.EnvID)
		c.mu.Unlock()
		if c.broadcaster != nil {
			c.broadcaster.BroadcastFlagUpdate(change.EnvID, map[string]string{
				"type": "flag_update", "env_id": change.EnvID,
				"flag_id": change.FlagID, "action": change.Action,
			})
		}
		if c.webhookNotifier != nil {
			notifyCtx, notifyCancel := context.WithTimeout(context.Background(), 5*time.Second)
			c.webhookNotifier.NotifyFlagChange(notifyCtx, change.EnvID, change.FlagID, change.Action)
			notifyCancel()
		}
	})
	return err
}
```

Metrics tracked via OpenTelemetry:
- `cache.hit` — counter: evaluation cache hits
- `cache.miss` — counter: evaluation cache misses (triggers database load)
- Cache eviction is implicit (map delete) — no explicit eviction counter yet

### Cache Warmup

The first evaluation request after a deployment or eviction incurs a cache miss, which loads the full ruleset from the database. This is an intentional trade-off — pre-warming adds complexity and the cold-start penalty is a single query per environment. For high-traffic environments, the cache warms within milliseconds of the first request.

## SSE Streaming Performance

### Connection Management

The `sse.Server` maintains a `map[envID] → map[*Client]bool` for O(1) broadcast to all clients in an environment:

```server/internal/sse/server.go#L30-42
type Server struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]bool // envID -> set of clients
	logger  *slog.Logger
}
```

Each client has a buffered channel (`make(chan []byte, 64)`) to absorb bursts without blocking the broadcaster.

### Broadcast Efficiency

Broadcasting iterates the client set for a single environment under `RLock` (allowing concurrent reads). Each client's channel is written with a non-blocking `select` — if the buffer is full, the event is dropped with a warning rather than blocking the broadcast:

```server/internal/sse/server.go#L118-133
func (s *Server) BroadcastFlagUpdate(envID string, data interface{}) {
	payload, _ := json.Marshal(data)
	s.mu.RLock()
	clients := s.clients[envID]
	s.mu.RUnlock()
	for client := range clients {
		select {
		case client.events <- payload:
		default:
			s.logger.Warn("SSE client buffer full, dropping event", "env_id", envID)
		}
	}
}
```

### Metrics

- `sse.active_connections` — up/down counter tracked per env_id
- Active connections gauge updated on client connect/disconnect

### Client Lifecycle

Each SSE handler goroutine is owned by the request context — when the client disconnects, `<-ctx.Done()` fires and `removeClient` runs, closing the channel and decrementing the gauge. No goroutine leaks.

## Database Performance

### Connection Pool

PostgreSQL connection pool is configured via `pgxpool` with:
- **MaxConns**: `(PostgreSQL max_connections / service_instance_count) - headroom` (typical: 20–50)
- **MinConns**: Steady-state baseline (3–10) to prevent cold-start latency
- **Query timeouts**: Always via `context.WithTimeout` — never unbounded queries
- **Pool metrics**: Acquired connections, idle connections, wait time exposed via health endpoints

### Indexing Strategy

Every `WHERE` clause column used in production queries must have an index. Composite indexes for multi-column lookups. Every foreign key column must be indexed (PostgreSQL does NOT auto-index foreign keys). `EXPLAIN ANALYZE` on every new query against realistic data volumes before merging.

Partial indexes for filtered queries:
```sql
CREATE INDEX idx_flags_active ON flags (project_id, key)
  WHERE deleted_at IS NULL;
```

### Query Patterns

- **Parameterized queries exclusively**: `$1`, `$2` — never interpolated
- **No `SELECT *`**: Select only the columns needed
- **Batch reads**: Prefer single queries with `IN (...)` over N+1 loops
- **Cursor-based pagination**: `WHERE id > $last_id ORDER BY id LIMIT $n` for consistency under concurrent writes
- **Offset-based pagination**: Acceptable for admin/dashboard views
- **Short transactions**: No external I/O inside a transaction; use `FOR UPDATE SKIP LOCKED` for queue-like patterns
- **`COALESCE`** for nullable columns with sensible defaults

## General Performance Rules

These rules apply across the entire codebase:

| Rule | Rationale |
|---|---|
| N+1 detection | If you're calling the DB in a loop, refactor to a batch query |
| Pre-allocate slices | `make([]T, 0, knownSize)` when the size is known |
| `sync.Pool` | For high-frequency temporary allocations only after profiling confirms it helps |
| No reflection in hot paths | The eval engine and cache must not use `reflect` |
| `json.RawMessage` | For values passed through without inspection |
| Profile before optimizing | Use `go test -bench` and `pprof` for actual bottleneck identification |

The eval engine specifically avoids:
- **Reflection**: All type assertions are compile-time checked
- **Allocations on hot path**: The `evaluate` method returns a single `domain.EvalResult` by value; no intermediate allocations for conditions, segments, or bucket computations
- **Interface boxing**: Domain types are concrete structs; the `Ruleset` maps are `map[string]*domain.Flag` and `map[string]*domain.FlagState`

## Benchmark History

*No benchmark data has been collected yet. This section will be populated as benchmarking is established.*

### Planned Benchmarks

| Benchmark | Target | Status |
|---|---|---|
| `BenchmarkEngine_Evaluate_Boolean` | < 500ns/op | Not yet implemented |
| `BenchmarkEngine_Evaluate_WithRules` | < 1µs/op | Not yet implemented |
| `BenchmarkEngine_EvaluateAll_100Flags` | < 50µs/op | Not yet implemented |
| `BenchmarkCache_GetRuleset_Hit` | < 50ns/op | Not yet implemented |
| `BenchmarkCache_GetRuleset_Miss` | < 100ms (includes DB load) | Not yet implemented |
| `BenchmarkSSE_Broadcast_1000Clients` | < 10ms | Not yet implemented |
| `BenchmarkMurmurHash3` | < 100ns/op | Not yet implemented |

### How to Add Benchmarks

```go
func BenchmarkEngine_Evaluate_Boolean(b *testing.B) {
    engine := eval.NewEngine()
    ruleset := loadTestRuleset() // 1000 flags, 50 rules
    ctx := domain.EvalContext{Key: "user-123"}

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        engine.Evaluate("flag-42", ctx, ruleset)
    }
}
```

Run with:
```
go test -bench=. -benchmem ./internal/eval/
```

Profile with:
```
go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out ./internal/eval/
go tool pprof -http=:8080 cpu.out
```

### Graceful Degradation

The evaluation hot path must remain functional even if non-critical services (webhooks, metrics, email) are down. The cache's `Broadcaster` and `WebhookNotifier` are optional (nil in tests and during startup). Failures in SSE or webhook dispatch never cascade to the evaluation result.

### Resilience Patterns

| Pattern | Configuration |
|---|---|
| Retry + exponential backoff + jitter | Start 100ms, multiply by 2, cap at 30s |
| Circuit breaker | N consecutive failures → cooldown period → degraded response |
| Timeouts | 10s for APIs, 30s for provisioning |
| Graceful shutdown | SIGTERM handler drains in-flight requests before stopping |

## Cross-References

- [[Architecture]] — hexagonal architecture, evaluation engine component boundaries
- [[Development]] — code conventions that enforce performance rules (no reflection, pre-allocation)
- [ARCHITECTURE_IMPLEMENTATION.md](/ARCHITECTURE_IMPLEMENTATION.md) — broader performance considerations across the system
- [docs/docs/architecture/evaluation-engine.md](/docs/docs/architecture/evaluation-engine.md) — detailed evaluation flow with diagrams
- [docs/docs/architecture/real-time-updates.md](/docs/docs/architecture/real-time-updates.md) — SSE and LISTEN/NOTIFY pipeline details

## Sources

- `CLAUDE.md` (L467-489) — evaluation hot path target (<1ms p99), allocation-free, cache-only, profile-before-optimize, general performance rules
- `docs/docs/architecture/evaluation-engine.md` — evaluation flow diagram, MurmurHash3 details, condition evaluation
- `docs/docs/architecture/real-time-updates.md` — update pipeline diagram, NOTIFY payload format, SSE event types
- `server/internal/eval/engine.go` — Engine struct (zero fields), Evaluate algorithm (short-circuit, prerequisites, mutex groups, targeting rules, variant assignment)
- `server/internal/eval/hash.go` — MurmurHash3_x86_32 implementation (body+tail+fmix32), BucketUser helper
- `server/internal/store/cache/inmemory.go` — Cache struct, GetRuleset (RLock), LoadRuleset (ruleset graph build), StartListening (NOTIFY subscription, eviction, SSE broadcast, webhook dispatch), OpenTelemetry meter
- `server/internal/sse/server.go` — Client/Server structs, HandleStream (SSE handler with buffered channel), BroadcastFlagUpdate (non-blocking per-client send), connection tracking with up/down counter
- `ARCHITECTURE_IMPLEMENTATION.md` — cross-cutting performance considerations