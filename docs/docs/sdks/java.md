---
sidebar_position: 5
title: Java SDK
---

# Java SDK

The Java SDK provides a thread-safe client for evaluating feature flags in Java applications.

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

**Requirements**: Java 17+

## Quick Start

```java
import com.featuresignals.sdk.*;

public class Main {
    public static void main(String[] args) throws Exception {
        var options = new ClientOptions("production")
            .baseURL("https://api.featuresignals.com"); // For self-hosted, use your own API URL

        var client = new FeatureSignalsClient("fs_srv_your_api_key", options);
        client.waitForReady(5000);

        var ctx = new EvalContext("user-123")
            .withAttribute("country", "US")
            .withAttribute("plan", "enterprise");

        boolean enabled = client.boolVariation("new-feature", ctx, false);
        System.out.println("Feature enabled: " + enabled);

        client.close();
    }
}
```

## Configuration

```java
var options = new ClientOptions("production")
    .baseURL("https://api.featuresignals.com")   // API server URL; for self-hosted, use your own API URL
    .pollingInterval(Duration.ofSeconds(30))   // Polling interval
    .streaming(true)                           // Enable SSE
    .sseRetry(Duration.ofSeconds(5))          // SSE reconnect delay
    .timeout(Duration.ofSeconds(10))          // HTTP timeout
    .context(new EvalContext("server"));       // Default context
```

### Options Reference

| Method | Default | Description |
|--------|---------|-------------|
| `baseURL(String)` | `https://api.featuresignals.com` | API server URL |
| `pollingInterval(Duration)` | `30s` | Refresh interval |
| `streaming(boolean)` | `false` | Enable SSE streaming |
| `sseRetry(Duration)` | `5s` | SSE reconnect delay |
| `timeout(Duration)` | `10s` | HTTP timeout |
| `context(EvalContext)` | `new EvalContext("server")` | Default context |

## Evaluation Context

```java
// Simple context
var ctx = new EvalContext("user-123");

// With attributes
var attrs = Map.of("country", "US", "plan", "enterprise");
var ctx = new EvalContext("user-123", attrs);

// Builder style
var ctx = new EvalContext("user-123")
    .withAttribute("country", "US")
    .withAttribute("plan", "enterprise");
```

## Variation Methods

```java
// Boolean
boolean enabled = client.boolVariation("flag-key", ctx, false);

// String
String theme = client.stringVariation("theme", ctx, "light");

// Number (returns double)
double limit = client.numberVariation("rate-limit", ctx, 100.0);

// JSON (generic, uses Gson internally)
MyConfig config = client.jsonVariation("feature-config", ctx, defaultConfig);
```

## Callbacks

```java
client.setOnReady(v -> System.out.println("Ready!"));
client.setOnError(err -> System.err.println("Error: " + err));
client.setOnUpdate(flags -> System.out.println("Updated: " + flags.size() + " flags"));
```

## Readiness

```java
// Blocking wait
client.waitForReady(5000); // throws InterruptedException

// Non-blocking
if (client.isReady()) {
    // flags are loaded
}
```

## Getting All Flags

```java
Map<String, Object> allFlags = client.allFlags();
```

## Shutdown

```java
client.close();

// Or with try-with-resources
try (var client = new FeatureSignalsClient(key, options)) {
    // use client
}
```

The client implements `AutoCloseable` for use with try-with-resources.

## OpenFeature Integration

See [OpenFeature](/sdks/openfeature) for using the Java SDK with OpenFeature.
