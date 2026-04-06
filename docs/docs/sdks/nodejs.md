---
sidebar_position: 3
title: Node.js SDK
---

# Node.js SDK

The Node.js SDK provides a TypeScript-first client for evaluating feature flags in Node.js applications.

## Installation

```bash
npm install @featuresignals/node
```

**Requirements**: Node.js 22+, ESM

## Quick Start

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_your_api_key', {
  envKey: 'production',
  baseURL: 'https://api.featuresignals.com', // For self-hosted, use your own API URL
});

await client.waitForReady();

const enabled = client.boolVariation('new-feature', { key: 'user-123' }, false);
console.log('Feature enabled:', enabled);

// When shutting down
client.close();
```

### Using the `init` Helper

```typescript
import FeatureSignals from '@featuresignals/node';

const client = FeatureSignals.init('fs_srv_your_api_key', {
  envKey: 'production',
});
```

## Configuration

```typescript
const client = new FeatureSignalsClient('fs_srv_your_api_key', {
  envKey: 'production',              // Required: environment slug
  baseURL: 'https://api.featuresignals.com', // API server URL; for self-hosted, use your own API URL
  pollingIntervalMs: 30000,          // Polling interval in ms
  streaming: false,                  // Use SSE instead of polling
  sseRetryMs: 5000,                 // SSE reconnect interval
  timeoutMs: 10000,                 // HTTP request timeout
  context: { key: 'server' },       // Default evaluation context
});
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `envKey` | `string` | (required) | Environment slug |
| `baseURL` | `string` | `https://api.featuresignals.com` | API server URL |
| `pollingIntervalMs` | `number` | `30000` | Refresh interval (ms) |
| `streaming` | `boolean` | `false` | Enable SSE streaming |
| `sseRetryMs` | `number` | `5000` | SSE reconnect delay (ms) |
| `timeoutMs` | `number` | `10000` | HTTP timeout (ms) |
| `context` | `EvalContext` | `{ key: "server" }` | Default context for flag fetch |

## Evaluation Context

```typescript
import { EvalContext } from '@featuresignals/node';

const ctx: EvalContext = {
  key: 'user-123',
  attributes: {
    country: 'US',
    plan: 'enterprise',
    beta: 'true',
  },
};
```

## Variation Methods

```typescript
// Boolean
const enabled = client.boolVariation('flag-key', ctx, false);

// String
const theme = client.stringVariation('theme', ctx, 'light');

// Number
const limit = client.numberVariation('rate-limit', ctx, 100);

// JSON (generic)
const config = client.jsonVariation<MyConfig>('feature-config', ctx, defaultConfig);
```

## Events

The client extends `EventEmitter` and emits:

```typescript
client.on('ready', () => {
  console.log('Flags loaded');
});

client.on('error', (err: Error) => {
  console.error('Flag fetch failed:', err);
});

client.on('update', (flags: Record<string, unknown>) => {
  console.log('Flags updated:', Object.keys(flags).length);
});
```

## Readiness

```typescript
// Promise-based (with timeout)
await client.waitForReady(10000); // 10s timeout, rejects if not ready

// Synchronous check
if (client.isReady()) {
  // flags are loaded
}
```

## Getting All Flags

```typescript
const allFlags = client.allFlags(); // Record<string, unknown>
```

## Streaming

Enable SSE for real-time flag updates:

```typescript
const client = new FeatureSignalsClient('key', {
  envKey: 'production',
  streaming: true,
});
```

## Shutdown

```typescript
client.close();
```

Stops polling/SSE and cleans up resources.

## OpenFeature

This SDK includes a built-in OpenFeature provider. See the [OpenFeature Integration](./openfeature.md) page for details. Install `@openfeature/server-sdk` and register `new FeatureSignalsProvider(client)` with `OpenFeature.setProviderAndWait()`.
