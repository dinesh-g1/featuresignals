---
sidebar_position: 9
title: OpenFeature
---

# OpenFeature Integration

All FeatureSignals SDKs ship with an [OpenFeature](https://openfeature.dev/) provider, giving you a vendor-neutral API for feature flag evaluation. You can adopt FeatureSignals as the backend and still write all evaluation code against the standard OpenFeature interfaces.

## How it works

FeatureSignals is **not** an OpenFeature provider at the backend level. It is a full feature flag management system (flag storage, targeting rules, environments, audit log, and more). Each SDK includes a **local provider** that bridges the FeatureSignals client to the OpenFeature API:

1. The FeatureSignals client connects to the server, fetches flags, and keeps a local cache (via polling or SSE streaming).
2. The OpenFeature provider wraps that client and resolves every evaluation from the local cache -- no per-evaluation network calls.
3. Client lifecycle events (flag updates, errors) are bridged to OpenFeature provider events so the OF SDK can react to configuration changes.

Because evaluations always read from the cache, every resolution detail returns reason **`CACHED`** on success. The `variant` field is empty because FeatureSignals returns flat key-value pairs rather than variant maps.

---

## Go

**Dependency:** `github.com/open-feature/go-sdk` v1.17.1

The Go provider implements three OpenFeature interfaces -- `FeatureProvider`, `StateHandler`, and `EventHandler`. The `Init` method blocks until the underlying client has its initial flag set (or a 30-second timeout). Client events are bridged to `ProviderConfigChange` and `ProviderError` events via the `EventChannel`.

```go
import (
    fs "github.com/featuresignals/sdk-go"
    of "github.com/open-feature/go-sdk/openfeature"
)

client := fs.NewClient("fs_srv_...", "production",
    fs.WithBaseURL("https://flags.example.com"),
)

of.SetProviderAndWait(fs.NewProvider(client))

ofClient := of.NewClient("my-service")
enabled, _ := ofClient.BooleanValue(
    context.Background(),
    "dark-mode",
    false,
    of.EvaluationContext{},
)
```

The provider exposes `BooleanEvaluation`, `StringEvaluation`, `FloatEvaluation`, `IntEvaluation`, and `ObjectEvaluation`. Integer evaluation handles JSON numbers (which unmarshal as `float64` in Go) by converting to `int64`.

---

## Node.js

**Dependency:** `@openfeature/server-sdk` ^1.13.0 (optional peer dependency)

The Node.js provider has `initialize()` and `onClose()` lifecycle methods and an `events` `EventEmitter` that emits `PROVIDER_CONFIGURATION_CHANGED` and `PROVIDER_ERROR` by bridging the underlying client's `update` and `error` events. It declares `runsOn: "server"`.

```typescript
import { FeatureSignalsClient, FeatureSignalsProvider } from "@featuresignals/node";
import { OpenFeature } from "@openfeature/server-sdk";

const fsClient = new FeatureSignalsClient("fs_srv_...", {
  envKey: "production",
  baseURL: "https://flags.example.com",
});

await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));

const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue("dark-mode", false);
```

Resolution methods: `resolveBooleanEvaluation`, `resolveStringEvaluation`, `resolveNumberEvaluation`, `resolveObjectEvaluation`.

---

## Python

**Dependency:** `openfeature-sdk` >= 0.7.0

The Python provider extends `AbstractProvider` from the OpenFeature SDK. It owns the FeatureSignals client internally -- pass the SDK key and `ClientOptions` to the provider constructor, and the provider creates the client, calls `wait_for_ready` during `initialize()`, and tears it down in `shutdown()`.

```python
from openfeature import api as of_api
from featuresignals.openfeature import FeatureSignalsProvider
from featuresignals.client import ClientOptions

provider = FeatureSignalsProvider(
    "fs_srv_...",
    ClientOptions(env_key="production", base_url="https://flags.example.com"),
)
of_api.set_provider(provider)

client = of_api.get_client()
value = client.get_boolean_value("dark-mode", False)
```

Resolution methods: `resolve_boolean_details`, `resolve_string_details`, `resolve_integer_details`, `resolve_float_details`, `resolve_object_details`. Integer and float resolution both accept `int` or `float` values from the cache.

---

## Java

**Dependency:** `dev.openfeature:sdk` 1.12.0

The Java provider implements `FeatureProvider` and `AutoCloseable`. It owns the FeatureSignals client -- the constructor takes the SDK key and `ClientOptions`, and `initialize()` calls `waitForReady` with a 30-second timeout. `shutdown()` / `close()` cleans up the client.

```java
import com.featuresignals.sdk.*;
import dev.openfeature.sdk.*;

var options = new ClientOptions("production")
    .baseURL("https://flags.example.com");

var provider = new FeatureSignalsProvider("fs_srv_...", options);
OpenFeatureAPI.getInstance().setProviderAndWait(provider);

Client client = OpenFeatureAPI.getInstance().getClient();
boolean enabled = client.getBooleanValue("dark-mode", false);
```

Resolution methods: `getBooleanEvaluation`, `getStringEvaluation`, `getIntegerEvaluation`, `getDoubleEvaluation`, `getObjectEvaluation`. Numeric evaluations handle `Number` subtypes and convert via `intValue()` / `doubleValue()`.

---

## .NET / C\#

**Dependency:** `OpenFeature` NuGet package 2.2.0

The .NET provider extends the `FeatureProvider` abstract class and implements `IDisposable`. It accepts either a pre-built `FeatureSignalsClient` or an SDK key + `ClientOptions`. `InitializeAsync` calls `WaitForReadyAsync` on the underlying client.

```csharp
using FeatureSignals;
using FeatureSignals.OpenFeature;
using OpenFeature;

var client = new FeatureSignalsClient("fs_srv_...", new ClientOptions
{
    EnvKey = "production",
    BaseURL = "https://flags.example.com",
});
var provider = new FeatureSignalsProvider(client);

await Api.Instance.SetProviderAsync(provider);

var ofClient = Api.Instance.GetClient();
var enabled = await ofClient.GetBooleanValueAsync("dark-mode", false);
```

Resolution methods: `ResolveBooleanValueAsync`, `ResolveStringValueAsync`, `ResolveIntegerValueAsync`, `ResolveDoubleValueAsync`, `ResolveStructureValueAsync`. All methods are async (`Task<ResolutionDetails<T>>`) even though the underlying lookup is synchronous, matching the OpenFeature .NET contract.

---

## Ruby

**Dependency:** `openfeature-sdk` ~> 0.4

The Ruby provider follows the `openfeature-sdk` gem conventions, using keyword arguments for all resolution methods. Like Python and Java, it owns the client internally. `init` calls `wait_for_ready`, and `shutdown` closes the client.

```ruby
require "open_feature/sdk"
require "featuresignals"

provider = FeatureSignals::OpenFeature::Provider.new(
  "fs_srv_...",
  FeatureSignals::ClientOptions.new(env_key: "production", base_url: "https://flags.example.com"),
)

OpenFeature::SDK.configure do |config|
  config.set_provider(provider)
end

client = OpenFeature::SDK.build_client
value = client.fetch_boolean_value(flag_key: "dark-mode", default_value: false)
```

Resolution methods: `fetch_boolean_value`, `fetch_string_value`, `fetch_number_value`, `fetch_object_value`. All accept `flag_key:`, `default_value:`, and an optional `evaluation_context:`.

---

## React

**Dependency:** `@openfeature/web-sdk` ^1.0.0 (optional peer dependency)

The React SDK provides a standalone `FeatureSignalsWebProvider` that implements the OpenFeature web provider interface with **synchronous** resolution methods (as required by the web SDK). Unlike the server-side providers which wrap a separate client, this provider manages its own HTTP fetching and background refresh (polling or SSE).

```typescript
import { OpenFeature } from "@openfeature/web-sdk";
import { FeatureSignalsWebProvider } from "@featuresignals/react";

const provider = new FeatureSignalsWebProvider({
  sdkKey: "fs_cli_...",
  envKey: "production",
  baseURL: "https://flags.example.com",
  streaming: true,
});

await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();
const enabled = client.getBooleanValue("dark-mode", false);
```

The provider declares `runsOn: "client"` and accepts options for `pollingIntervalMs` (default 30000) and `streaming` (SSE, default false). `initialize()` fetches the initial flag set and starts background refresh. `onClose()` stops polling/SSE.

---

## Vue

**Dependency:** `@openfeature/web-sdk` ^1.0.0 (optional peer dependency)

The Vue SDK exports both the `FeatureSignalsWebProvider` class and a `createOpenFeatureProvider()` factory function for convenience. The implementation is identical to the React web provider -- synchronous resolution, standalone HTTP fetching, polling or SSE refresh.

```typescript
import { OpenFeature } from "@openfeature/web-sdk";
import { createOpenFeatureProvider } from "@featuresignals/vue";

const provider = createOpenFeatureProvider({
  sdkKey: "fs_cli_...",
  envKey: "production",
  baseURL: "https://flags.example.com",
});

await OpenFeature.setProviderAndWait(provider);

const client = OpenFeature.getClient();
const enabled = client.getBooleanValue("dark-mode", false);
```

---

## Resolution details

All providers return resolution details following the same contract:

| Field | Value on success | Value on error |
|-------|-----------------|----------------|
| `value` | The resolved flag value | The `defaultValue` you passed in |
| `reason` | `CACHED` | `ERROR` |
| `variant` | Empty (not used) | Empty |
| `errorCode` | -- | `FLAG_NOT_FOUND` or `TYPE_MISMATCH` |
| `errorMessage` | -- | Human-readable description |

## Error codes

| Error code | Meaning |
|------------|---------|
| `FLAG_NOT_FOUND` | The flag key does not exist in the cached flag set |
| `TYPE_MISMATCH` | The cached flag value cannot be converted to the requested type |

When an error occurs, the **default value** you provided is always returned.

## Architecture notes

- **No per-evaluation network calls.** Every provider resolves flags from an in-memory cache that is kept current by the client's background sync (polling or SSE). This keeps evaluation latency sub-millisecond.
- **Event bridging.** Server-side providers (Go, Node.js) bridge internal client events (flag updates, connection errors) to OpenFeature provider events (`PROVIDER_CONFIGURATION_CHANGED`, `PROVIDER_ERROR`). This lets the OpenFeature SDK and any registered handlers react to flag changes in real time.
- **Lifecycle management.** All providers implement the OpenFeature lifecycle contract (`initialize` / `shutdown` or the language-specific equivalent). Calling `SetProviderAndWait` (or the equivalent) blocks until the initial flag set is available.
- **Server vs. web providers.** The Go, Node.js, Python, Java, .NET, and Ruby providers are server-side: they wrap a FeatureSignals client that authenticates with a server-side SDK key (`fs_srv_...`). The React and Vue providers are client-side: they use a client key (`fs_cli_...`), fetch flags via HTTP, and resolve synchronously as required by `@openfeature/web-sdk`.
