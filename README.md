<p align="center">
  <h1 align="center">FeatureSignals</h1>
  <p align="center">
    Open-source feature flag management platform with sub-millisecond evaluation, real-time updates, and zero vendor lock-in.
  </p>
  <p align="center">
    <a href="https://featuresignals.com">Website</a> &middot;
    <a href="https://docs.featuresignals.com">Documentation</a> &middot;
    <a href="https://app.featuresignals.com">Dashboard</a> &middot;
    <a href="https://github.com/dinesh-g1/featuresignals/issues">Issues</a>
  </p>
</p>

---

## Why FeatureSignals?

Existing feature flag platforms force you to choose between **unpredictable pricing** (LaunchDarkly's per-MAU model), **operational burden** (self-hosted open-source), or **vendor lock-in** (proprietary SDKs). FeatureSignals eliminates these trade-offs:

- **Transparent pricing** -- flat tiers based on seats and environments, never per-evaluation or per-MAU.
- **OpenFeature-native** -- all SDKs implement [OpenFeature](https://openfeature.dev/) providers. Switch away with zero code changes.
- **Sub-millisecond evaluation** -- SDKs cache the full ruleset locally. Flag checks read from memory, not the network.
- **Single Go binary** -- the entire API server is one statically-linked binary. No Redis, no message queues, just PostgreSQL.
- **Multi-deployment** -- run as SaaS, in your private cloud, or fully on-premises with the same codebase.

## Features

| Category | What You Get |
|----------|-------------|
| **Flag Types** | Boolean, string, number, JSON |
| **Targeting** | User attributes, segments, percentage rollouts (sticky via consistent hashing) |
| **Advanced Rules** | Prerequisite flags, mutual exclusion groups, flag scheduling, kill switch |
| **Real-Time** | SSE streaming -- SDKs receive flag changes within seconds |
| **Governance** | Approval workflows, tamper-evident audit log, per-environment RBAC |
| **Webhooks** | HMAC-signed delivery with retry to Slack, PagerDuty, or any HTTP endpoint |
| **Observability** | Evaluation metrics, flag health dashboard, stale flag detection |
| **A/B Testing** | Variant flag type with consistent assignment and metric callback API |
| **Relay Proxy** | Lightweight Go binary for edge caching and air-gapped environments |

## Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│   Dashboard  │    │   SDKs        │    │  REST Client  │
│   (Next.js)  │    │  (Go/Node/    │    │  (curl, etc)  │
│              │    │   React/Py/   │    │               │
│              │    │   Java)       │    │               │
└──────┬───────┘    └──────┬────────┘    └──────┬───────┘
       │ JWT               │ API Key            │
       ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              Go API Server (chi router)                  │
│  Auth · Rate Limiting · CORS · Structured Logging        │
├──────────────────────────┬──────────────────────────────┤
│  Management API          │  Evaluation API (hot path)    │
│  ─────────────           │  ──────────────────────────   │
│  CRUD: flags, segments,  │  POST /v1/evaluate            │
│  projects, environments, │  POST /v1/evaluate/bulk       │
│  API keys, audit log     │  GET  /v1/client/{env}/flags  │
│                          │  GET  /v1/stream/{env}  (SSE) │
├──────────────────────────┴──────────────────────────────┤
│  In-Memory Ruleset Cache (invalidated via PG NOTIFY)     │
├─────────────────────────────────────────────────────────┤
│                     PostgreSQL 16                        │
└─────────────────────────────────────────────────────────┘
```

Zero database calls on the evaluation hot path. Flags are evaluated from an in-memory cache, refreshed in real time through PostgreSQL `LISTEN/NOTIFY`.

## Quick Start

### Option 1: Docker Compose (recommended)

The fastest way to run the full stack locally -- API server, dashboard, and PostgreSQL:

```bash
git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up
```

| Service   | URL                        |
|-----------|----------------------------|
| API       | http://localhost:8080       |
| Dashboard | http://localhost:3000       |
| Postgres  | localhost:5432              |

Health check:

```bash
curl http://localhost:8080/health
```

### Option 2: Server only (Go + local Postgres)

```bash
cd server
cp .env.example .env
make dev    # Starts Postgres, runs migrations, launches server
```

See the full [Server README](server/README.md) for detailed setup, Makefile targets, and API examples.

### Seed sample data

```bash
cd server && make seed
# Creates: Acme Corp org, admin@acme.com / password123, 3 environments, 3 flags
```

## SDKs

All server-side SDKs evaluate flags locally from an in-memory cache. Zero network calls per flag check. Server SDKs implement OpenFeature providers for zero vendor lock-in.

| SDK | Type | Package | Runtime |
|-----|------|---------|---------|
| [Go](sdks/go/README.md) | Server | `github.com/featuresignals/sdks/go` | Go 1.22+ |
| [Node.js](sdks/node/README.md) | Server | `@featuresignals/node` | Node 22+ |
| [Python](sdks/python/README.md) | Server | `featuresignals` | Python 3.9+ |
| [Java](sdks/java/README.md) | Server | `com.featuresignals:sdk-java` | Java 17+ |
| [.NET/C#](sdks/dotnet/README.md) | Server | `FeatureSignals` | .NET 8.0+ |
| [Ruby](sdks/ruby/README.md) | Server | `featuresignals` | Ruby 3.1+ |
| [React](sdks/react/README.md) | Client | `@featuresignals/react` | React 18+ |
| [Vue](sdks/vue/README.md) | Client | `@featuresignals/vue` | Vue 3.3+ |

### Go (Server-Side)

```bash
go get github.com/featuresignals/sdks/go
```

```go
client := fs.NewClient("fs_srv_xxx", "production",
    fs.WithBaseURL("http://localhost:8080"),
    fs.WithSSE(true),
)
defer client.Close()
<-client.Ready()

user := fs.NewContext("user-42").WithAttribute("plan", "pro")
enabled := client.BoolVariation("new-checkout", user, false)
```

[Go SDK Documentation](sdks/go/README.md)

### Node.js / TypeScript (Server-Side)

```bash
npm install @featuresignals/node
```

```typescript
import { init } from "@featuresignals/node";

const client = init("fs_srv_xxx", {
  envKey: "production",
  baseURL: "http://localhost:8080",
  streaming: true,
});
await client.waitForReady();

const enabled = client.boolVariation("new-checkout", { key: "user-42" }, false);
```

[Node SDK Documentation](sdks/node/README.md)

### React (Client-Side)

```bash
npm install @featuresignals/react
```

```tsx
import { FeatureSignalsProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FeatureSignalsProvider sdkKey="fs_cli_xxx" envKey="production">
      <MyComponent />
    </FeatureSignalsProvider>
  );
}

function MyComponent() {
  const showCheckout = useFlag("new-checkout", false);
  return showCheckout ? <NewCheckout /> : <OldCheckout />;
}
```

[React SDK Documentation](sdks/react/README.md)

### Python (Server-Side)

```bash
pip install featuresignals
```

```python
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient("fs_srv_xxx", ClientOptions(env_key="production"))
client.wait_for_ready()

user = EvalContext(key="user-42", attributes={"plan": "pro"})
enabled = client.bool_variation("new-checkout", user, False)
```

[Python SDK Documentation](sdks/python/README.md)

### Java (Server-Side)

```xml
<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0</version>
</dependency>
```

```java
var options = new ClientOptions("production")
    .baseURL("http://localhost:8080");
var client = new FeatureSignalsClient("fs_srv_xxx", options);
client.waitForReady(5000);

var user = new EvalContext("user-42").withAttribute("plan", "pro");
boolean enabled = client.boolVariation("new-checkout", user, false);
```

[Java SDK Documentation](sdks/java/README.md)

### .NET / C# (Server-Side)

```bash
dotnet add package FeatureSignals
```

```csharp
using FeatureSignals;

var options = new ClientOptions { EnvKey = "production" };
using var client = new FeatureSignalsClient("fs_srv_xxx", options);
await client.WaitForReadyAsync();

var user = new EvalContext("user-42").WithAttribute("plan", "pro");
bool enabled = client.BoolVariation("new-checkout", user, false);
```

[.NET SDK Documentation](sdks/dotnet/README.md)

### Ruby (Server-Side)

```bash
gem install featuresignals
```

```ruby
require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "production")
client = FeatureSignals::Client.new("fs_srv_xxx", options)
client.wait_for_ready

user = FeatureSignals::EvalContext.new(key: "user-42", attributes: { "plan" => "pro" })
enabled = client.bool_variation("new-checkout", user, false)
```

[Ruby SDK Documentation](sdks/ruby/README.md)

### Vue.js (Client-Side)

```bash
npm install @featuresignals/vue
```

```typescript
// main.ts
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";
import App from "./App.vue";

createApp(App)
  .use(FeatureSignalsPlugin, { sdkKey: "fs_cli_xxx", envKey: "production" })
  .mount("#app");
```

```vue
<script setup>
import { useFlag } from "@featuresignals/vue";
const showCheckout = useFlag("new-checkout", false);
</script>

<template>
  <NewCheckout v-if="showCheckout" />
  <OldCheckout v-else />
</template>
```

[Vue SDK Documentation](sdks/vue/README.md)

## Project Structure

```
featuresignals/
├── server/                  # Go API server, relay proxy, stale flag scanner
│   ├── cmd/
│   │   ├── server/          # Main API server binary
│   │   ├── relay/           # Relay proxy binary
│   │   └── stalescan/       # Stale flag code scanner
│   ├── internal/            # Core packages (api, auth, eval, store, sse, ...)
│   ├── migrations/          # PostgreSQL migrations (golang-migrate)
│   └── Makefile
├── dashboard/               # Next.js admin UI
├── website/                 # Astro marketing site (featuresignals.com)
├── docs/                    # Docusaurus documentation (docs.featuresignals.com)
├── sdks/
│   ├── go/                  # Go SDK
│   ├── node/                # Node.js/TypeScript SDK
│   ├── python/              # Python SDK
│   ├── java/                # Java SDK
│   ├── dotnet/              # .NET/C# SDK
│   ├── ruby/                # Ruby SDK
│   ├── react/               # React SDK (hooks)
│   └── vue/                 # Vue SDK (composables)
├── deploy/                  # Dockerfiles, Caddyfile, Helm chart, Terraform, scripts
│   ├── docker/              # Dockerfile.server, .dashboard, .website, .docs, .relay
│   ├── helm/                # Kubernetes Helm chart
│   └── terraform/           # AWS Terraform modules
├── docker-compose.yml       # Local development stack
├── docker-compose.prod.yml  # Production stack with Caddy
└── .github/workflows/       # CI/CD pipelines
```

## Additional Tools

### Relay Proxy

A lightweight Go binary that caches flag rulesets locally, reducing latency and API load. Ideal for on-premises or air-gapped deployments.

```bash
# Build
cd server && go build -o bin/relay ./cmd/relay

# Run
./bin/relay \
  -api-key fs_srv_xxx \
  -env-key production \
  -upstream https://api.featuresignals.com \
  -port 8090
```

Point your SDKs at the relay instead of the central API. The relay serves `GET /v1/client/{envKey}/flags` and stays in sync via SSE or polling.

### Stale Flag Scanner

Scans your codebase for flag key references and reports which flags have no code references (stale). Supports Go, TypeScript, Python, Java, and 10+ other languages.

```bash
# Build
cd server && go build -o bin/stalescan ./cmd/stalescan

# Run
./bin/stalescan \
  -token <jwt> \
  -project <project-id> \
  -dir /path/to/your/codebase \
  -ci   # Exit 1 if stale flags found (for CI pipelines)
```

## Deployment

### Local Development

```bash
docker compose up
```

### Production (Single VPS)

The production stack runs behind Caddy with automatic HTTPS:

```bash
docker compose -f docker-compose.prod.yml up -d
```

See the [Deployment Guide](deploy/README.md) for full production setup, including DNS configuration, environment variables, CI/CD pipeline, and backup strategy.

### On-Premises / Self-Hosted

FeatureSignals runs as a single Docker Compose stack or Kubernetes Helm chart:

1. **Docker Compose** -- `docker compose up` with your own PostgreSQL
2. **Helm Chart** -- `helm install featuresignals deploy/helm/featuresignals/`
3. **Single Binary** -- download the Go binary and point it at a PostgreSQL connection string

Requirements: PostgreSQL 16+, 1 CPU / 512MB RAM minimum.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| API Server | Go 1.25, chi router, pgx |
| Database | PostgreSQL 16 |
| Cache Invalidation | PostgreSQL LISTEN/NOTIFY |
| Streaming | Server-Sent Events (SSE) |
| Dashboard | Next.js 16, React 19, Tailwind 4, Radix UI |
| Marketing Site | Astro |
| Documentation | Docusaurus |
| Reverse Proxy | Caddy (auto-HTTPS) |
| CI/CD | GitHub Actions |
| Containerization | Docker Compose |

## API Overview

### Authentication

```bash
# Register
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"securepass123","name":"Dev","org_name":"My Org"}'

# Login
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"securepass123"}'
```

### Flag Evaluation

```bash
# Single flag
curl -X POST http://localhost:8080/v1/evaluate \
  -H "X-API-Key: fs_srv_xxx" \
  -H "Content-Type: application/json" \
  -d '{"flag_key":"new-checkout","context":{"key":"user-42","attributes":{"plan":"pro"}}}'

# All flags for a context
curl http://localhost:8080/v1/client/production/flags?key=user-42 \
  -H "X-API-Key: fs_srv_xxx"

# Real-time streaming
curl -N "http://localhost:8080/v1/stream/production?api_key=fs_srv_xxx"
```

See the [Server README](server/README.md) for complete API examples including flag CRUD, targeting rules, segments, and bulk evaluation.

## Contributing

We welcome contributions. Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run the full stack locally: `docker compose up`
4. Run server tests: `cd server && make test`
5. Submit a pull request

Please ensure all tests pass and new code follows the existing patterns (interface-driven design, structured logging, etc.).

## License

FeatureSignals is open source under the [Apache License 2.0](LICENSE).

```
Copyright 2026 G Dinesh Reddy / FeatureSignals
```
