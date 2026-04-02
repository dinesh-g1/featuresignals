# FeatureSignals .NET SDK

Server-side .NET SDK for [FeatureSignals](https://featuresignals.com) feature flag management.

Fetches flag values from the FeatureSignals API, caches locally, and keeps them
up-to-date via polling or SSE streaming. All flag evaluations are local — zero
network calls after initialization.

## Installation

```bash
dotnet add package FeatureSignals
```

Or add to your `.csproj`:

```xml
<PackageReference Include="FeatureSignals" Version="0.1.0" />
```

## Quick Start

```csharp
using FeatureSignals;

var client = new FeatureSignalsClient("sdk-live-abc123", new ClientOptions
{
    EnvKey = "production"
});

await client.WaitForReadyAsync();

if (client.BoolVariation("new-checkout", fallback: false))
{
    // show new checkout flow
}

string banner = client.StringVariation("banner-text", fallback: "Welcome!");
double limit  = client.NumberVariation("rate-limit", fallback: 100);
```

## API Reference

### ClientOptions

| Property           | Type         | Default                              | Description                                      |
| ------------------ | ------------ | ------------------------------------ | ------------------------------------------------ |
| `EnvKey`           | `string`     | *required*                           | Environment key identifying the flag environment |
| `BaseUrl`          | `string`     | `https://api.featuresignals.com`     | Base URL of the FeatureSignals API               |
| `PollingInterval`  | `TimeSpan`   | 30 seconds                           | How often to poll for flag updates               |
| `Streaming`        | `bool`       | `false`                              | Use SSE streaming instead of polling             |
| `SseRetry`         | `TimeSpan`   | 5 seconds                            | Delay before SSE reconnection attempt            |
| `Timeout`          | `TimeSpan`   | 10 seconds                           | HTTP request timeout                             |
| `DefaultContext`   | `EvalContext` | `EvalContext("server")`             | Default evaluation context for flag fetches      |

### EvalContext

Immutable evaluation context identifying the entity being evaluated.

```csharp
var ctx = new EvalContext("user-123", new Dictionary<string, object?>
{
    ["plan"] = "enterprise",
    ["country"] = "US"
});

// Create a new context with an additional attribute
var updated = ctx.WithAttribute("beta", true);
```

### FeatureSignalsClient

#### Constructor

```csharp
var client = new FeatureSignalsClient(sdkKey: "sdk-live-abc123", options: new ClientOptions
{
    EnvKey = "production"
});
```

#### Methods

| Method | Return Type | Description |
| --- | --- | --- |
| `BoolVariation(key, ctx?, fallback)` | `bool` | Evaluate a boolean flag |
| `StringVariation(key, ctx?, fallback)` | `string` | Evaluate a string flag |
| `NumberVariation(key, ctx?, fallback)` | `double` | Evaluate a numeric flag |
| `JsonVariation<T>(key, ctx?, fallback)` | `T?` | Evaluate and deserialize a flag |
| `AllFlags()` | `IReadOnlyDictionary<string, object?>` | Get all cached flag values |
| `IsReady` | `bool` | Whether initial fetch has completed |
| `WaitForReadyAsync(timeout?)` | `Task` | Await until ready or timeout |
| `Dispose()` | `void` | Shut down background tasks and release resources |

#### Events

| Event | Signature | Description |
| --- | --- | --- |
| `OnReady` | `Action` | Fires once after successful initial fetch |
| `OnError` | `Action<Exception>` | Fires on network or parsing errors |
| `OnUpdate` | `Action<IReadOnlyDictionary<string, object?>>` | Fires when flags are updated |

### Variation Methods

Each variation method takes a flag key, an optional `EvalContext`, and a fallback value. If the flag is missing or has an incompatible type, the fallback is returned.

```csharp
bool enabled = client.BoolVariation("dark-mode", fallback: false);
string theme  = client.StringVariation("theme", fallback: "light");
double rate   = client.NumberVariation("rate-limit", fallback: 100);

var config = client.JsonVariation<MyConfig>("app-config", fallback: new MyConfig());
```

## Usage Patterns

### ASP.NET Core — Dependency Injection

Register the client as a singleton in `Program.cs`:

```csharp
builder.Services.AddSingleton(sp =>
{
    var client = new FeatureSignalsClient("sdk-live-abc123", new ClientOptions
    {
        EnvKey = "production",
        Streaming = true
    });
    return client;
});
```

Inject into controllers or services:

```csharp
public class HomeController(FeatureSignalsClient flags) : Controller
{
    public IActionResult Index()
    {
        var showBanner = flags.BoolVariation("promo-banner", fallback: false);
        return View(new HomeModel { ShowBanner = showBanner });
    }
}
```

### ASP.NET Core — Background Service

For graceful lifecycle management, wrap the client in a hosted service:

```csharp
public class FeatureSignalsService : IHostedService, IDisposable
{
    public FeatureSignalsClient Client { get; }

    public FeatureSignalsService()
    {
        Client = new FeatureSignalsClient("sdk-live-abc123", new ClientOptions
        {
            EnvKey = "production",
            Streaming = true
        });
    }

    public async Task StartAsync(CancellationToken ct)
    {
        await Client.WaitForReadyAsync();
    }

    public Task StopAsync(CancellationToken ct)
    {
        Client.Dispose();
        return Task.CompletedTask;
    }

    public void Dispose() => Client.Dispose();
}
```

Register in `Program.cs`:

```csharp
builder.Services.AddSingleton<FeatureSignalsService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<FeatureSignalsService>());
builder.Services.AddSingleton(sp => sp.GetRequiredService<FeatureSignalsService>().Client);
```

### ASP.NET Core — Middleware

```csharp
app.Use(async (context, next) =>
{
    var flags = context.RequestServices.GetRequiredService<FeatureSignalsClient>();
    if (flags.BoolVariation("maintenance-mode", fallback: false))
    {
        context.Response.StatusCode = 503;
        await context.Response.WriteAsync("Service temporarily unavailable");
        return;
    }
    await next();
});
```

## OpenFeature Integration

The SDK includes an OpenFeature-compatible provider for vendor-neutral flag evaluation:

```csharp
using FeatureSignals.OpenFeature;

var provider = new FeatureSignalsProvider("sdk-live-abc123", new ClientOptions
{
    EnvKey = "production"
});

var result = provider.ResolveBooleanEvaluation("feature-a", defaultValue: false);
// result.Value, result.Reason, result.ErrorCode

// Clean up
provider.Shutdown();
```

### Resolution methods

| Method | Return Type |
| --- | --- |
| `ResolveBooleanEvaluation(flagKey, defaultValue, context?)` | `ResolutionDetails<bool>` |
| `ResolveStringEvaluation(flagKey, defaultValue, context?)` | `ResolutionDetails<string>` |
| `ResolveNumberEvaluation(flagKey, defaultValue, context?)` | `ResolutionDetails<double>` |
| `ResolveObjectEvaluation<T>(flagKey, defaultValue, context?)` | `ResolutionDetails<T>` |

## Testing

Use `AllFlags()` or create a client pointed at a local test server:

```csharp
// In tests, spin up a mock HTTP server and point the SDK at it
var client = new FeatureSignalsClient("test-key", new ClientOptions
{
    EnvKey = "test",
    BaseUrl = "http://localhost:9999",
    PollingInterval = TimeSpan.FromSeconds(60)
});
```

### Running the test suite

```bash
dotnet test
```

## Requirements

- .NET 8.0 (LTS) or later
- C# 12
- Zero external dependencies (uses `System.Net.Http` and `System.Text.Json`)

## License

Apache-2.0
