# FeatureSignals Java SDK

Official Java SDK for [FeatureSignals](https://featuresignals.com) -- server-side feature flag evaluation with real-time updates.

## Installation

### Maven

```xml
<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.featuresignals:sdk-java:0.1.0'
```

Requires Java 17+. Only runtime dependency: Gson.

## Quick Start

```java
import com.featuresignals.sdk.*;

public class Main {
    public static void main(String[] args) throws Exception {
        var options = new ClientOptions("production")
            .baseURL("http://localhost:8080")
            .streaming(true);

        try (var client = new FeatureSignalsClient("fs_srv_xxx", options)) {
            client.waitForReady(5000);

            var user = new EvalContext("user-42")
                .withAttribute("plan", "pro")
                .withAttribute("country", "US");

            boolean enabled = client.boolVariation("new-checkout", user, false);
            System.out.println("New checkout: " + enabled);
        }
    }
}
```

## Features

- **Local evaluation** -- all flag reads are in-memory, zero network calls per check
- **Real-time updates** -- SSE streaming for instant flag changes with automatic reconnection
- **Polling fallback** -- configurable interval when SSE is not enabled
- **Type-safe API** -- `boolVariation`, `stringVariation`, `numberVariation`, `jsonVariation`
- **OpenFeature provider** -- use via the OpenFeature Java SDK for zero vendor lock-in
- **AutoCloseable** -- works with try-with-resources for clean shutdown
- **Callbacks** -- `setOnReady`, `setOnError`, `setOnUpdate` for observability
- **Graceful degradation** -- falls back to cached flags, then to SDK defaults
- **Thread-safe** -- safe for concurrent use in multi-threaded applications

## API Reference

### Client

```java
var options = new ClientOptions("production")
    .baseURL("http://localhost:8080");

var client = new FeatureSignalsClient("fs_srv_xxx", options);
```

### ClientOptions

| Method | Type | Default | Description |
|--------|------|---------|-------------|
| *constructor* | `String envKey` | **required** | Environment slug |
| `.baseURL(url)` | `String` | `https://api.featuresignals.com` | API server URL |
| `.pollingInterval(d)` | `Duration` | 30 seconds | Polling frequency |
| `.streaming(b)` | `boolean` | `false` | Enable SSE for real-time updates |
| `.sseRetry(d)` | `Duration` | 5 seconds | SSE reconnection delay |
| `.timeout(d)` | `Duration` | 10 seconds | HTTP request timeout |
| `.context(ctx)` | `EvalContext` | `new EvalContext("server")` | Default evaluation context |

All setters return `this` for fluent chaining.

### Variation Methods

Each method returns the flag value if it exists and matches the type, otherwise returns the fallback.

```java
boolean enabled = client.boolVariation("feature-key", ctx, false);
String text = client.stringVariation("banner-text", ctx, "Welcome!");
double limit = client.numberVariation("rate-limit", ctx, 100.0);
Map<String, Object> config = client.jsonVariation("theme", ctx, Map.of("mode", "light"));
```

### EvalContext

```java
// Simple context
var user = new EvalContext("user-42");

// With attributes (immutable-style: withAttribute returns a new copy)
var richUser = new EvalContext("user-42")
    .withAttribute("plan", "enterprise")
    .withAttribute("country", "US")
    .withAttribute("beta", true);

// From an existing map
var attrs = Map.of("plan", "pro", "region", "eu");
var user = new EvalContext("user-42", attrs);
```

### Lifecycle

```java
// Wait for initial flags to load (blocks up to timeout)
boolean ready = client.waitForReady(5000); // 5 seconds

// Check readiness
if (client.isReady()) { /* ... */ }

// Get all flags
Map<String, Object> flags = client.allFlags();

// Shut down (stops polling/SSE background threads)
client.close();
```

### Callbacks

```java
client.setOnReady(v -> System.out.println("Flags loaded"));
client.setOnError(err -> System.err.println("Flag error: " + err.getMessage()));
client.setOnUpdate(flags -> System.out.println("Updated: " + flags.size() + " flags"));
```

### OpenFeature Provider

```java
import com.featuresignals.sdk.*;

var options = new ClientOptions("production")
    .baseURL("http://localhost:8080");

try (var provider = new FeatureSignalsProvider("fs_srv_xxx", options)) {
    // OpenFeature-style evaluation
    ResolutionDetails<Boolean> result = provider.resolveBooleanEvaluation("new-checkout", false);
    System.out.println(result.value() + " " + result.reason());

    // Access underlying client
    FeatureSignalsClient client = provider.getClient();
}
```

## Usage Patterns

### Spring Boot

```java
@Configuration
public class FeatureFlagConfig {
    @Bean(destroyMethod = "close")
    public FeatureSignalsClient featureFlags() throws InterruptedException {
        var options = new ClientOptions("production")
            .baseURL("http://localhost:8080")
            .streaming(true);

        var client = new FeatureSignalsClient("fs_srv_xxx", options);
        client.waitForReady(10_000);
        return client;
    }
}

@RestController
public class CheckoutController {
    @Autowired
    private FeatureSignalsClient flags;

    @GetMapping("/checkout")
    public ResponseEntity<?> checkout(@AuthenticationPrincipal User user) {
        var ctx = new EvalContext(user.getId())
            .withAttribute("plan", user.getPlan());

        if (flags.boolVariation("new-checkout", ctx, false)) {
            return ResponseEntity.ok(newCheckoutFlow(user));
        }
        return ResponseEntity.ok(legacyCheckoutFlow(user));
    }
}
```

### Background Workers

```java
var options = new ClientOptions("production")
    .pollingInterval(Duration.ofSeconds(60));

try (var client = new FeatureSignalsClient("fs_srv_xxx", options)) {
    client.waitForReady(10_000);

    while (true) {
        Job job = queue.take();
        var ctx = new EvalContext(job.getUserId());
        if (client.boolVariation("new-algorithm", ctx, false)) {
            processV2(job);
        } else {
            processV1(job);
        }
    }
}
```

### Testing

```java
import static org.mockito.Mockito.*;

@Test
void testFeatureEnabled() {
    var client = mock(FeatureSignalsClient.class);
    when(client.boolVariation(eq("new-checkout"), any(), eq(false)))
        .thenReturn(true);
    when(client.isReady()).thenReturn(true);

    var service = new CheckoutService(client);
    assertTrue(service.shouldUseNewCheckout("user-42"));
}
```

## Building from Source

```bash
mvn clean install
mvn test
```

## License

Apache-2.0
