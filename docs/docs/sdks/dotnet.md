---
sidebar_position: 6
title: .NET SDK
---

# .NET SDK

The .NET SDK provides a thread-safe client for evaluating feature flags in C# and .NET applications.

## Installation

```bash
dotnet add package FeatureSignals
```

**Requirements**: .NET 8.0+

## Quick Start

```csharp
using FeatureSignals;

var options = new ClientOptions { EnvKey = "production" };
using var client = new FeatureSignalsClient("fs_srv_your_api_key", options);
await client.WaitForReadyAsync();

var user = new EvalContext("user-123")
    .WithAttribute("plan", "pro");

bool enabled = client.BoolVariation("new-feature", user, false);
Console.WriteLine($"Feature enabled: {enabled}");
```

## Configuration

```csharp
var options = new ClientOptions
{
    EnvKey = "production",
    BaseUrl = "http://localhost:8080",
    PollingInterval = TimeSpan.FromSeconds(15),
    Streaming = true,
    SseRetry = TimeSpan.FromSeconds(3),
    Timeout = TimeSpan.FromSeconds(10),
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `EnvKey` | `string` | (required) | Environment slug |
| `BaseUrl` | `string` | `https://api.featuresignals.com` | API server URL |
| `PollingInterval` | `TimeSpan` | 30 seconds | Polling frequency |
| `Streaming` | `bool` | `false` | Enable SSE streaming |
| `SseRetry` | `TimeSpan` | 5 seconds | SSE reconnect delay |
| `Timeout` | `TimeSpan` | 10 seconds | HTTP timeout |

## Variation Methods

```csharp
bool enabled = client.BoolVariation("flag-key", ctx, false);
string value = client.StringVariation("banner-text", ctx, "default");
double limit = client.NumberVariation("rate-limit", ctx, 100.0);
T config = client.JsonVariation<T>("config", ctx, defaultConfig);
```

## Evaluation Context

```csharp
var user = new EvalContext("user-42")
    .WithAttribute("plan", "enterprise")
    .WithAttribute("country", "US")
    .WithAttribute("beta", true);
```

`EvalContext` is immutable — `WithAttribute` returns a new copy.

## Lifecycle

```csharp
// Wait for initial flags
await client.WaitForReadyAsync();
// or with cancellation
await client.WaitForReadyAsync(cts.Token);

// Check readiness
if (client.IsReady) { /* ... */ }

// Get all flags
var flags = client.AllFlags();

// Shutdown
client.Dispose();
```

## Events

```csharp
var client = new FeatureSignalsClient("key", options);
client.OnReady = () => Console.WriteLine("Flags loaded");
client.OnError = (err) => Console.Error.WriteLine($"Error: {err}");
client.OnUpdate = (flags) => Console.WriteLine($"Updated: {flags.Count} flags");
```

## ASP.NET Core Integration

Register as a singleton service:

```csharp
builder.Services.AddSingleton<FeatureSignalsClient>(sp =>
{
    var options = new ClientOptions
    {
        EnvKey = "production",
        BaseUrl = builder.Configuration["FeatureSignals:BaseUrl"]!,
        Streaming = true,
    };
    var client = new FeatureSignalsClient(
        builder.Configuration["FeatureSignals:ApiKey"]!, options);
    return client;
});
```

Use in a controller or middleware:

```csharp
app.MapGet("/checkout", (FeatureSignalsClient flags, HttpContext ctx) =>
{
    var user = new EvalContext(ctx.User.FindFirst("sub")?.Value ?? "anonymous");
    if (flags.BoolVariation("new-checkout", user, false))
        return Results.Ok(new { flow = "v2" });
    return Results.Ok(new { flow = "v1" });
});
```

## OpenFeature

```csharp
using FeatureSignals.OpenFeature;

var provider = new FeatureSignalsProvider(client);
var result = provider.ResolveBooleanEvaluation("new-feature", false);
Console.WriteLine($"{result.Value} ({result.Reason})");
```

## Thread Safety

- All variation methods are thread-safe (backed by `ReaderWriterLockSlim`)
- `EvalContext.WithAttribute()` returns a new instance
- `Dispose()` is idempotent
