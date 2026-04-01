# FeatureSignals Go SDK

Official Go SDK for [FeatureSignals](https://featuresignals.com) — feature flag management with real-time updates.

## Installation

```bash
go get github.com/featuresignals/sdks/go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log/slog"
    "os"

    fs "github.com/featuresignals/sdks/go"
)

func main() {
    // Create a client with your API key and environment slug.
    // The client fetches all flags on startup, then keeps them
    // updated in the background.
    client := fs.NewClient(
        os.Getenv("FEATURESIGNALS_API_KEY"), // e.g. "fs_srv_abc123..."
        "production",                         // environment slug
        fs.WithBaseURL("http://localhost:8080"),
        fs.WithSSE(true),                     // real-time updates via SSE
        fs.WithLogger(slog.Default()),
    )
    defer client.Close()

    // Wait for initial flag fetch (optional)
    <-client.Ready()

    // Create user context for evaluation
    user := fs.NewContext("user-42").
        WithAttribute("plan", "pro").
        WithAttribute("country", "US")

    // Evaluate flags with type-safe methods
    darkMode := client.BoolVariation("dark-mode", user, false)
    fmt.Println("Dark mode:", darkMode)

    bannerText := client.StringVariation("banner-text", user, "Welcome!")
    fmt.Println("Banner:", bannerText)
}
```

## Features

- **Local evaluation** — all flag reads are in-memory, zero network calls per evaluation
- **Real-time updates** — SSE streaming for instant flag changes, with automatic reconnection
- **Polling fallback** — configurable polling interval when SSE is not enabled
- **Type-safe API** — `BoolVariation`, `StringVariation`, `NumberVariation`, `JSONVariation`
- **Graceful shutdown** — `Close()` stops all background goroutines cleanly
- **Callbacks** — `OnReady`, `OnError`, `OnUpdate` for observability
- **Immutable context** — `WithAttribute` returns a copy, safe for concurrent use

## API Reference

### Client Creation

```go
func NewClient(sdkKey, envKey string, opts ...Option) *Client
```

Creates and initialises a client. Performs an initial flag fetch synchronously, then starts background updates (polling or SSE).

**Parameters:**
- `sdkKey` — your environment API key (starts with `fs_srv_` or `fs_cli_`)
- `envKey` — the environment slug (e.g. `"production"`, `"staging"`)
- `opts` — optional configuration (see below)

### Options

```go
fs.WithBaseURL("http://localhost:8080")    // Override API URL (default: https://api.featuresignals.com)
fs.WithPollingInterval(15 * time.Second)   // Polling frequency (default: 30s)
fs.WithSSE(true)                           // Enable SSE streaming (default: false)
fs.WithSSERetryInterval(3 * time.Second)   // SSE reconnect delay (default: 5s)
fs.WithLogger(logger)                      // Structured logger (default: slog.Default())
fs.WithHTTPClient(httpClient)              // Custom HTTP client
fs.WithContext(userCtx)                    // Default user context for flag fetching
fs.WithOnReady(func() { ... })            // Called when initial flags are loaded
fs.WithOnError(func(err error) { ... })   // Called on fetch/stream errors
fs.WithOnUpdate(func(flags map[string]interface{}) { ... })  // Called on every flag update
```

### Variation Methods

Each method returns the flag's value if it exists and matches the expected type, otherwise returns the fallback.

```go
// Boolean
enabled := client.BoolVariation("feature-key", userCtx, false)

// String
value := client.StringVariation("banner-text", userCtx, "default")

// Number
limit := client.NumberVariation("rate-limit", userCtx, 100.0)

// Any JSON type
config := client.JSONVariation("config", userCtx, map[string]interface{}{"v": 1})
```

### EvalContext

User context is immutable — `WithAttribute` returns a new copy.

```go
// Create a base context
baseCtx := fs.NewContext("user-42")

// Add attributes (returns new context, original is unchanged)
richCtx := baseCtx.
    WithAttribute("plan", "enterprise").
    WithAttribute("country", "US").
    WithAttribute("beta", true)
```

### Lifecycle

```go
// Check if initial flags have loaded
if client.IsReady() { ... }

// Block until ready (with timeout)
select {
case <-client.Ready():
    fmt.Println("flags loaded!")
case <-time.After(5 * time.Second):
    fmt.Println("timeout waiting for flags")
}

// Get all flags as a map
allFlags := client.AllFlags()

// Shut down background updates
client.Close()
```

## Configuration Patterns

### Web server (SSE for real-time)

```go
client := fs.NewClient(apiKey, "production",
    fs.WithBaseURL("http://localhost:8080"),
    fs.WithSSE(true),
    fs.WithOnError(func(err error) {
        slog.Error("flag update failed", "error", err)
    }),
)
defer client.Close()

http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    user := fs.NewContext(getUserID(r))
    if client.BoolVariation("maintenance-mode", user, false) {
        http.Error(w, "Under maintenance", 503)
        return
    }
    // ...
})
```

### Background worker (polling)

```go
client := fs.NewClient(apiKey, "production",
    fs.WithBaseURL("http://localhost:8080"),
    fs.WithPollingInterval(60 * time.Second),
)
defer client.Close()
<-client.Ready()

for job := range jobs {
    ctx := fs.NewContext(job.UserID)
    if client.BoolVariation("new-algorithm", ctx, false) {
        processV2(job)
    } else {
        processV1(job)
    }
}
```

### Testing

```go
func TestFeature(t *testing.T) {
    // Start a mock server
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(map[string]interface{}{
            "dark-mode": true,
            "banner":    "Test banner",
        })
    }))
    defer srv.Close()

    client := fs.NewClient("test-key", "test",
        fs.WithBaseURL(srv.URL),
        fs.WithPollingInterval(time.Hour), // disable active polling
    )
    defer client.Close()
    <-client.Ready()

    if !client.BoolVariation("dark-mode", fs.NewContext("u1"), false) {
        t.Error("expected dark-mode to be true")
    }
}
```

## Thread Safety

- All flag reads (`BoolVariation`, `AllFlags`, etc.) are thread-safe
- `EvalContext.WithAttribute()` returns a new copy — safe to share across goroutines
- `Close()` is idempotent — safe to call multiple times
