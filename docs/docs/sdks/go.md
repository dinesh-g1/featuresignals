---
sidebar_position: 2
title: Go SDK
---

# Go SDK

The Go SDK provides a thread-safe client for evaluating feature flags in Go applications.

## Installation

```bash
go get github.com/featuresignals/sdk-go
```

**Requirements**: Go 1.22+

## Quick Start

```go
package main

import (
    "fmt"
    fs "github.com/featuresignals/sdk-go"
)

func main() {
    client := fs.NewClient("fs_srv_your_api_key", "production",
        fs.WithBaseURL("https://api.featuresignals.com"), // For self-hosted, use your own API URL
    )
    defer client.Close()

    // Wait for initial flag load
    <-client.Ready()

    ctx := fs.NewContext("user-123").
        WithAttribute("country", "US").
        WithAttribute("plan", "enterprise")

    enabled := client.BoolVariation("new-feature", ctx, false)
    fmt.Println("Feature enabled:", enabled)
}
```

## Configuration

```go
client := fs.NewClient(sdkKey, envKey,
    fs.WithBaseURL("https://api.featuresignals.com"), // API server URL; for self-hosted, use your own API URL
    fs.WithPollingInterval(30 * time.Second),      // Polling interval
    fs.WithSSE(true),                              // Enable SSE streaming
    fs.WithSSERetryInterval(5 * time.Second),      // SSE reconnect interval
    fs.WithHTTPClient(customHTTPClient),           // Custom HTTP client
    fs.WithLogger(slog.Default()),                 // Custom logger
    fs.WithContext(fs.NewContext("server")),        // Default eval context
    fs.WithOnReady(func() { /* ... */ }),           // Ready callback
    fs.WithOnError(func(err error) { /* ... */ }), // Error callback
    fs.WithOnUpdate(func(flags map[string]interface{}) { /* ... */ }), // Update callback
)
```

### Options Reference

| Option | Default | Description |
|--------|---------|-------------|
| `WithBaseURL` | `https://api.featuresignals.com` | API server URL |
| `WithPollingInterval` | `30s` | Flag refresh interval |
| `WithSSE` | `false` | Use Server-Sent Events instead of polling |
| `WithSSERetryInterval` | `5s` | Delay between SSE reconnection attempts |
| `WithHTTPClient` | 10s timeout | Custom `*http.Client` |
| `WithLogger` | `slog.Default()` | Structured logger |
| `WithContext` | `NewContext("server")` | Default user context for flag fetching |
| `WithOnReady` | nil | Called once when first flag load succeeds |
| `WithOnError` | nil | Called on fetch/parse errors |
| `WithOnUpdate` | nil | Called after each flag refresh with the full flag map |

## Evaluation Context

```go
// Create a context with just a key
ctx := fs.NewContext("user-123")

// Add attributes for targeting
ctx = ctx.WithAttribute("country", "US")
ctx = ctx.WithAttribute("plan", "enterprise")
ctx = ctx.WithAttribute("age", 30)
```

The `key` field is required and used for:
- Percentage rollout bucketing
- A/B variant assignment
- Mutual exclusion group resolution

## Variation Methods

```go
// Boolean
enabled := client.BoolVariation("flag-key", ctx, false)

// String
theme := client.StringVariation("theme", ctx, "light")

// Number (returns float64)
limit := client.NumberVariation("rate-limit", ctx, 100.0)

// JSON (returns interface{})
config := client.JSONVariation("feature-config", ctx, map[string]interface{}{})
```

Each method returns the **fallback value** if:
- The flag doesn't exist
- The flag's value type doesn't match
- The client isn't ready yet

## Getting All Flags

```go
allFlags := client.AllFlags() // Returns map[string]interface{}
```

## Readiness

```go
// Channel-based (blocking)
<-client.Ready()

// Non-blocking check
if client.IsReady() {
    // flags are loaded
}
```

## Streaming vs Polling

**Polling** (default): Fetches flags every `pollingInterval`. Simple and reliable.

**SSE**: Receives real-time push notifications when flags change. Lower latency but requires a persistent connection.

```go
// Enable SSE
client := fs.NewClient(key, env, fs.WithSSE(true))
```

With SSE, the client still does a full refresh when notified — the SSE event triggers a fetch, not a direct update.

## Shutdown

```go
client.Close()
// or
defer client.Close()
```

Cancels background polling/SSE goroutines.

## OpenFeature Integration

See [OpenFeature](/sdks/openfeature) for using the Go SDK with OpenFeature.
