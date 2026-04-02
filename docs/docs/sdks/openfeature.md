---
sidebar_position: 9
title: OpenFeature
---

# OpenFeature Integration

All FeatureSignals server SDKs include an [OpenFeature](https://openfeature.dev/) provider, giving you a vendor-neutral API for feature flag evaluation.

## What is OpenFeature?

OpenFeature is an open standard for feature flag management. By using OpenFeature, your application code doesn't depend on any specific feature flag vendor — you can switch providers without changing your evaluation code.

## Go

```go
import (
    fs "github.com/featuresignals/sdk-go"
    "github.com/open-feature/go-sdk/openfeature"
)

// Create the FeatureSignals client
client := fs.NewClient("fs_srv_...", "production",
    fs.WithBaseURL("http://localhost:8080"),
)
defer client.Close()
<-client.Ready()

// Register as OpenFeature provider
provider := fs.NewProvider(client)
openfeature.SetProviderAndWait(provider)

// Use OpenFeature API
ofClient := openfeature.NewClient("my-app")
enabled, _ := ofClient.BooleanValue(
    context.Background(),
    "my-flag",
    false,
    openfeature.NewEvaluationContext("user-123", nil),
)
```

## Node.js

```typescript
import { FeatureSignalsClient, FeatureSignalsProvider } from '@featuresignals/node';

const fsClient = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'http://localhost:8080',
});

await fsClient.waitForReady();

const provider = new FeatureSignalsProvider(fsClient);

// Use the provider's resolution methods directly
const result = provider.resolveBooleanEvaluation('my-flag', false);
// result: { value: true, reason: 'CACHED' }
```

## Python

```python
from featuresignals import FeatureSignalsProvider, ClientOptions

provider = FeatureSignalsProvider(
    "fs_srv_...",
    ClientOptions(env_key="production", base_url="http://localhost:8080"),
)

provider.client.wait_for_ready()

# Use resolution methods
result = provider.resolve_boolean_evaluation("my-flag", False)
# result.value, result.reason

# Shutdown
provider.shutdown()
```

### Resolution Methods

```python
provider.resolve_boolean_evaluation(key, default_value)
provider.resolve_string_evaluation(key, default_value)
provider.resolve_integer_evaluation(key, default_value)
provider.resolve_float_evaluation(key, default_value)
provider.resolve_object_evaluation(key, default_value)
```

## Java

```java
import com.featuresignals.sdk.*;

var options = new ClientOptions("production")
    .baseURL("http://localhost:8080");

try (var provider = new FeatureSignalsProvider("fs_srv_...", options)) {
    provider.getClient().waitForReady(5000);

    var result = provider.resolveBooleanEvaluation("my-flag", false, null);
    // result.value(), result.reason()
}
```

## .NET / C#

```csharp
using FeatureSignals;
using FeatureSignals.OpenFeature;

var options = new ClientOptions { EnvKey = "production" };
using var client = new FeatureSignalsClient("fs_srv_...", options);
await client.WaitForReadyAsync();

var provider = new FeatureSignalsProvider(client);

var result = provider.ResolveBooleanEvaluation("my-flag", false);
// result.Value, result.Reason
```

## Ruby

```ruby
require "featuresignals"

options = FeatureSignals::ClientOptions.new(
  env_key: "production",
  base_url: "http://localhost:8080"
)
provider = FeatureSignals::OpenFeature::Provider.new("fs_srv_...", options)
provider.client.wait_for_ready

result = provider.resolve_boolean_evaluation("my-flag", false)
# result.value, result.reason

provider.shutdown
```

## Resolution Details

All providers return resolution details with:

| Field | Description |
|-------|-------------|
| `value` | The resolved flag value |
| `reason` | `CACHED` (success) or `ERROR` (failure) |
| `errorCode` | `FLAG_NOT_FOUND` or `TYPE_MISMATCH` (on error) |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| `FLAG_NOT_FOUND` | The flag key doesn't exist in the cache |
| `TYPE_MISMATCH` | The flag value doesn't match the requested type |

When an error occurs, the **default value** is returned.
