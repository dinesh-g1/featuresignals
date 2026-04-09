---
sidebar_position: 7
title: Ruby SDK
description: "FeatureSignals Ruby SDK — gem installation, polling, SSE, and OpenFeature provider."
---

# Ruby SDK

The Ruby SDK provides a thread-safe client for evaluating feature flags in Ruby applications.

## Installation

Add to your `Gemfile`:

```ruby
gem "featuresignals"
```

Or install directly:

```bash
gem install featuresignals
```

**Requirements**: Ruby 3.1+

## Quick Start

```ruby
require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "production")
client = FeatureSignals::Client.new("fs_srv_your_api_key", options)
client.wait_for_ready

user = FeatureSignals::EvalContext.new(key: "user-123", attributes: { "plan" => "pro" })

enabled = client.bool_variation("new-feature", user, false)
puts "Feature enabled: #{enabled}"
```

## Configuration

```ruby
options = FeatureSignals::ClientOptions.new(
  env_key: "production",
  base_url: "https://api.featuresignals.com", # For self-hosted, use your own API URL
  polling_interval: 15,
  streaming: true,
  sse_retry: 3,
  timeout: 10,
)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `env_key` | `String` | (required) | Environment key |
| `base_url` | `String` | `https://api.featuresignals.com` | API server URL |
| `polling_interval` | `Numeric` | `30` | Polling frequency in seconds |
| `streaming` | `Boolean` | `false` | Enable SSE streaming |
| `sse_retry` | `Numeric` | `5` | SSE reconnect delay in seconds |
| `timeout` | `Numeric` | `10` | HTTP timeout in seconds |

## Variation Methods

```ruby
enabled = client.bool_variation("flag-key", ctx, false)
value = client.string_variation("banner-text", ctx, "default")
limit = client.number_variation("rate-limit", ctx, 100.0)
config = client.json_variation("config", ctx, { "v" => 1 })
```

## Evaluation Context

```ruby
user = FeatureSignals::EvalContext.new(key: "user-42")

# with_attribute returns a new copy (immutable)
rich_user = user
  .with_attribute("plan", "enterprise")
  .with_attribute("country", "US")
```

## Lifecycle

```ruby
# Wait for initial flags
client.wait_for_ready(timeout: 10)

# Check readiness
if client.ready?
  # ...
end

# Get all flags
flags = client.all_flags

# Shutdown
client.close
```

## Callbacks

```ruby
client = FeatureSignals::Client.new("key", options,
  on_ready: -> { puts "Flags loaded" },
  on_error: ->(err) { warn "Error: #{err}" },
  on_update: ->(flags) { puts "Updated: #{flags.size} flags" },
)
```

## Rails Integration

Create an initializer at `config/initializers/feature_signals.rb`:

```ruby
Rails.application.config.to_prepare do
  options = FeatureSignals::ClientOptions.new(
    env_key: Rails.env.production? ? "production" : "development",
    base_url: ENV.fetch("FEATURESIGNALS_URL", "https://api.featuresignals.com"), # For self-hosted, set FEATURESIGNALS_URL
    streaming: true,
  )
  FEATURE_FLAGS = FeatureSignals::Client.new(
    ENV.fetch("FEATURESIGNALS_API_KEY"), options
  )
end

at_exit { FEATURE_FLAGS&.close }
```

Use in controllers:

```ruby
class CheckoutController < ApplicationController
  def show
    user = FeatureSignals::EvalContext.new(
      key: current_user.id.to_s,
      attributes: { "plan" => current_user.plan }
    )
    if FEATURE_FLAGS.bool_variation("new-checkout", user, false)
      render :new_checkout
    else
      render :checkout
    end
  end
end
```

## Sinatra

```ruby
require "sinatra"
require "featuresignals"

flags = FeatureSignals::Client.new("fs_srv_xxx",
  FeatureSignals::ClientOptions.new(env_key: "production"))

get "/feature" do
  ctx = FeatureSignals::EvalContext.new(key: params[:user_id] || "anonymous")
  { enabled: flags.bool_variation("my-flag", ctx, false) }.to_json
end
```

## OpenFeature

This SDK includes a built-in OpenFeature provider. See the [OpenFeature Integration](./openfeature.md) page for details. The provider uses `fetch_*_value` methods compatible with the `openfeature-sdk` gem.

## Thread Safety

- All variation methods are thread-safe (backed by `Mutex`)
- `EvalContext#with_attribute` returns a new object
- `close` is idempotent
