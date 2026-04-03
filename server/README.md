# FeatureSignals Server

The Go backend for FeatureSignals — a feature flag management platform with real-time evaluation, targeting rules, and percentage rollouts.

## Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Dashboard   │    │   Go SDK      │    │  REST Client │
│  (Next.js)   │    │  (polling/SSE)│    │  (curl, etc) │
└──────┬───────┘    └──────┬────────┘    └──────┬───────┘
       │ JWT               │ API Key            │
       ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    HTTP Router (chi)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Auth MW  │  │ Logging  │  │RateLimit │  │  CORS  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
├─────────────────────────────────────────────────────────┤
│  Management API          │  Evaluation API (hot path)   │
│  ─────────────           │  ─────────────────────────   │
│  POST /v1/auth/*         │  POST /v1/evaluate           │
│  CRUD /v1/projects/*     │  POST /v1/evaluate/bulk      │
│  CRUD /v1/flags/*        │  GET  /v1/client/{env}/flags │
│  CRUD /v1/segments/*     │  GET  /v1/stream/{env}  SSE  │
│  CRUD /v1/api-keys/*     │                              │
│  GET  /v1/audit          │                              │
├──────────────────────────┴──────────────────────────────┤
│                   domain.Store (interface)               │
├─────────────────────────────────────────────────────────┤
│  postgres.Store          │  cache.Cache (in-memory)     │
│  (pgx connection pool)   │  (invalidated via PG NOTIFY) │
├──────────────────────────┴──────────────────────────────┤
│                 PostgreSQL 16                            │
└─────────────────────────────────────────────────────────┘
```

### Key design decisions

| Concern | Approach |
|---------|----------|
| **Testability** | Every dependency is an interface (`domain.Store`, `auth.TokenManager`, `handlers.RulesetCache`, `handlers.StreamServer`). Handlers are tested with an in-memory mock store — no database required. |
| **Logging** | Structured JSON via `log/slog`. A request-scoped logger with `request_id`, `method`, and `path` is injected into context by middleware. All handlers call `httputil.LoggerFromContext(r.Context())`. |
| **Evaluation hot path** | Flags are evaluated in memory from a cached `eval.Ruleset`. PostgreSQL `LISTEN/NOTIFY` invalidates stale entries. Zero database calls on the hot path. |
| **Concurrency** | All shared state (`cache.Cache`, `sse.Server`) is protected by `sync.RWMutex`. The eval `Engine` is stateless and goroutine-safe. |

## Prerequisites

- **Go 1.22+**
- **PostgreSQL 16** (or use Docker)
- **golang-migrate** CLI (`brew install golang-migrate` or [install docs](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate))
- **Docker & Docker Compose** (optional, for local Postgres)

## Quick Start (Local Development)

```bash
# 1. Copy the environment file
cp .env.example .env

# 2. Start PostgreSQL (via Docker)
make dev-deps

# 3. Run migrations + start the server
make dev

# The server is now running on http://localhost:8080
# Health check: curl http://localhost:8080/health
```

### Without Docker (bring your own Postgres)

```bash
# Update DATABASE_URL in .env to point to your Postgres instance, then:
make migrate-up
make run
```

### Seed sample data

```bash
make seed
# Creates: Acme Corp org, admin@acme.com user (password: password123),
# Web App project, 3 environments, 3 flags, API keys
```

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make dev` | Full local setup: Postgres + migrations + server |
| `make dev-deps` | Start only PostgreSQL via Docker |
| `make run` | Start the server (reads `.env`) |
| `make build` | Build binary to `bin/server` |
| `make test` | Run all tests |
| `make test-cover` | Run tests with coverage report |
| `make migrate-up` | Apply pending migrations |
| `make migrate-down` | Roll back one migration |
| `make seed` | Insert sample data |
| `make lint` | Run golangci-lint |
| `make help` | Show all available targets |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listen port |
| `DATABASE_URL` | `postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=require` | PostgreSQL connection string (local dev often uses `sslmode=disable`) |
| `JWT_SECRET` | `dev-secret-change-in-production` | HMAC secret for JWT signing |
| `TOKEN_TTL_MINUTES` | `60` | Access token lifetime |
| `REFRESH_TTL_HOURS` | `168` (7 days) | Refresh token lifetime |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

## API Examples

### Register a user

```bash
curl -s -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "StrongP@ss1",
    "name": "Developer",
    "org_name": "My Org"
  }' | jq .
```

**Response** includes `user`, `organization`, and `tokens` (access + refresh).

### Login

```bash
curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "password": "StrongP@ss1"}' | jq .
```

### Create a feature flag

```bash
TOKEN="<access_token from login>"
PROJECT_ID="<project_id>"

curl -s -X POST http://localhost:8080/v1/projects/$PROJECT_ID/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout",
    "name": "New Checkout Flow",
    "description": "Redesigned checkout experience",
    "flag_type": "boolean",
    "default_value": false,
    "tags": ["checkout", "experiment"]
  }' | jq .
```

### Enable a flag for an environment with targeting

```bash
ENV_ID="<environment_id>"

curl -s -X PUT http://localhost:8080/v1/projects/$PROJECT_ID/flags/new-checkout/environments/$ENV_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage_rollout": 5000,
    "rules": [
      {
        "id": "rule-1",
        "priority": 1,
        "description": "Beta users get full access",
        "segment_keys": ["beta-users"],
        "percentage": 10000,
        "value": true,
        "match_type": "all"
      }
    ]
  }' | jq .
```

### Create an API key

```bash
curl -s -X POST http://localhost:8080/v1/environments/$ENV_ID/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Backend Service", "type": "server"}' | jq .
```

**Important:** The full API key is only returned once in the response. Save it immediately.

### Evaluate a flag (SDK / server-to-server)

```bash
API_KEY="<api_key from above>"

curl -s -X POST http://localhost:8080/v1/evaluate \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout",
    "context": {
      "key": "user-42",
      "attributes": {"plan": "pro", "country": "US"}
    }
  }' | jq .
```

**Response:**
```json
{
  "flag_key": "new-checkout",
  "value": true,
  "reason": "TARGETED"
}
```

### Bulk evaluate

```bash
curl -s -X POST http://localhost:8080/v1/evaluate/bulk \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_keys": ["new-checkout", "dark-mode", "banner-text"],
    "context": {"key": "user-42", "attributes": {"plan": "pro"}}
  }' | jq .
```

### Get all flags for client SDK

```bash
curl -s http://localhost:8080/v1/client/production/flags?key=user-42 \
  -H "X-API-Key: $API_KEY" | jq .
```

### SSE streaming (real-time updates)

```bash
curl -N "http://localhost:8080/v1/stream/production" \
  -H "X-API-Key: $API_KEY"
```

## Project Structure

```
server/
├── cmd/server/main.go        # Entry point, wires all dependencies
├── internal/
│   ├── api/
│   │   ├── router.go         # Route definitions and middleware stack
│   │   ├── handlers/         # HTTP handlers (one file per resource)
│   │   │   ├── auth.go       # Registration, login, token refresh
│   │   │   ├── flags.go      # Flag CRUD + state management
│   │   │   ├── segments.go   # Segment CRUD
│   │   │   ├── projects.go   # Project + environment CRUD
│   │   │   ├── apikeys.go    # API key management
│   │   │   ├── audit.go      # Audit log queries
│   │   │   └── eval.go       # Evaluation + SSE endpoints
│   │   └── middleware/
│   │       ├── auth.go       # JWT validation middleware
│   │       ├── logging.go    # Structured request logging + context logger
│   │       └── ratelimit.go  # Per-client rate limiting
│   ├── auth/
│   │   ├── jwt.go            # TokenManager interface + JWTManager impl
│   │   └── password.go       # bcrypt helpers
│   ├── config/
│   │   └── config.go         # Environment variable loader
│   ├── domain/               # Core types (zero external deps)
│   │   ├── store.go          # Store interface (data access contract)
│   │   ├── flag.go           # Flag, FlagState, TargetingRule, Condition
│   │   ├── eval_context.go   # EvalContext, EvalResult, reason constants
│   │   ├── segment.go        # Segment
│   │   ├── organization.go   # Organization
│   │   ├── user.go           # User, OrgMember, Role, EnvPermission
│   │   ├── project.go        # Project
│   │   ├── environment.go    # Environment
│   │   ├── apikey.go         # APIKey, APIKeyType
│   │   └── audit.go          # AuditEntry
│   ├── eval/
│   │   ├── engine.go         # Stateless evaluation engine
│   │   ├── conditions.go     # Condition matching (operators)
│   │   └── hash.go           # MurmurHash3 for consistent bucketing
│   ├── httputil/
│   │   ├── response.go       # JSON/error response helpers
│   │   └── logging.go        # Context-based logger injection
│   ├── sse/
│   │   └── server.go         # SSE connection manager + broadcast
│   └── store/
│       ├── cache/
│       │   └── inmemory.go   # In-memory ruleset cache + PG NOTIFY listener
│       └── postgres/
│           └── store.go      # PostgreSQL Store implementation (pgx)
├── migrations/               # SQL migration files (golang-migrate)
├── scripts/
│   └── seed.sql              # Sample data for local development
├── .env.example              # Environment variable template
├── Makefile                  # Build, test, dev, migrate targets
└── go.mod
```

## Testing

```bash
# Run all tests
make test

# Run with coverage
make test-cover

# Run a specific package
go test ./internal/eval/... -v
go test ./internal/api/handlers/... -v
```

All handler tests use an in-memory `mockStore` (in `testutil_test.go`) that implements `domain.Store`. No database is needed to run the test suite.

## Debugging

Set `LOG_LEVEL=debug` in your `.env` to see detailed evaluation logs:

```json
{"time":"2026-03-31T10:15:00Z","level":"DEBUG","msg":"flag evaluated","request_id":"abc123","flag_key":"new-checkout","user_key":"user-42","value":true,"reason":"TARGETED"}
```

Every log line includes a `request_id` for correlating entries across a single HTTP request.
