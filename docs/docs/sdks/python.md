---
sidebar_position: 4
title: Python SDK
description: "FeatureSignals Python SDK — installation, polling, SSE streaming, and OpenFeature provider."
---

# Python SDK

The Python SDK provides a thread-safe client for evaluating feature flags in Python applications.

## Installation

```bash
pip install featuresignals
```

**Requirements**: Python 3.9+

## Quick Start

```python
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "fs_srv_your_api_key",
    ClientOptions(env_key="production", base_url="https://api.featuresignals.com"),  # For self-hosted, use your own API URL
)

client.wait_for_ready()

ctx = EvalContext(key="user-123", attributes={"country": "US"})
enabled = client.bool_variation("new-feature", ctx, False)
print(f"Feature enabled: {enabled}")

client.close()
```

## Configuration

```python
from featuresignals import ClientOptions, EvalContext

options = ClientOptions(
    env_key="production",                    # Required: environment key
    base_url="https://api.featuresignals.com",  # API server URL; for self-hosted, use your own API URL
    polling_interval=30.0,                   # Polling interval (seconds)
    streaming=False,                         # Use SSE instead of polling
    sse_retry=5.0,                          # SSE reconnect delay (seconds)
    timeout=10.0,                           # HTTP request timeout (seconds)
    context=EvalContext(key="server"),        # Default evaluation context
)
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `env_key` | `str` | (required) | Environment key |
| `base_url` | `str` | `https://api.featuresignals.com` | API server URL |
| `polling_interval` | `float` | `30.0` | Refresh interval (seconds) |
| `streaming` | `bool` | `False` | Enable SSE streaming |
| `sse_retry` | `float` | `5.0` | SSE reconnect delay (seconds) |
| `timeout` | `float` | `10.0` | HTTP timeout (seconds) |
| `context` | `EvalContext` | `EvalContext(key="server")` | Default context for flag fetch |

## Callbacks

```python
def on_ready():
    print("Flags loaded!")

def on_error(err):
    print(f"Error: {err}")

def on_update(flags):
    print(f"Updated {len(flags)} flags")

client = FeatureSignalsClient(
    "api-key",
    options,
    on_ready=on_ready,
    on_error=on_error,
    on_update=on_update,
)
```

## Evaluation Context

```python
from featuresignals import EvalContext

# Simple context
ctx = EvalContext(key="user-123")

# With attributes
ctx = EvalContext(
    key="user-123",
    attributes={
        "country": "US",
        "plan": "enterprise",
        "beta": True,
    },
)

# Immutable builder
ctx = EvalContext(key="user-123").with_attribute("country", "US")
```

## Variation Methods

```python
# Boolean
enabled = client.bool_variation("flag-key", ctx, False)

# String
theme = client.string_variation("theme", ctx, "light")

# Number (int or float)
limit = client.number_variation("rate-limit", ctx, 100)

# JSON (dict/list)
config = client.json_variation("feature-config", ctx, {})
```

## Readiness

```python
# Blocking wait (with timeout)
ready = client.wait_for_ready(timeout=10.0)  # Returns bool

# Non-blocking check
if client.is_ready():
    # flags are loaded
    pass
```

## Getting All Flags

```python
all_flags = client.all_flags()  # dict[str, Any]
```

## Shutdown

```python
client.close()
```

The client uses daemon threads, so they'll be cleaned up on process exit even without calling `close()`.

## OpenFeature

This SDK includes a built-in OpenFeature provider. See the [OpenFeature Integration](./openfeature.md) page for details. The provider extends `AbstractProvider` from the `openfeature-sdk` package.
