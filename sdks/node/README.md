# FeatureSignals Node.js SDK

Official Node.js/TypeScript SDK for [FeatureSignals](https://featuresignals.com) -- server-side feature flag evaluation with real-time updates.

## Installation

```bash
npm install @featuresignals/node
```

Requires Node.js 22+. Zero external dependencies.

## Quick Start

```typescript
import { init } from "@featuresignals/node";

const client = init("fs_srv_xxx", {
  envKey: "production",
  baseURL: "http://localhost:8080",
  streaming: true,
});

await client.waitForReady();

const user = { key: "user-42", attributes: { plan: "pro", country: "US" } };
const enabled = client.boolVariation("new-checkout", user, false);
console.log("New checkout:", enabled);

// When shutting down
client.close();
```

## Features

- **Local evaluation** -- all flag reads are in-memory, zero network calls per check
- **Real-time updates** -- SSE streaming for instant flag changes with automatic reconnection
- **Polling fallback** -- configurable interval when SSE is not enabled
- **Type-safe API** -- `boolVariation`, `stringVariation`, `numberVariation`, `jsonVariation`
- **OpenFeature provider** -- use via the OpenFeature SDK for zero vendor lock-in
- **Event emitter** -- `ready`, `error`, `update` events for observability
- **Graceful degradation** -- falls back to cached flags, then to SDK defaults

## OpenFeature Usage

FeatureSignals integrates with the [OpenFeature](https://openfeature.dev) standard. Install the OpenFeature SDK for Node.js and register the FeatureSignals provider:

```ts
import { FeatureSignalsClient } from "@featuresignals/node";
import { FeatureSignalsProvider } from "@featuresignals/node";
import { OpenFeature } from "@openfeature/server-sdk"; // npm install @openfeature/server-sdk

const fsClient = new FeatureSignalsClient("fs_srv_...", { envKey: "production" });
await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));
const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue("dark-mode", false);
```

## API Reference

### Initialization

```typescript
import { init, FeatureSignalsClient } from "@featuresignals/node";

// Factory function (recommended)
const client = init("fs_srv_xxx", { envKey: "production" });

// Or construct directly
const client = new FeatureSignalsClient("fs_srv_xxx", { envKey: "production" });
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `envKey` | `string` | **required** | Environment slug (e.g. `"production"`) |
| `baseURL` | `string` | `https://api.featuresignals.com` | API server URL |
| `pollingIntervalMs` | `number` | `30000` | Polling frequency in milliseconds |
| `streaming` | `boolean` | `false` | Enable SSE for real-time updates |
| `sseRetryMs` | `number` | `5000` | SSE reconnection delay |
| `timeoutMs` | `number` | `10000` | HTTP request timeout |
| `context` | `EvalContext` | `{ key: "server" }` | Default evaluation context |

### Variation Methods

Each method returns the flag value if it exists and matches the type, otherwise returns the fallback.

```typescript
const enabled = client.boolVariation("feature-key", ctx, false);
const text = client.stringVariation("banner-text", ctx, "Welcome!");
const limit = client.numberVariation("rate-limit", ctx, 100);
const config = client.jsonVariation("theme", ctx, { mode: "light" });
```

### Evaluation Context

```typescript
import type { EvalContext } from "@featuresignals/node";

const user: EvalContext = {
  key: "user-42",
  attributes: {
    plan: "enterprise",
    country: "US",
    beta: true,
  },
};
```

### Lifecycle

```typescript
// Wait for initial flags to load
await client.waitForReady();     // throws after 10s timeout
await client.waitForReady(5000); // custom timeout

// Check readiness synchronously
if (client.isReady()) { /* ... */ }

// Get all flags
const flags = client.allFlags();

// Force a refresh (useful in tests)
await client.refresh();

// Shut down (stops polling/SSE)
client.close();
```

### Events

The client extends `EventEmitter`:

```typescript
client.on("ready", () => console.log("Flags loaded"));
client.on("error", (err: Error) => console.error("Flag error:", err));
client.on("update", (flags: Record<string, unknown>) => console.log("Flags updated"));
```

### OpenFeature Provider

```typescript
import { FeatureSignalsClient, FeatureSignalsProvider } from "@featuresignals/node";

const client = new FeatureSignalsClient("fs_srv_xxx", { envKey: "production" });
const provider = new FeatureSignalsProvider(client);

// Use with the OpenFeature SDK
const result = provider.resolveBooleanEvaluation("new-checkout", false);
console.log(result.value, result.reason);
```

## Usage Patterns

### Express Middleware

```typescript
import express from "express";
import { init } from "@featuresignals/node";

const flags = init("fs_srv_xxx", {
  envKey: "production",
  streaming: true,
});

const app = express();

app.use((req, res, next) => {
  const ctx = { key: req.userId, attributes: { role: req.userRole } };
  if (flags.boolVariation("maintenance-mode", ctx, false)) {
    return res.status(503).json({ error: "Under maintenance" });
  }
  next();
});
```

### Testing

```typescript
import { describe, it, before, after } from "node:test";
import http from "node:http";
import { init } from "@featuresignals/node";

describe("feature flags", () => {
  let server: http.Server;
  let client: ReturnType<typeof init>;

  before(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ "dark-mode": true, "banner": "Test" }));
    }).listen(0);
    const port = (server.address() as any).port;

    client = init("test-key", {
      envKey: "test",
      baseURL: `http://localhost:${port}`,
      pollingIntervalMs: 60_000,
    });
    await client.waitForReady();
  });

  after(() => {
    client.close();
    server.close();
  });

  it("evaluates boolean flag", () => {
    assert.strictEqual(client.boolVariation("dark-mode", { key: "u1" }, false), true);
  });
});
```

## Thread Safety

- All variation methods are safe for concurrent use
- `close()` is idempotent

## License

Apache-2.0
