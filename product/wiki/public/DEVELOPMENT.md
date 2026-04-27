---
title: Development Standards & Patterns
tags: [development, core]
domain: development
sources:
  - CLAUDE.md (enterprise dev standards)
  - CONTRIBUTING.md (contribution guidelines)
  - server/README.md (server structure)
  - dashboard/CLAUDE.md (dashboard standards)
  - dashboard/AGENTS.md (Next.js agent rules)
  - server/internal/domain/store.go (Store interface & focused sub-interfaces)
  - server/internal/domain/errors.go (sentinel errors & wrappers)
  - server/internal/domain/flag.go (domain entities)
  - server/internal/api/handlers/flags.go (handler pattern)
  - server/internal/api/middleware/auth.go (middleware pattern)
  - Makefile (all make targets)
  - dashboard/src/stores/app-store.ts (Zustand pattern)
  - dashboard/src/hooks/use-data.ts (data fetching pattern)
  - CHANGELOG.md (development history)
  - docs/docs/GLOSSARY.md (terminology)
related:
  - [[Architecture]]
  - [[Testing]]
  - [[SDK]]
  - [[Deployment]]
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: high
---

## Overview

This page is the definitive reference for all development conventions, patterns, and standards at FeatureSignals. It covers the Go server, the Next.js dashboard, contribution workflow, package architecture, configuration patterns, and SDK development conventions. Every engineer (human or LLM) must follow these standards when writing or reviewing code in this repository.

---

## 1. Go Server Standards

### 1.1 Core Philosophy

The Go server follows **hexagonal architecture** (ports and adapters). Domain logic sits at the center with zero dependencies on infrastructure:

```
handlers (HTTP adapter) → domain interfaces (ports) ← store/postgres (DB adapter)
                        → domain entities & logic   ← cache adapter
                        → eval engine               ← webhook adapter
```

**Non-negotiable rules:**
- **No `panic()` in production code** — `panic` is for programmer errors only, never for expected conditions.
- **No `init()` side effects** — `init()` must not perform I/O, start goroutines, or modify global state.
- **No global mutable state** — Configuration loaded once, threaded via constructors. No singletons.
- **Context propagation everywhere** — Every function doing I/O or potentially blocking accepts `context.Context` as its first parameter.
- **Errors are values** — Wrap with context, preserve the chain, never swallow.
- **Structured logging** — Use `slog` exclusively. No `fmt.Println` or `log.Printf`.

### 1.2 Idiomatic Go

| Rule | Detail |
|------|--------|
| **Accept interfaces, return structs** | Constructors return `*ConcreteType`, parameters accept interfaces |
| **Errors are values** | Wrap with `fmt.Errorf("noun action: %w", err)`. Use sentinel errors from `domain/errors.go` |
| **Context propagation** | Every I/O function accepts `context.Context` as first parameter. Respect cancellation. Set timeouts |
| **Structured logging** | `slog` with JSON handler. Request-scoped loggers via `httputil.LoggerFromContext(r.Context())` |
| **Goroutine lifecycle** | Caller owns lifecycle. Use `context.WithCancel` + `defer cancel()`. Use `errgroup.Group` for fan-out |
| **Zero-value usefulness** | Structs are useful at zero value or force construction via `New*` functions |
| **No package-level mutable state** | Configuration loaded once in `main` and threaded via constructors |

### 1.3 Handler Pattern

Every handler follows this exact structure, defined in `server/internal/api/handlers/`:

```server/internal/api/handlers/flags.go#L32-42
type FlagHandler struct {
	store   flagStore
	emitter domain.EventEmitter
}

func NewFlagHandler(store flagStore, emitter domain.EventEmitter) *FlagHandler {
	if emitter == nil {
		emitter = NoopEmitter()
	}
	return &FlagHandler{store: store, emitter: emitter}
}
```

Each handler has a logger helper:

```server/internal/api/handlers/flags.go#L19-21
func (h *FlagHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "flags")
}
```

Handler methods follow this exact pattern:

```server/internal/api/handlers/flags.go#L187-205
func (h *FlagHandler) Get(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "failed to get flag")
		}
		return
	}

	httputil.JSON(w, http.StatusOK, dto.FlagFromDomain(flag))
}
```

**Rules:**
- Handlers must not exceed ~40 lines. Extract business logic to domain methods or services.
- Handlers accept the narrowest interface possible (Interface Segregation Principle).
- Handlers never import concrete implementations. Only `domain` interfaces cross boundaries.
- Use `httputil.JSON` for success and `httputil.Error` for errors. Never write raw bytes or set Content-Type manually.
- Use `httputil.DecodeJSON(r, &req)` for request body parsing — it enforces `DisallowUnknownFields()` to prevent mass-assignment.
- Always use `errors.Is(err, domain.Err*)` for error matching — never type-switch on concrete error types.

### 1.4 Handler Store Interface Pattern

Each handler defines its own narrow interface (ISP) for the store methods it needs:

```server/internal/api/handlers/flags.go#L23-30
type flagStore interface {
	domain.FlagReader
	domain.FlagWriter
	domain.AuditWriter
	domain.OrgMemberStore
	domain.EnvPermissionStore
	projectGetter
}
```

This means the handler only depends on what it actually uses. The concrete `postgres.Store` implements all interfaces. Tests use an in-memory `mockStore` (in `handlers/testutil_test.go`).

### 1.5 Error Handling Contract

Sentinel errors from `server/internal/domain/errors.go`:

```server/internal/domain/errors.go#L9-16
var (
	ErrNotFound    = errors.New("not found")
	ErrConflict    = errors.New("conflict")
	ErrValidation  = errors.New("validation error")
	ErrMFARequired = errors.New("mfa_required")
	ErrMFAInvalid  = errors.New("invalid MFA code")
	ErrExpired     = errors.New("expired")
)
```

With enhanced wrappers:

```server/internal/domain/errors.go#L47-58
func WrapNotFound(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrNotFound)
}

func WrapConflict(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrConflict)
}

func WrapExpired(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrExpired)
}
```

And a rich validation error with field-level detail:

```server/internal/domain/errors.go#L22-44
type ValidationError struct {
	Field   string
	Message string
}
func (e *ValidationError) Unwrap() error { return ErrValidation }
func NewValidationError(field, message string) *ValidationError { ... }
```

**Status code mapping:**

| Domain Error | HTTP Status | When |
|---|---|---|
| `domain.ErrNotFound` / `WrapNotFound` | 404 | Entity does not exist |
| `domain.ErrConflict` / `WrapConflict` | 409 | Unique constraint violation |
| `domain.ErrValidation` / `NewValidationError` | 422 | Input validation failure |
| Unauthorized | 401 | Invalid/expired token |
| Forbidden | 403 | Insufficient role/permission |
| Rate limited | 429 | Too many requests |
| Payment required | 402 | License expired or feature not enabled |
| Unexpected error | 500 | Log full error with `slog.Error`, return generic message |

### 1.6 HTTP Response Contract

Use helper functions from `server/internal/httputil/response.go`:

- **Success:** `httputil.JSON(w, http.StatusOK, data)` — sets Content-Type, writes JSON body.
- **Error:** `httputil.Error(w, http.StatusNotFound, "message")` — writes `{ "error": "message", "request_id": "..." }`.
- **Request body:** `httputil.DecodeJSON(r, &req)` — decodes with `DisallowUnknownFields()`.

**Rules:**
- Never write raw bytes to the response.
- Never set Content-Type manually.
- Never write headers after the body has started.
- Always include `request_id` from the request context in error responses.

### 1.7 Middleware Rules

Middleware lives in `server/internal/api/middleware/`. Each middleware must:

- Call `next.ServeHTTP(w, r)` or return early — never both.
- Not modify the request after calling next.
- Use unexported key types for context values.
- Be independently testable with `httptest`.

**Auth middleware pattern** (from `server/internal/api/middleware/auth.go`):

```server/internal/api/middleware/auth.go#L39-95
func JWTAuth(jwtMgr auth.TokenManager, revoker ...RevocationChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			header := r.Header.Get("Authorization")
			if header == "" {
				httputil.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			// ... parse Bearer token, validate JWT, check revocation ...
			// Inject claims into context with unexported contextKey types:
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, OrgIDKey, claims.OrgID)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)
			// ... add tracing attributes ...
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

The auth middleware uses unexported `contextKey` type and accessor functions (`GetUserID`, `GetOrgID`, `GetRole`, `GetClaims`, `GetDataRegion`).

### 1.8 API Design Conventions

- All routes live under `/v1`. Breaking changes require `/v2`.
- RESTful resource naming: plural nouns (`/flags`, `/projects`), hierarchical nesting (`/projects/{id}/flags`).
- Router defined in `server/internal/api/router.go` using `chi` router.
- Public routes are rate-limited. Authenticated routes use `jwtAuth`. Role-based access uses `middleware.RequireRole(...)`.
- **Pagination:** `limit` + `offset` query params. Return `{ data: [...], total: N }`. Default limit 50, max 100.
- **Filtering/sorting:** Query params validated against allowlists — never pass raw values to SQL `ORDER BY`.
- **Idempotency:** `Idempotency-Key` header for critical paths (billing, provisioning).
- **Timestamps:** All UTC, RFC 3339 format in JSON responses.
- **Evaluation hot path** (`/v1/evaluate`, `/v1/client/{envKey}/flags`): No database calls. Everything from cached `eval.Ruleset`.

---

## 2. Dashboard Standards

### 2.1 Next.js App Router

- **App Router only** — all pages under `dashboard/src/app/`. Never Pages Router.
- **Server components by default** — only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- Route groups for layout separation: `dashboard/src/app/(app)/` for authenticated routes, `dashboard/src/app/(auth)/` for login/register flows.
- API routes in `dashboard/src/app/api/` for Next.js API endpoints.

### 2.2 State Management

**Zustand** is the single state management library. No Redux, Jotai, or other state libraries.

Pattern (from `dashboard/src/stores/app-store.ts`):

```dashboard/src/stores/app-store.ts#L1-60
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  organization: Organization | null;
  currentProjectId: string | null;
  currentEnvId: string | null;
  setAuth: (...) => void;
  logout: () => void;
  setCurrentProject: (id: string) => void;
  // ...
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // initial state
      token: null,
      // ...
      setAuth: (token, refreshToken, user, ...) =>
        set({ token, refreshToken, user, ... }),
      logout: () => set({ ...reset state }),
    }),
    { name: "app-store" },
  ),
);
```

Store files in `dashboard/src/stores/`: `app-store.ts`, `sidebar-store.ts`.

### 2.3 API Client

**`dashboard/src/lib/api.ts`** is the single API gateway. Never call `fetch` directly in components. It handles:

- Token injection (Authorization header)
- Token refresh on 401 (internal retry)
- Error mapping and session expiry
- Request timeout (30s default)
- Retry logic (up to 3 retries)
- All typed response interfaces from `@/lib/types`

```dashboard/src/lib/api.ts#L1-20
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  extraHeaders?: Record<string, string>;
  _retry?: boolean;
}
```

### 2.4 Data Fetching Pattern

Custom hooks in `dashboard/src/hooks/` use `useQuery` and `useMutation` from `./use-query`:

```dashboard/src/hooks/use-data.ts#L35-48
export function useProjects() {
  const token = useAppStore((s) => s.token);
  const key = cacheKey("projects", token ? "list" : null);
  return useQuery<Project[]>(key, () => api.listProjects(token!), {
    enabled: !!token,
  });
}
```

Hooks are:
- In `dashboard/src/hooks/` — one file per domain concept
- Pure (no side effects outside of React lifecycle)
- Use the `cacheKey(...)` pattern for deterministic, nullable cache keys

Available hooks: `use-data.ts`, `use-experiment.ts`, `use-features.ts`, `use-janitor.ts`, `use-janitor-scan-progress.ts`, `use-janitor-stats.ts`, `use-janitor-summary.ts`, `use-query.ts`, `use-upgrade-nudge.ts`, `use-workspace.ts`.

### 2.5 TypeScript

| Rule | Detail |
|------|--------|
| **Strict mode** | `strict: true` in `tsconfig.json`. Zero tolerance for `any` |
| **Interfaces for objects** | `interface` for object shapes, `type` for unions/intersections |
| **Discriminated unions** | `{ status: 'loading' } \| { status: 'error'; error: string } \| { status: 'success'; data: T }` |
| **No non-null assertions** | No `!` without a preceding guard or justifying comment |
| **No ts-ignore** | No `@ts-ignore` or `@ts-expect-error` without a linked issue |
| **Path alias** | `@/` maps to `dashboard/src/`. Always use it |

### 2.6 Component Architecture

- **Functional components only.**
- UI primitives in `dashboard/src/components/ui/` (Radix-based).
- Page-specific components adjacent to their page or in `dashboard/src/components/`.
- Custom hooks for reusable logic in `dashboard/src/hooks/`.
- `cn()` from `@/lib/utils` for conditional Tailwind class merging:

```dashboard/src/lib/utils.ts#L1-5
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- `safeApiCall()` from `@/lib/utils` for promise safety:

```dashboard/src/lib/utils.ts#L33-43
export async function safeApiCall<T>(
  fn: () => Promise<T>,
): Promise<[T | undefined, Error | undefined]> {
  try {
    const result = await fn();
    return [result, undefined];
  } catch (err) {
    return [undefined, err instanceof Error ? err : new Error(String(err))];
  }
}
```

- Error boundaries for every major page section. Use `error.tsx` convention.
- Loading states for every async operation. Use suspense boundaries or explicit loading UI.

### 2.7 Styling

- **Tailwind CSS 4 only.** No CSS modules, styled-components, or inline styles.
- Design tokens from Tailwind config. No hardcoded color hex values.
- Mobile-first responsive: base styles for mobile, `sm:`, `md:`, `lg:` for larger screens.

### 2.8 Accessibility

- Radix UI for accessible interactive elements (dialogs, dropdowns, tooltips).
- Keyboard navigation, ARIA labels, focus management.
- Test with screen readers.

### 2.9 Next.js Version Note

⚠️ **This project uses a version of Next.js with breaking changes** — APIs, conventions, and file structure may all differ from generic training data. Before writing any dashboard code, consult the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices. See `dashboard/AGENTS.md`.

---

## 3. Contribution Workflow

### 3.1 Golden Rule

```
main is always deployable. Never commit directly to main.
```

Branch protection is enforced for **all users including admins**. Every change requires:
- A pull request
- At least 1 approving review (code owner review required)
- All CI checks passing (Server tests, Server lint, Dashboard tests)
- All review conversations resolved
- Linear commit history (no merge commits — squash or rebase only)

### 3.2 Branch Naming

Format: `<type>/<ticket-or-short-id>-<kebab-case-description>`

| Type | When to Use | Example |
|------|-------------|---------|
| `feature/` | New functionality | `feature/FS-42-saml-sso-login` |
| `fix/` | Bug fix | `fix/FS-108-session-expired-cross-region` |
| `hotfix/` | Urgent production fix | `hotfix/FS-200-eval-cache-nil-panic` |
| `chore/` | Maintenance, deps, CI, docs | `chore/upgrade-go-1-25` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/extract-eval-middleware` |
| `perf/` | Performance improvement | `perf/FS-77-ruleset-cache-preload` |
| `docs/` | Documentation only | `docs/sdk-quickstart-guide` |
| `test/` | Adding/improving tests only | `test/billing-handler-edge-cases` |
| `infra/` | Infrastructure, Terraform, Docker, Helm | `infra/helm-chart-resource-limits` |
| `release/` | Release preparation | `release/v1.4.0` |
| `experiment/` | Throwaway spikes or PoCs (never merge directly) | `experiment/grpc-eval-api` |

**Rules:**
- Use lowercase, kebab-case only.
- Include the ticket ID when one exists.
- Keep it under 50 characters after the type prefix.
- Branch off `main` unless building on top of another feature branch.

### 3.3 Commit Message Convention

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Meaning |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Maintenance, deps, CI config |
| `ci` | CI/CD changes only |
| `style` | Formatting (no code change) |
| `revert` | Revert a previous commit |

**Scopes:**

| Scope | What it covers |
|-------|---------------|
| `server` | Go API server |
| `dashboard` | Next.js dashboard |
| `sdk-go` | Go SDK |
| `sdk-node` | Node SDK |
| `sdk-python` | Python SDK |
| `sdk-java` | Java SDK |
| `sdk-react` | React SDK |
| `eval` | Evaluation engine |
| `auth` | Authentication/authorization |
| `billing` | Payment/subscription |
| `proxy` | Multi-region proxy |
| `infra` | Docker, Helm, Terraform |
| `docs` | Documentation site |
| `ci` | GitHub Actions, CI/CD |

**Examples:**

```
feat(auth): add SAML SSO login flow

fix(proxy): route refresh tokens to correct regional server

Tokens issued by a regional server were validated against the global
router's JWT secret, causing immediate session expiry for cross-region
signups. AuthRegionRouter now proxies requests to the issuing region
before JWT validation.

Fixes FS-108

perf(eval): preload rulesets on cache miss
```

**Rules:**
- Imperative mood: "add" not "added" or "adding".
- First line under 72 characters.
- Reference ticket IDs in the footer: `Fixes FS-42` or `Refs FS-42`.
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type/scope.

### 3.4 PR Workflow

**PR Requirements:**

| Requirement | Detail |
|-------------|--------|
| **Title** | Follows commit convention: `type(scope): description` |
| **Body** | Summary (what + why), test plan, ticket reference |
| **Size** | Aim for < 400 lines changed. Split large features into stacked PRs |
| **Tests** | All new code has tests. Coverage must not decrease |
| **CI** | All 3 checks must pass: Server tests, Server lint, Dashboard tests |
| **Review** | At least 1 approval from a code owner |
| **Conversations** | All review threads must be resolved |
| **Rebase** | Branch must be up to date with main |

**PR Template checklist** (from `.github/PULL_REQUEST_TEMPLATE.md`):

- [ ] Branch named correctly (`story/`, `bug/`, `task/`, `hotfix/`, `docs/`)
- [ ] No secrets or credentials committed
- [ ] Server tests pass (`make test-server`)
- [ ] Dashboard tests pass (`make test-dash`)
- [ ] New migrations have matching down files
- [ ] API changes are backward-compatible
- [ ] Error handling and logging follow CLAUDE.md standards

**After Approval:**
- **Squash and merge** for feature/fix/chore branches.
- Delete the branch after merge (GitHub does this automatically).

### 3.5 Code Review Guidelines

**For Authors:**
- Self-review first: read your own diff before requesting review.
- Small PRs: easier to review, faster to merge, fewer conflicts.
- Describe the "why" — the diff shows "what" changed, the PR description explains "why".
- Respond promptly to feedback.

**For Reviewers:**
- Review within 4 hours during business hours.
- Be specific: "This could panic if `org` is nil — add a nil check" not "looks wrong".
- Distinguish severity with prefixes:
  - `blocker:` — Must fix before merge.
  - `nit:` — Style preference, take it or leave it.
  - `question:` — Seeking understanding, not requesting a change.
  - `suggestion:` — Optional improvement idea.
- Approve when ready — don't hold PRs hostage for nits.

### 3.6 Release Process

**Versioning:** Semantic Versioning `vMAJOR.MINOR.PATCH`

| Increment | When | Example |
|-----------|------|---------|
| **MAJOR** | Breaking API changes | `v1.0.0` → `v2.0.0` |
| **MINOR** | New features, backward compatible | `v1.3.0` → `v1.4.0` |
| **PATCH** | Bug fixes, backward compatible | `v1.4.0` → `v1.4.1` |

Pre-release tags: `v1.4.0-rc.1`, `v1.4.0-beta.1`.

**Release commands:**
```bash
git checkout main
git pull origin main
git tag -a v1.4.0 -m "Release v1.4.0: SAML SSO, approval workflows, kill switch"
git push origin v1.4.0
# Or via Makefile:
make release V=1.4.0
```

---

## 4. Package Map

All server packages under `server/internal/`.

### 4.1 Internal Packages

| Package | Path | Purpose | Depends On |
|---------|------|---------|------------|
| **domain** | `server/internal/domain/` | Core entities, interfaces, sentinel errors. Zero external dependencies. | Nothing (stdlib only) |
| **api** | `server/internal/api/` | Route definitions and middleware stack | `domain`, `auth`, `httputil`, `middleware` |
| **api/handlers** | `server/internal/api/handlers/` | HTTP handlers (one file per resource) | `domain` (narrow interfaces), `httputil` |
| **api/middleware** | `server/internal/api/middleware/` | Auth, logging, rate limiting, CORS | `auth`, `httputil` |
| **api/router** | `server/internal/api/router.go` | Route definitions via chi | All handler packages |
| **auth** | `server/internal/auth/` | JWT token management, bcrypt password hashing | `domain` |
| **config** | `server/internal/config/` | Environment variable loader, single config struct | Nothing |
| **eval** | `server/internal/eval/` | Stateless evaluation engine, condition matching, MurmurHash3 | `domain` |
| **httputil** | `server/internal/httputil/` | JSON/error response helpers, context logger injection | `domain` |
| **sse** | `server/internal/sse/` | SSE connection manager + broadcast | Nothing |
| **store** | `server/internal/store/` | Adapter implementations | `domain` |
| **store/cache** | `server/internal/store/cache/` | In-memory ruleset cache + PG NOTIFY listener | `domain` |
| **store/postgres** | `server/internal/store/postgres/` | PostgreSQL Store implementation (pgx) | `domain` |

### 4.2 Domain Entities

Each domain entity file in `server/internal/domain/` contains types for one resource:

| File | Key Types |
|------|-----------|
| `flag.go` | `Flag`, `FlagState`, `TargetingRule`, `Condition`, `Variant`, `FlagType`, `FlagCategory`, `FlagStatus`, `Operator`, `MatchType` |
| `store.go` | `Store` (mega-interface), plus 35+ focused sub-interfaces (`FlagReader`, `FlagWriter`, `EvalStore`, `AuditWriter`, `SegmentStore`, etc.) |
| `errors.go` | `ErrNotFound`, `ErrConflict`, `ErrValidation`, `ValidationError`, `WrapNotFound()`, `WrapConflict()`, `NewValidationError()` |
| `eval_context.go` | `EvalContext`, `EvalResult`, `Reason*` constants |
| `segment.go` | `Segment`, segment-related types |
| `organization.go` | `Organization` with plan limits, trial expiry, data region, soft-delete |
| `user.go` | `User`, `OrgMember`, `Role`, `EnvPermission` |
| `project.go` | `Project` |
| `environment.go` | `Environment` |
| `apikey.go` | `APIKey`, `APIKeyType` |
| `audit.go` | `AuditEntry` with SHA-256 chain hash for tamper evidence |

### 4.3 Store Interface Architecture

The `domain.Store` interface composes 35+ focused sub-interfaces (Interface Segregation Principle). Handlers depend on the narrowest interface they need:

- `FlagReader` — read-only flag access (`GetFlag`, `ListFlags`, `GetFlagState`, `ListFlagStatesByEnv`)
- `FlagWriter` — flag mutations (`CreateFlag`, `UpdateFlag`, `DeleteFlag`, `UpsertFlagState`)
- `EvalStore` — evaluation hot path (`LoadRuleset`, `ListenForChanges`, `GetEnvironmentByAPIKeyHash`, `UpdateAPIKeyLastUsed`)
- `AuditWriter` / `AuditReader` — audit log
- `ProjectReader` / `ProjectWriter` — project CRUD
- `EnvironmentReader` / `EnvironmentWriter` — environment CRUD
- `OrgReader` / `OrgWriter` — organization CRUD
- `UserReader` / `UserWriter` — user CRUD
- `APIKeyStore` — API key CRUD
- `BillingStore` — subscriptions, usage, payment events
- Plus: `WebhookStore`, `ApprovalStore`, `SSOStore`, `MFAStore`, `LoginAttemptStore`, `IPAllowlistStore`, `CustomRoleStore`, `TokenRevocationStore`, `FlagVersionStore`, `MagicLinkStore`, and more.

### 4.4 Dashboard Structure

```
dashboard/src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated layout group
│   ├── auth/               # Auth routes
│   ├── api/                # API routes
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Tailwind globals
├── components/             # React components
│   ├── ui/                 # Primitive UI components (Radix)
│   ├── icons/              # SVG icon components
│   └── (domain-specific)   # targeting-rules-editor, flag-slide-over, etc.
├── hooks/                  # Custom React hooks
│   ├── use-data.ts         # Project, env, flag, segment data fetching
│   ├── use-query.ts        # Generic query/mutation hook
│   └── use-*.ts            # Domain-specific hooks
├── lib/                    # Shared utilities
│   ├── api.ts              # Single API gateway
│   ├── types.ts            # All TypeScript interfaces
│   └── utils.ts            # cn(), timeAgo(), safeApiCall(), etc.
├── stores/                 # Zustand stores
│   ├── app-store.ts        # Auth, org, project/env selection
│   └── sidebar-store.ts    # Sidebar state
└── __tests__/              # Test files (mirroring source tree)
```

---

## 5. Configuration Pattern

### 5.1 Environment Variable Loading

Defined in `server/internal/config/config.go`. `config.Load()` is the single source of truth for all runtime configuration.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listen port |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | (required in prod) | HMAC secret for JWT signing |
| `TOKEN_TTL_MINUTES` | `60` | Access token lifetime |
| `REFRESH_TTL_HOURS` | `168` (7 days) | Refresh token lifetime |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

### 5.2 .env.example Convention

- `.env.example` documents ALL environment variables with safe development defaults.
- `.env` (gitignored) is the local development file, copied from `.env.example`.
- Production secrets are injected at deploy time via CI/CD, never committed.
- New config fields must be added to: `config.go`, `.env.example`, `.env.production.example`, `docker-compose.yml`, and `docker-compose.prod.yml`.
- Config validation: fail fast at startup if required config is missing or invalid.

### 5.3 JWT Secret Safety

The JWT secret startup check in non-development environments ensures the default value is never used in production. API keys use SHA-256 hashing — the raw key is shown only once at creation.

---

## 6. SDK Development Patterns

### 6.1 OpenFeature Provider Pattern

All SDKs implement an OpenFeature provider. Key patterns observed across Go, Node.js, Python, Java, and React SDKs:

- **Provider interface**: Implements OpenFeature's standard `Provider` contract.
- **Client creation**: `OpenFeature.getClient()` with the FeatureSignals provider.
- **Evaluation methods**: `GetBooleanValue()`, `GetStringValue()`, `GetNumberValue()`, `GetObjectValue()`.
- **Context handling**: Provider accepts `EvaluationContext` with `targeting_key` and attributes.

### 6.2 SSE Streaming

- Real-time flag updates via Server-Sent Events.
- SDK connects to `GET /v1/stream/{envKey}` with the environment's API key.
- Uses PostgreSQL `LISTEN/NOTIFY` under the hood — the server broadcasts flag changes to all connected SDKs.
- SDK maintains an in-memory cache that updates on SSE events.

### 6.3 Caching Strategy

- SDKs cache rulesets locally after first evaluation.
- Cache is invalidated via SSE events from the server.
- Polling fallback: SDKs periodically fetch `GET /v1/client/{envKey}/flags` if SSE connection drops.
- The server-side cache (`store/cache/inmemory.go`) uses PG NOTIFY for cross-instance invalidation.

### 6.4 Consistent Hashing

- Percentage rollouts use **MurmurHash3** for deterministic assignment (`server/internal/eval/hash.go`).
- The hash is computed as `MurmurHash3_32(targetKey + flagKey) % 10000`.
- All SDKs must implement the same hashing algorithm for consistent evaluation.

### 6.5 SDK Scopes in Commits

| Scope | SDK |
|-------|-----|
| `sdk-go` | Go SDK |
| `sdk-node` | Node.js SDK |
| `sdk-python` | Python SDK |
| `sdk-java` | Java SDK |
| `sdk-react` | React SDK |

---

## 7. Makefile Target Reference

### 7.1 Development

| Target | Description |
|--------|-------------|
| `make setup` | One-time dev setup: git hooks, Go deps, Node 22+, npm ci, golang-migrate CLI |
| `make dev-help` | Show native development quickstart guide |
| `make dev` | Full local stack: Postgres + migrations + server |
| `make dev-deps` | Start only PostgreSQL via Docker |
| `make dev-server` | Run Go API server on :8080 |
| `make dev-dash` | Run Next.js dashboard on :3000 |
| `make dev-website` | Run marketing site on :3001 |
| `make dev-docs` | Run Docusaurus docs on :3002 |
| `make dev-migrate` | Apply pending migrations |
| `make dev-seed` | Load sample data |
| `make dev-stalescan` | Run stale flag scanner |
| `make dev-stop` | Stop all services and free ports |
| `make dev-db-create` | Create database in local Postgres (no Docker) |

### 7.2 Docker / Local

| Target | Description |
|--------|-------------|
| `make up` | Start Postgres container |
| `make down` | Stop Postgres container |
| `make local-up` | Start full-stack Docker (Postgres + server + dashboard) |
| `make local-up-caddy` | Start full-stack with Caddy reverse proxy |
| `make local-down` | Stop full-stack Docker |
| `make local-reset` | Hard reset: wipe volumes and restart |
| `make local-logs` | Follow Docker Compose logs |
| `make onprem-up` | Start on-prem deployment |
| `make onprem-down` | Stop on-prem deployment |

### 7.3 Testing

| Target | Description |
|--------|-------------|
| `make test` | Run all tests (server + dashboard) |
| `make test-server` | `go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out` |
| `make test-dash` | `npm run test:coverage` in dashboard |
| `make lint` | `go vet ./...` + `tsc --noEmit` |

### 7.4 Migrations

| Target | Description |
|--------|-------------|
| `make migrate-new NAME=desc` | Create a new migration pair (`NNNNNN_desc.up.sql` + `.down.sql`) |
| `make migrate-up` | Apply all pending migrations |
| `make migrate-down` | Roll back last migration |
| `make migrate-down-all` | Roll back all migrations (with confirmation) |
| `make migrate-status` | Show current migration version |

### 7.5 Database

| Target | Description |
|--------|-------------|
| `make db-tunnel REGION=in\|us\|eu` | Open SSH tunnel to production Postgres |
| `make db-admin REGION=in\|us\|eu` | Open psql as fs_admin |
| `make db-readonly REGION=in\|us\|eu` | Open psql as fs_readonly |
| `make db-setup-roles REGION=in\|us\|eu` | Run role provisioning on VPS |
| `make schema-snapshot` | Dump DB schema to `server/schema.snapshot.sql` |

### 7.6 Deploy & Infrastructure

| Target | Description |
|--------|-------------|
| `make deploy-staging` | Trigger staging deploy via GitHub CLI |
| `make deploy-prod` | Trigger production deploy (with confirmation) |
| `make release V=1.2.3` | Create a new git tag (CI builds and deploys) |
| `make k3s-install` | Bootstrap k3s on a fresh VPS |
| `make infra-deploy` | Deploy cert-manager, MetalLB, Caddy, PostgreSQL |
| `make app-deploy` | Deploy/upgrade application via Helm |
| `make app-deploy-staging` | Deploy staging environment |
| `make app-deploy-production` | Deploy production environment |
| `make db-migrate` | Run database migration job on k8s |
| `make backup-now` | Trigger immediate database backup |
| `make cert-renew` | Force certificate renewal |
| `make k8s-status` | Show k3s cluster status |

---

## 8. Database & Migrations

### 8.1 Migration Rules

- Migrations are sequential numbered pairs in `server/migrations/`: `000001_description.up.sql` / `000001_description.down.sql`.
- `up.sql` should be idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- `down.sql` must cleanly reverse the `up`. Test both directions.
- Never modify a migration that has been applied to any environment.
- Seed data goes in `server/scripts/seed.sql`, never in migration files.
- All tables must have `created_at TIMESTAMPTZ DEFAULT NOW()` and `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- Use `TEXT` for IDs to match existing convention.
- New migrations require matching down files (checked by PR template).

### 8.2 Query Performance

- Every `WHERE` clause column used in production queries must have an index. Add composite indexes for multi-column lookups.
- Every foreign key column must be indexed (PostgreSQL does NOT auto-index foreign keys).
- Use `EXPLAIN ANALYZE` on every new query against realistic data volumes.
- Use parameterized queries exclusively (`$1`, `$2`). Never interpolate user input into SQL.
- Select only the columns you need — no `SELECT *` in production code.
- For large result sets, use cursor-based pagination (`WHERE id > $last_id ORDER BY id LIMIT $n`).

---

## 9. Terminology

Consistent terminology is enforced across all surfaces (Flag Engine, docs, SDKs, APIs). See `docs/docs/GLOSSARY.md` for the complete reference. Key rules:

| Term | Usage Rule | API Field (backward compat) |
|------|------------|-----------------------------|
| **Workspace** | Top-level tenant. Use in UI/docs. Never say "organization" | `org_id` |
| **Project** | A distinct application within a workspace | `project_id` |
| **Environment** | Deployment stage (Development, Staging, Production) | `env_id` |
| **Flag** | A feature control. Never say "toggle" as a noun | `flag_key` |
| **Target** | The subject being evaluated | `entity_a`, `entity_b` |
| **Flag Engine** | The management UI. Never say "Dashboard" | — |
| **Plan** | "Free plan", "Pro plan", "Enterprise plan" | — |

---

## 10. Make Targets Summary

| Category | Key Targets |
|----------|-------------|
| **Setup** | `setup`, `dev-help` |
| **Development** | `dev`, `dev-server`, `dev-dash`, `dev-website`, `dev-docs`, `dev-seed` |
| **Docker** | `up`, `down`, `local-up`, `local-up-caddy`, `local-down`, `local-reset` |
| **Testing** | `test`, `test-server`, `test-dash`, `lint` |
| **Migrations** | `migrate-new`, `migrate-up`, `migrate-down`, `migrate-status` |
| **Database** | `db-tunnel`, `db-admin`, `db-readonly`, `schema-snapshot` |
| **Deploy** | `deploy-staging`, `deploy-prod`, `release` |
| **k3s/k8s** | `k3s-install`, `infra-deploy`, `app-deploy`, `backup-now`, `k8s-status` |
| **Docs** | `docs` (regenerates OpenAPI spec) |

---

## 11. Cross-References

- [[Architecture]] — Hexagonal architecture, multi-tenancy, evaluation hot path
- [[Testing]] — Test pyramid, table-driven tests, coverage targets, CI testing commands
- [[SDK]] — OpenFeature provider patterns across all SDKs, SSE streaming, consistent hashing
- [[Deployment]] — Docker Compose, k3s cluster, multi-region deployment
- [[Performance]] — Evaluation latency budget, caching strategy, PG NOTIFY invalidation
- [[Compliance]] — SOC 2, ISO 27001, data residency, audit trail (SHA-256 chained)

---

## 12. Sources

- `CLAUDE.md` — Enterprise development standards (590 lines): handler pattern, error handling, middleware rules, API design, database rules, testing strategy, security, configuration, resilience
- `CONTRIBUTING.md` — Branch naming, commit conventions, PR workflow, release process, code review guidelines
- `server/README.md` — Server architecture diagram, evaluation hot path, project structure, Makefile targets, environment variables, API examples
- `server/internal/domain/store.go` — Store interface with 35+ focused sub-interfaces, Interface Segregation Principle pattern
- `server/internal/domain/errors.go` — Sentinel errors (`ErrNotFound`, `ErrConflict`, `ErrValidation`, `ErrExpired`) and wrapper functions
- `server/internal/domain/flag.go` — Domain entities: `Flag`, `FlagState`, `TargetingRule`, `Condition`, `Variant`, operators, match types
- `server/internal/domain/eval_context.go` — `EvalContext`, `EvalResult`, evaluation reason constants
- `server/internal/domain/audit.go` — `AuditEntry` with SHA-256 chain hash for tamper-evident audit logging
- `server/internal/domain/organization.go` — `Organization` with plan limits, trial lifecycle, soft-delete, data region
- `server/internal/api/handlers/flags.go` — Live handler pattern with narrow store interfaces, ownership verification, audit logging, event emission
- `server/internal/api/middleware/auth.go` — JWT auth middleware with unexported context keys, revocation checking, OpenTelemetry tracing
- `Makefile` — All 50+ make targets across setup, dev, testing, deploy, infrastructure categories
- `dashboard/CLAUDE.md` — References AGENTS.md for Next.js version awareness
- `dashboard/AGENTS.md` — Next.js breaking changes warning; consult `node_modules/next/dist/docs/` before coding
- `dashboard/src/stores/app-store.ts` — Zustand pattern with persist middleware, typed state interface
- `dashboard/src/hooks/use-data.ts` — Data fetching hooks with `useQuery`, `cacheKey` pattern, typed API responses
- `dashboard/src/lib/api.ts` — Single API gateway with token injection, retry, timeout
- `dashboard/src/lib/utils.ts` — Utility functions: `cn()`, `timeAgo()`, `safeApiCall()`, `suggestSlug()`
- `CHANGELOG.md` — Development history from Phase 1 MVP (Feb 2026) through latest releases
- `docs/docs/GLOSSARY.md` — Canonical terminology: Workspace, Project, Environment, Flag, Target, Flag Engine