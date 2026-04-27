---
title: Testing Strategy & Patterns
tags: [testing, development]
domain: testing
sources:
  - CLAUDE.md (testing standards sections L276-372)
  - CONTRIBUTING.md (CI checks, branch naming, golden rule)
  - server/internal/api/handlers/flags_test.go (table-driven test example)
  - server/internal/api/handlers/testutil_test.go (mockStore pattern)
  - server/internal/api/handlers/eval_test.go (evaluation tests)
  - server/internal/api/handlers/auth_test.go (auth tests)
  - server/internal/domain/domain_test.go (domain tests)
  - server/internal/domain/errors_test.go (error tests)
  - dashboard/src/__tests__/ (dashboard tests - 56 test files across app/, components/, components/ui/)
  - ci/main.go (Validate, FullTest functions)
  - Makefile (test targets L245-260)
related:
  - [[Development]]
  - [[Architecture]]
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

FeatureSignals follows a strict test pyramid: **many unit tests** (handlers with mocked stores, pure domain logic), **moderate integration tests** (real PostgreSQL via `testcontainers-go`, full middleware chains), and **few E2E tests** (Playwright for critical dashboard user flows). Every new handler, middleware, service, and store method must have tests — no exceptions. Coverage is measured in CI, and no PR that reduces coverage of changed packages is permitted.

## Go Testing Standards

### Table-Driven Tests

The default pattern for all Go tests. Every test function uses a slice of anonymous struct cases with named scenarios:

```server/internal/api/handlers/flags_test.go#L34-60
func TestFlagHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store, nil)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"new-feature","name":"New Feature","flag_type":"boolean"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var flag domain.Flag
	json.Unmarshal(w.Body.Bytes(), &flag)

	if flag.Key != "new-feature" {
		t.Errorf("expected key 'new-feature', got '%s'", flag.Key)
	}
	if flag.FlagType != domain.FlagTypeBoolean {
		t.Errorf("expected boolean flag type, got '%s'", flag.FlagType)
	}
}
```

Error-path table-driven patterns cover not-found, conflict, validation, unauthorized, and forbidden:

```server/internal/api/handlers/auth_test.go#L56-80
func TestAuthHandler_Register_MissingFields(t *testing.T) {
	h, _ := newTestAuthHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing email", `{"password":"Secure@123","name":"Test","org_name":"Org"}`},
		{"missing password", `{"email":"test@test.com","name":"Test","org_name":"Org"}`},
		{"missing name", `{"email":"test@test.com","password":"Secure@123","org_name":"Org"}`},
		{"missing org_name", `{"email":"test@test.com","password":"Secure@123","name":"Test"}`},
		{"short password", `{"email":"test@test.com","password":"short","name":"Test","org_name":"Org"}`},
		{"no uppercase", `{"email":"test@test.com","password":"secure@123","name":"Test","org_name":"Org"}`},
		{"no special char", `{"email":"test@test.com","password":"Secure1234","name":"Test","org_name":"Org"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(tt.body))
```

### Naming Conventions

Pattern: `TestTypeName_Method_Scenario`

| Example | What It Tests |
|---|---|
| `TestFlagHandler_Create_DuplicateKey` | Flag creation with a duplicate key returns 409 |
| `TestFlagHandler_Create_OrgIsolation` | Cross-org flag access returns 404 |
| `TestFlagHandler_Promote` | Promoting a flag state across environments |
| `TestEngine_Evaluate_DisabledFlag` | Evaluating a disabled flag returns ReasonDisabled |
| `TestEvalHandler_Evaluate_MissingAPIKey` | Eval without API key returns 401 |
| `TestAuthHandler_Register_MissingFields` | Register with missing fields returns 4xx |
| `TestValidationError_Unwrap` | `errors.Is(err, ErrValidation)` works correctly |

### mockStore Pattern

The `mockStore` in `testutil_test.go` is a complete in-memory implementation of `domain.Store`. It implements every store method using Go maps guarded by a `sync.Mutex`, making all handler tests hermetic, fast, and parallel-safe.

```server/internal/api/handlers/testutil_test.go#L15-107
type mockStore struct {
	mu                     sync.Mutex
	orgs                   map[string]*domain.Organization
	users                  map[string]*domain.User
	usersByEmail           map[string]*domain.User
	flags                  map[string]*domain.Flag
	flagsByProject         map[string][]*domain.Flag
	envs                   map[string]*domain.Environment
	envsByProject          map[string][]*domain.Environment
	apiKeys                map[string]*domain.APIKey
	apiKeysByEnv           map[string][]*domain.APIKey
	auditEntries           map[string]*domain.AuditEntry
	// ... 30+ entity maps
	idCounter              int
}

func newMockStore() *mockStore {
	return &mockStore{
		orgs:          make(map[string]*domain.Organization),
		users:         make(map[string]*domain.User),
		flags:         make(map[string]*domain.Flag),
		// ... initialize all maps
	}
}
```

Each method operates on the in-memory maps. Helper fixtures like `setupTestProject`, `setupTestEnv`, and `setupEvalFixtures` populate the store with realistic data:

```server/internal/api/handlers/testutil_test.go#L1177-1189
func setupTestProject(store *mockStore, orgID string) string {
	proj := &domain.Project{OrgID: orgID, Name: "Test Project", Slug: "test-project"}
	store.CreateProject(context.Background(), proj)
	return proj.ID
}
```

## Handler Test Patterns

Every handler test follows the same structure:

1. **Create a mock store** via `newMockStore()`
2. **Instantiate the handler** with the mock store and other dependencies (nil loggers, nil notifiers for tests that don't need them)
3. **Set up fixtures** using helper functions or direct store calls
4. **Build the request** using `httptest.NewRequest()` with chi context via `requestWithChi()` and auth context via `requestWithAuth()`
5. **Execute** with `httptest.NewRecorder()`
6. **Assert** on status code, response body, and any side effects on the store

Eval handler tests create a full environment stack:

```server/internal/api/handlers/eval_test.go#L40-75
func newTestEvalHandler(store domain.Store) *EvalHandler {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	c := cache.NewCache(store, logger, nil)
	engine := eval.NewEngine()
	sseServer := sse.NewServer(logger)
	return NewEvalHandler(store, c, engine, sseServer, logger, nil, nil)
}

func setupEvalFixtures(store *mockStore) (envID, apiKeyRaw string) {
	env := &domain.Environment{ProjectID: "proj-1", Name: "Production", Slug: "production"}
	store.CreateEnvironment(context.Background(), env)
	flag := &domain.Flag{ProjectID: "proj-1", Key: "dark-mode", Name: "Dark Mode", ...}
	store.CreateFlag(context.Background(), flag)
	store.UpsertFlagState(context.Background(), &domain.FlagState{...})
	rawKey, keyHash, keyPrefix := generateAPIKey(domain.APIKeyServer)
	store.CreateAPIKey(context.Background(), &domain.APIKey{...})
	return env.ID, rawKey
}
```

Handler tests cover all error paths: missing API keys, invalid API keys, missing fields, invalid JSON, not-found flags, oversized bulk requests, and environment key validation.

## Domain Test Patterns

Domain tests are pure logic tests with no dependencies. The `domain` package has zero imports from adapters:

```server/internal/domain/errors_test.go#L1-56
func TestValidationError_Unwrap(t *testing.T) {
	ve := NewValidationError("email", "is required")
	if !errors.Is(ve, ErrValidation) {
		t.Error("expected ValidationError to unwrap to ErrValidation")
	}
}

func TestWrapNotFound(t *testing.T) {
	err := WrapNotFound("flag")
	if !errors.Is(err, ErrNotFound) {
		t.Error("expected wrapped error to match ErrNotFound")
	}
}

func TestSentinelErrors_AreDistinct(t *testing.T) {
	if errors.Is(ErrNotFound, ErrConflict) {
		t.Error("ErrNotFound should not match ErrConflict")
	}
}
```

Domain logic tests exercise `EvalContext.GetAttribute`, plan defaults validation, and sentinel error behavior — none of which require a database or HTTP layer.

## Dashboard Testing Standards

### Stack

- **Vitest** (test runner)
- **React Testing Library** (component rendering and interaction)
- **jsdom** (DOM environment)
- **Playwright** (E2E)

### Test Location

All tests live in `dashboard/src/__tests__/` mirroring the source tree. There are currently 56 test files organized into:

- `app/` — page-level tests (flags-page, login-page, settings/*, etc.)
- `components/` — component tests (sidebar, targeting-rules-editor, create-project-dialog, etc.)
- `components/ui/` — UI primitive tests (button, input, card, badge, select, etc.)

### Test Coverage per Component

| Test Type | Description |
|---|---|
| Render | Component mounts without crashing |
| Loading state | Shows skeleton/spinner while data loads |
| Error state | Shows error message on API failure |
| Empty state | Shows appropriate message when data is empty |
| Primary interaction | Main user action works (click, submit, toggle) |
| Edge cases | Long text, special characters, boundary values |
| Accessibility | Keyboard navigation, ARIA labels, focus management |

### Testing Philosophy

- **Mock at the network boundary** — mock `@/lib/api` at the module level, not individual components
- **Query by role and label** — never by class or DOM structure
- **Test user behavior**, not implementation details

```dashboard/src/__tests__/components/ui/button.test.tsx#L1-50
describe("Button", () => {
  it("renders visible text for the user", () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("clicks and triggers the action", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner and disables interaction when loading", () => {
    render(<Button loading onClick={onClick}>Saving</Button>);
    const btn = screen.getByRole("button", { name: "Saving" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
})
```

Page-level tests use mock implementations for `@/lib/api`, `next/navigation`, and `next/link`:

```dashboard/src/__tests__/app/flags-page.test.tsx#L1-25
vi.mock("@/lib/api", () => ({
  api: {
    listFlags: vi.fn(),
    listEnvironments: vi.fn(),
    createFlag: vi.fn(),
    deleteFlag: vi.fn(),
    // ...
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/flags",
  useSearchParams: () => new URLSearchParams(""),
}));
```

## CI Integration

### CI Pipeline (Dagger)

The CI pipeline is defined in `ci/main.go` and has two main entry points:

**`Validate`** (runs on PR and push to all branches except main):
1. Detects changed projects (server, dashboard, ops-portal) via `DetectChanges`
2. For **server**: `go vet ./...`, `go build ./...`, `go test ./... -short` (short mode skips integration tests)
3. For **dashboard**: `npm ci`, `npm run lint`, `npm run build`
4. For **ops-portal**: `tsc --noEmit`, `npm run lint`, `npm run build`

**`FullTest`** (runs on merge to main, tag, and release):
1. **Server** (unit + integration): `go test ./... -count=1 -timeout=180s -race -coverprofile=coverage.out -covermode=atomic` against an ephemeral PostgreSQL 16-alpine container
2. **Dashboard**: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test:coverage`, `npm run build`
3. **SDKs**: Go, Node, Python, Java — each runs its test suite

### Makefile Targets

```Makefile#L245-260
test: test-server test-dash          ## Run all tests
test-server:                         ## Server tests with coverage
	cd server && go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out
test-dash:                           ## Dashboard tests with coverage
	cd dashboard && npm run test:coverage
lint:                                ## All linters
	cd server && go vet ./...
	cd dashboard && npx tsc --noEmit
```

### What Runs Where

| Event | Server Tests | Dashboard Tests | SDK Tests |
|---|---|---|---|
| PR (any branch) | `-short` (unit only) | `npm run lint`, `build` | — |
| Push to `main` | `-short` (unit only) | `npm run lint`, `build` | — |
| Tag / Release | Full suite + integration | Full suite + coverage | Full suite |
| `make test` | `-race -coverprofile` | `test:coverage` | — |

## Coverage Targets

| Tier | Target | Packages |
|---|---|---|
| Overall | ≥ 80% line coverage | All packages |
| Critical path | ≥ 95% line coverage | `eval.Engine`, `auth`, `billing/license` |
| Dashboard | ≥ 80% overall, ≥ 90% for business-logic pages | All pages + components |

Coverage is measured in CI. No PRs that reduce coverage of changed packages are permitted. Coverage is a minimum bar, not the goal — the focus is on meaningful assertions over raw line coverage.

**Commands that must pass:**
```
go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out
go vet ./...
govulncheck ./...
npx vitest run --coverage
npx tsc --noEmit
```

## Test Infrastructure

### Ephemeral PostgreSQL (Integration Tests)

Integration tests run against a real PostgreSQL 16 instance. In CI, this is provisioned via Dagger's `Container.AsService()`:

```ci/main.go#L184-217
pgSrv := dag.Container().
    From("postgres:16-alpine").
    WithEnvVariable("POSTGRES_USER", "fs").
    WithEnvVariable("POSTGRES_PASSWORD", "fsdev").
    WithEnvVariable("POSTGRES_DB", "featuresignals").
    WithExposedPort(5432).
    AsService()

ctr := dag.Container().
    From("golang:1.23-alpine").
    WithServiceBinding("postgres", pgSrv).
    WithEnvVariable("TEST_DATABASE_URL",
        "postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable").
    WithExec([]string{"go", "test", "./...", "-count=1", "-timeout=180s",
        "-race", "-coverprofile=coverage.out", "-covermode=atomic"})
```

For local development, `TEST_DATABASE_URL` points to a local PostgreSQL instance. `testcontainers-go` is available for CI environments that need ephemeral databases without Dagger. Cleanup uses transaction rollback or explicit truncation.

### Caching

- **Go modules**: `go-mod` cache volume
- **Go build cache**: `go-build` cache volume
- **npm packages**: `npm` cache volume

## Flaky Test Management

Flaky tests are treated as P1 bugs. The process:

1. **Tag the test** with `// flaky: <issue-url>` in the source
2. **Create a GitHub issue** describing the failure pattern and environment
3. **Fix within one sprint** — flaky tests undermine confidence in CI
4. **Use `-count=1`** in all CI test commands to prevent caching from masking flakiness
5. **Use `-race`** to catch data races that might manifest as flaky failures

When a flaky test is identified:
- Run `go test -count=100 -race ./package/...` to reproduce
- Check for shared mutable state, timing dependencies, or network assumptions
- Consider using `t.Parallel()` only when the test is truly independent and thread-safe
- Log the flaky test metrics: failure rate, environment, and last passing commit

## Cross-References

- [[Development]] — branch naming, commit conventions, code review process
- [[Architecture]] — hexagonal architecture that makes handler testing with mock stores possible
- [CONTRIBUTING.md](/CONTRIBUTING.md) — golden rule, PR requirements, CI check requirements
- [CI Pipeline (ci/main.go)](/ci/main.go) — Validate and FullTest Dagger functions

## Sources

- `CLAUDE.md` (L276-372) — test pyramid, table-driven patterns, naming, mockStore, coverage targets, dashboard testing standards
- `CONTRIBUTING.md` — branch protection rules, PR requirements, CI gate
- `server/internal/api/handlers/flags_test.go` — 41 test functions covering create, list, get, update, delete, promote, compare, sync, org isolation
- `server/internal/api/handlers/testutil_test.go` — 248-symbol mockStore implementing every domain.Store interface method
- `server/internal/api/handlers/eval_test.go` — 14 test functions for evaluation endpoints (evaluate, bulk, client flags, streaming)
- `server/internal/api/handlers/auth_test.go` — registration, login, missing fields, password policy tests
- `server/internal/domain/domain_test.go` — plan defaults, EvalContext attribute access
- `server/internal/domain/errors_test.go` — sentinel error unwrapping, WrapNotFound, WrapConflict
- `dashboard/src/__tests__/` — 56 test files across app/, components/, components/ui/
- `dashboard/src/__tests__/components/ui/button.test.tsx` — rendering, click, disabled, loading, asChild patterns
- `dashboard/src/__tests__/app/flags-page.test.tsx` — page-level mock at network boundary
- `ci/main.go` — Validate (vet+build+short-test) and FullTest (full suite+coverage+integration) Dagger pipelines
- `Makefile` (L245-260) — test, test-server, test-dash, lint targets
```

Now let me create the PERFORMANCE.md file.

```
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

Each step short-circuits — the first matching condition determines the result. This means evaluating a disabled flag (the most common case for flags that are fully rolled out or off) takes only 3 map lookups and a boolean check.

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

The implementation is hand-rolled (no external dependency) with the canonical `c1=0xcc9e2d51`, `c2=0x1b873593` constants, proper rotation and finalization mixing:

```server/internal/eval/hash.go#L9-L44
func murmurHash3(key string, seed uint32) uint32 {
	data := []byte(key)
	length := len(data)
	nblocks := length / 4
	var h1 uint32 = seed
	const (c1 uint32 = 0xcc9e2d51; c2 uint32 = 0x1b873593)
	// Body: process 4-byte blocks
	for i := 0; i < nblocks; i++ {
		k1 := uint32(data[i*4]) | uint32(data[i*4+1])<<8 |
		      uint32(data[i*4+2])<<16 | uint32(data[i*4+3])<<24
		k1 *= c1; k1 = rotl32(k1, 15); k1 *= c2
		h1 ^= k1; h1 = rotl32(h1, 13)
		h1 = h1*5 + 0xe6546b64
	}
	// Tail: 0-3 remaining bytes
	// Finalization: fmix32 — avalanche all bits
	h1 ^= h1 >> 16; h1 *= 0x85ebca6b
	h1 ^= h1 >> 13; h1 *= 0xc2b2ae35
	h1 ^= h1 >> 16
	return h1
}
```

### Targeting Rule Matching

Rules are sorted by `priority` (ascending) and evaluated in order:

```
sort.Slice(rules, func(i, j int) bool { return rules[i].Priority < rules[j].Priority })
```

For each rule:
1. **Segment matching**: Check if user's attributes match any segment's conditions (using `MatchConditions` with `MatchAll`/`MatchAny` logic)
2. **Direct condition matching**: Check rule-level conditions against context attributes
3. **Percentage gate**: If `rule.Percentage < 10000`, compute `BucketUser(flagKey, ctx.Key)` and check if `bucket < rule.Percentage`
4. **Value delivery**: Matching users receive the rule's `value`

The `matchRule` implementation is branch-efficient — it short-circuits on the first failing segment or condition:

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

## Cache Architecture

### In-Memory Ruleset Cache

The `cache.Cache` stores a `*domain.Ruleset` per environment in a `map[string]*domain.Ruleset` protected by `sync.RWMutex`:

```server/internal/store/cache/inmemory.go#L54-70
type Cache struct {
	mu              sync.RWMutex
	rulesets        map[string]*domain.Ruleset // envID -> ruleset
	store           domain.Store
	logger          *slog.Logger
	broadcaster     Broadcaster
	webhookNotifier WebhookNotifier
	listening       bool
}
```

Reads use `RLock` (multiple concurrent readers), writes use full `Lock`. The `GetRuleset` method returns the cached pointer directly — no copying:

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

A ruleset is pre-populated as a single object graph with three maps (Flags, States, Segments) keyed by `flagKey` for O(1) lookup during evaluation. The `LoadRuleset` method builds this graph from the database:

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
    └── Webhook dispatcher enqueue
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
		// Broadcast via SSE
		if c.broadcaster != nil {
			c.broadcaster.BroadcastFlagUpdate(change.EnvID, map[string]string{
				"type": "flag_update", "env_id": change.EnvID,
				"flag_id": change.FlagID, "action": change.Action,
			})
		}
		// Dispatch webhook (with 5s context timeout)
		if c.webhookNotifier != nil {
			notifyCtx, notifyCancel := context.WithTimeout(context.Background(), 5*time.Second)
			c.webhookNotifier.NotifyFlagChange(notifyCtx, change.EnvID, change.FlagID, change.Action)
			notifyCancel()
		}
	})
	return err
}
```

Metrics are tracked via OpenTelemetry:
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

Each client has a buffered channel (`make(chan []byte, 64)`) to absorb bursts without blocking the broadcaster:

```server/internal/sse/server.go#L48-56
client := &Client{
	envID:  envID,
	events: make(chan []byte, 64),
}
```

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

Each SSE handler goroutine is owned by the request context — when the client disconnects, `<-ctx.Done()` fires and the cleanup (`removeClient`) runs, closing the channel and decrementing the gauge. No goroutine leaks.

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

The evaluation hot path uses index-only scans on the `flags`, `flag_states`, and `segments` tables.

### Query Patterns

- **Parameterized queries exclusively**: `$1`, `$2` — never interpolated
- **No `SELECT *`**: Select only the columns needed
- **Batch reads**: Prefer single queries with `IN (...)` over N+1 loops
- **Cursor-based pagination**: `WHERE id > $last_id ORDER BY id LIMIT $n` for consistency under concurrent writes
- **Offset-based pagination**: Acceptable for admin/dashboard views
- **Short transactions**: No external I/O inside a transaction

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