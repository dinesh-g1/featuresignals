---
sidebar_position: 1
title: SDK Overview
---

# SDK Overview

FeatureSignals provides official SDKs for server-side and client-side applications. All SDKs follow a consistent pattern and support [OpenFeature](https://openfeature.dev/) for vendor-neutral integration.

## Available SDKs

| SDK | Language | Type | Package |
|-----|----------|------|---------|
| [Go](/sdks/go) | Go 1.22+ | Server | `github.com/featuresignals/sdk-go` |
| [Node.js](/sdks/nodejs) | TypeScript/Node 22+ | Server | `@featuresignals/node` |
| [Python](/sdks/python) | Python 3.9+ | Server | `featuresignals` |
| [Java](/sdks/java) | Java 17+ | Server | `com.featuresignals:sdk-java` |
| [React](/sdks/react) | React 18+ | Client | `@featuresignals/react` |

## SDK Architecture

All SDKs follow the same core design:

```
┌──────────┐    HTTP/SSE     ┌──────────────┐
│   SDK     │ ──────────────▶│  API Server   │
│           │                │  or Relay     │
│ ┌──────┐  │  initial load  └──────────────┘
│ │Cache │  │
│ └──────┘  │  polling/SSE
│           │  (background)
└──────────┘
```

1. **Initialize** with API key and environment key
2. **First load**: Fetches all flag values via `GET /v1/client/{envKey}/flags`
3. **Background sync**: Polls at regular intervals or streams via SSE
4. **Local evaluation**: Variation methods read from the in-memory cache (no network call)
5. **Graceful degradation**: Returns fallback values on errors or before ready

## Common Patterns

### Initialization

All SDKs accept:

| Option | Default | Description |
|--------|---------|-------------|
| `sdkKey` / `sdk_key` | (required) | API key for authentication |
| `envKey` / `env_key` | (required) | Environment slug |
| `baseURL` / `base_url` | `https://api.featuresignals.com` | API server URL |
| `pollingInterval` | 30 seconds | How often to refresh flags |
| `streaming` | `false` | Use SSE instead of polling |

### Variation Methods

All SDKs provide typed variation methods:

| Method | Returns | SDK Suffix |
|--------|---------|------------|
| Boolean | `true`/`false` | `BoolVariation` / `boolVariation` / `bool_variation` |
| String | Text value | `StringVariation` / `stringVariation` / `string_variation` |
| Number | Numeric value | `NumberVariation` / `numberVariation` / `number_variation` |
| JSON | Object/map | `JSONVariation` / `jsonVariation` / `json_variation` |

Each takes three arguments:
1. **Flag key** — the flag's unique identifier
2. **Evaluation context** — user identity and attributes
3. **Fallback value** — returned if the flag doesn't exist or there's an error

### Readiness

SDKs emit a "ready" event after the first successful flag load:

```typescript
// Node.js
await client.waitForReady();

// Go
<-client.Ready()

// Python
client.wait_for_ready()

// Java
client.waitForReady(5000);
```

### Lifecycle

Always close the client when shutting down:

```typescript
client.close(); // Node.js, Go, Java
client.close()  // Python
```

## OpenFeature Support

All server SDKs include an [OpenFeature](https://openfeature.dev/) provider for vendor-neutral flag consumption. See the [OpenFeature guide](/sdks/openfeature) for details.
