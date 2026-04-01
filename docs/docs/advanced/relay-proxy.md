---
sidebar_position: 1
title: Relay Proxy
---

# Relay Proxy

The relay proxy is a lightweight Go binary that caches flag values from the central FeatureSignals API and serves them locally. It reduces latency, provides fault tolerance, and minimizes upstream API load.

## Use Cases

- **Edge deployment**: Run the proxy close to your application for sub-millisecond flag reads
- **On-premises**: Serve flags within your private network
- **High availability**: Cached flags survive brief upstream outages
- **Reduce API load**: Hundreds of SDK instances connect to the proxy instead of the central API

## Architecture

```
┌──────────┐    SSE/Poll     ┌──────────────┐    HTTP      ┌──────────────┐
│   SDKs    │ ──────────────▶│  Relay Proxy  │ ──────────▶│  FS API      │
│           │                │  (port 8090)  │             │  (central)   │
└──────────┘                └──────────────┘             └──────────────┘
```

The relay proxy:
1. Connects to the upstream FeatureSignals API
2. Fetches the flag map for a single environment
3. Keeps it updated via SSE (default) or polling
4. Serves the same `/v1/client/{envKey}/flags` endpoint to local SDKs

## Running the Relay Proxy

### Docker

```bash
docker run -d \
  -p 8090:8090 \
  -e FS_API_KEY="fs_srv_your_key" \
  -e FS_ENV_KEY="production" \
  -e FS_UPSTREAM="http://your-server:8080" \
  featuresignals-relay
```

### Binary

```bash
cd server
go build -o relay-proxy ./cmd/relay

./relay-proxy \
  -api-key "fs_srv_your_key" \
  -env-key "production" \
  -upstream "http://your-server:8080" \
  -port 8090
```

## Configuration

| Flag / Env Var | Default | Description |
|----------------|---------|-------------|
| `-api-key` / `FS_API_KEY` | (required) | Server API key |
| `-env-key` / `FS_ENV_KEY` | (required) | Environment slug |
| `-upstream` / `FS_UPSTREAM` | `https://api.featuresignals.com` | Upstream API URL |
| `-port` / `FS_PORT` | `8090` | Local listening port |
| `-poll` / `FS_POLL` | `30s` | Polling interval |
| `-sse` / `FS_SSE` | `true` | Use SSE (false = polling only) |

## Endpoints

### Flag Values

```
GET /v1/client/{envKey}/flags
```

Returns the cached flag map (same format as the upstream API).

### Health Check

```
GET /health
```

Response when ready:
```json
{"status": "ok", "flags": 42}
```

Response when not ready (initial sync pending):
```json
{"status": "not_ready", "flags": 0}
```

Returns `503` when not ready, `200` when healthy.

## Connecting SDKs

Point your SDKs at the relay proxy instead of the central API:

```typescript
const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'http://relay-proxy:8090', // ← proxy URL
});
```

## Sync Modes

### SSE (Default)

The proxy maintains a persistent SSE connection to the upstream. When flags change, it immediately fetches the latest values. This provides near-instant propagation.

### Polling

If SSE is disabled (`-sse=false`), the proxy polls the upstream at the configured interval. Simpler but introduces latency up to the poll interval.

## Key Properties

- **Stateless**: No database required. All state is in-memory.
- **Single environment**: Each proxy instance serves one environment. Run multiple instances for multiple environments.
- **Transparent**: SDKs don't know they're talking to a proxy — the API surface is identical.
- **Fault tolerant**: If the upstream is briefly unreachable, the proxy serves cached data.
