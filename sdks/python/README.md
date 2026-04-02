# FeatureSignals Python SDK

Official Python SDK for [FeatureSignals](https://featuresignals.com) -- server-side feature flag evaluation with real-time updates.

## Installation

```bash
pip install featuresignals
```

Requires Python 3.9+. Zero external dependencies.

## Quick Start

```python
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "fs_srv_xxx",
    ClientOptions(
        env_key="production",
        base_url="http://localhost:8080",
    ),
)
client.wait_for_ready()

user = EvalContext(key="user-42", attributes={"plan": "pro", "country": "US"})
enabled = client.bool_variation("new-checkout", user, False)
print("New checkout:", enabled)

# When shutting down
client.close()
```

## Features

- **Local evaluation** -- all flag reads are in-memory, zero network calls per check
- **Real-time updates** -- SSE streaming for instant flag changes with automatic reconnection
- **Polling fallback** -- configurable interval when SSE is not enabled
- **Type-safe API** -- `bool_variation`, `string_variation`, `number_variation`, `json_variation`
- **OpenFeature provider** -- use via the OpenFeature Python SDK for zero vendor lock-in
- **Callbacks** -- `on_ready`, `on_error`, `on_update` for observability
- **Graceful degradation** -- falls back to cached flags, then to SDK defaults
- **Thread-safe** -- safe for concurrent use in multi-threaded applications

## API Reference

### Client

```python
from featuresignals import FeatureSignalsClient, ClientOptions

client = FeatureSignalsClient(
    sdk_key="fs_srv_xxx",
    options=ClientOptions(env_key="production"),
    on_ready=lambda: print("Flags loaded"),
    on_error=lambda err: print(f"Error: {err}"),
    on_update=lambda flags: print(f"Updated: {len(flags)} flags"),
)
```

### ClientOptions

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `env_key` | `str` | **required** | Environment slug (e.g. `"production"`) |
| `base_url` | `str` | `https://api.featuresignals.com` | API server URL |
| `polling_interval` | `float` | `30.0` | Polling frequency in seconds |
| `streaming` | `bool` | `False` | Enable SSE for real-time updates |
| `sse_retry` | `float` | `5.0` | SSE reconnection delay in seconds |
| `timeout` | `float` | `10.0` | HTTP request timeout in seconds |
| `context` | `EvalContext` | `EvalContext(key="server")` | Default evaluation context |

### Variation Methods

Each method returns the flag value if it exists and matches the type, otherwise returns the fallback.

```python
enabled = client.bool_variation("feature-key", ctx, False)
text = client.string_variation("banner-text", ctx, "Welcome!")
limit = client.number_variation("rate-limit", ctx, 100.0)
config = client.json_variation("theme", ctx, {"mode": "light"})
```

### Evaluation Context

```python
from featuresignals import EvalContext

user = EvalContext(key="user-42", attributes={"plan": "enterprise"})

# Immutable-style: with_attribute returns a new copy
premium_user = user.with_attribute("tier", "premium")
```

### Lifecycle

```python
# Wait for initial flags to load (blocks up to timeout seconds)
ready = client.wait_for_ready(timeout=10.0)

# Check readiness
if client.is_ready():
    pass

# Get all flags
flags = client.all_flags()

# Shut down background threads
client.close()
```

### OpenFeature Provider

```python
from featuresignals import FeatureSignalsProvider, ClientOptions

provider = FeatureSignalsProvider("fs_srv_xxx", ClientOptions(env_key="production"))

# Access the underlying client
client = provider.client

# OpenFeature-style evaluation
result = provider.resolve_boolean_evaluation("new-checkout", False)
print(result.value, result.reason)

# Shutdown
provider.shutdown()
```

## Usage Patterns

### Flask

```python
from flask import Flask, g
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

app = Flask(__name__)
flags = FeatureSignalsClient("fs_srv_xxx", ClientOptions(
    env_key="production",
    streaming=True,
))

@app.before_request
def set_user_context():
    g.user_ctx = EvalContext(
        key=get_current_user_id(),
        attributes={"plan": get_current_user_plan()},
    )

@app.route("/checkout")
def checkout():
    if flags.bool_variation("new-checkout", g.user_ctx, False):
        return render_new_checkout()
    return render_old_checkout()
```

### FastAPI

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

flags: FeatureSignalsClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global flags
    flags = FeatureSignalsClient("fs_srv_xxx", ClientOptions(
        env_key="production",
        streaming=True,
    ))
    flags.wait_for_ready()
    yield
    flags.close()

app = FastAPI(lifespan=lifespan)

@app.get("/api/data")
def get_data(user_id: str):
    ctx = EvalContext(key=user_id)
    if flags.bool_variation("new-algorithm", ctx, False):
        return compute_v2()
    return compute_v1()
```

### Django

```python
# settings.py
from featuresignals import FeatureSignalsClient, ClientOptions

FEATURE_FLAGS = FeatureSignalsClient("fs_srv_xxx", ClientOptions(
    env_key="production",
    streaming=True,
))

# views.py
from django.conf import settings
from featuresignals import EvalContext

def my_view(request):
    ctx = EvalContext(key=str(request.user.id), attributes={"plan": request.user.plan})
    if settings.FEATURE_FLAGS.bool_variation("dark-mode", ctx, False):
        return render(request, "dark_template.html")
    return render(request, "light_template.html")
```

### Testing

```python
import pytest
from unittest.mock import MagicMock
from featuresignals import FeatureSignalsClient

@pytest.fixture
def mock_flags():
    client = MagicMock(spec=FeatureSignalsClient)
    client.bool_variation.return_value = True
    client.is_ready.return_value = True
    return client
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

## License

Apache-2.0
