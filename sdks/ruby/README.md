# FeatureSignals Ruby SDK

Server-side Ruby SDK for [FeatureSignals](https://featuresignals.com) — evaluate feature flags locally with zero latency after initialization.

The SDK fetches all flag values on startup, caches them in memory, and keeps them fresh via background polling or SSE streaming. Every evaluation is a local hash lookup with no network call.

**Zero external dependencies** — uses only Ruby stdlib (`net/http`, `json`).

## Installation

Add to your `Gemfile`:

```ruby
gem "featuresignals"
```

Then run:

```bash
bundle install
```

Or install directly:

```bash
gem install featuresignals
```

## Quick Start

```ruby
require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "production")
client  = FeatureSignals::Client.new("your-sdk-key", options)

client.wait_for_ready(timeout: 5)

ctx = FeatureSignals::EvalContext.new(key: "user-123")

if client.bool_variation("dark-mode", ctx, false)
  # show dark mode
end

title = client.string_variation("welcome-title", ctx, "Welcome!")
limit = client.number_variation("rate-limit", ctx, 100)
```

## OpenFeature Usage

FeatureSignals integrates with the [OpenFeature](https://openfeature.dev) standard. Install the OpenFeature Ruby SDK and register the FeatureSignals provider:

```ruby
require "open_feature/sdk"
require "featuresignals"

provider = FeatureSignals::OpenFeature::Provider.new("sdk-key",
  FeatureSignals::ClientOptions.new(env_key: "production"))
OpenFeature::SDK.configure { |c| c.set_provider(provider) }
client = OpenFeature::SDK.build_client
value = client.fetch_boolean_value(flag_key: "dark-mode", default_value: false)
```

## API Reference

### `FeatureSignals::ClientOptions`

| Parameter          | Type             | Default                               | Description                           |
|--------------------|------------------|---------------------------------------|---------------------------------------|
| `env_key:`         | `String`         | **required**                          | Environment key from your dashboard   |
| `base_url:`        | `String`         | `"https://api.featuresignals.com"`    | API base URL                          |
| `polling_interval:`| `Integer/Float`  | `30`                                  | Seconds between flag polls            |
| `streaming:`       | `Boolean`        | `false`                               | Use SSE streaming instead of polling  |
| `sse_retry:`       | `Integer/Float`  | `5`                                   | Seconds to wait before SSE reconnect  |
| `timeout:`         | `Integer/Float`  | `10`                                  | HTTP timeout in seconds               |
| `context:`         | `EvalContext`    | `EvalContext.new(key: "server")`      | Default evaluation context            |

### `FeatureSignals::Client`

```ruby
client = FeatureSignals::Client.new(
  "sdk-key",
  options,
  on_ready: -> { puts "Ready!" },
  on_error: ->(e) { puts "Error: #{e.message}" },
  on_update: ->(flags) { puts "Flags updated" }
)
```

#### Methods

| Method | Description |
|--------|-------------|
| `bool_variation(key, ctx, fallback)` | Returns boolean flag value or fallback |
| `string_variation(key, ctx, fallback)` | Returns string flag value or fallback |
| `number_variation(key, ctx, fallback)` | Returns numeric flag value or fallback |
| `json_variation(key, ctx, fallback)` | Returns flag value of any type or fallback |
| `all_flags` | Returns a hash of all current flag values |
| `ready?` | Whether the client has completed initial fetch |
| `wait_for_ready(timeout: 10)` | Block until ready; returns `true`/`false` |
| `close` | Shut down background threads |

### `FeatureSignals::EvalContext`

```ruby
ctx = FeatureSignals::EvalContext.new(key: "user-42", attributes: { "plan" => "pro" })
ctx = ctx.with_attribute("country", "US")
```

Immutable — `with_attribute` returns a new copy.

## Usage Patterns

### Rails Initializer

```ruby
# config/initializers/featuresignals.rb
require "featuresignals"

FEATURE_FLAGS = FeatureSignals::Client.new(
  Rails.application.credentials.featuresignals_sdk_key,
  FeatureSignals::ClientOptions.new(
    env_key: Rails.env,
    streaming: Rails.env.production?
  )
)

at_exit { FEATURE_FLAGS.close }
```

Then in controllers/views:

```ruby
ctx = FeatureSignals::EvalContext.new(key: current_user.id.to_s)
if FEATURE_FLAGS.bool_variation("new-checkout", ctx, false)
  render "checkout_v2"
end
```

### Sinatra

```ruby
require "sinatra"
require "featuresignals"

configure do
  set :flags, FeatureSignals::Client.new(
    ENV["FS_SDK_KEY"],
    FeatureSignals::ClientOptions.new(env_key: "production")
  )
end

get "/" do
  ctx = FeatureSignals::EvalContext.new(key: "anonymous")
  title = settings.flags.string_variation("hero-title", ctx, "Welcome")
  erb :index, locals: { title: title }
end
```

## OpenFeature Integration

The SDK ships with an OpenFeature-compatible provider:

```ruby
require "featuresignals"

provider = FeatureSignals::OpenFeature::Provider.new(
  "sdk-key",
  FeatureSignals::ClientOptions.new(env_key: "production")
)

# Register with OpenFeature
# OpenFeature::SDK.set_provider(provider)
# client = OpenFeature::SDK.build_client
# value = client.fetch_boolean_value("my-flag", false)

# Direct usage
details = provider.resolve_boolean_evaluation("my-flag", false)
puts details.value   # => true
puts details.reason  # => "CACHED"
```

### Resolution methods

| Method | Description |
|--------|-------------|
| `resolve_boolean_evaluation(key, default, context)` | Resolve a boolean flag |
| `resolve_string_evaluation(key, default, context)` | Resolve a string flag |
| `resolve_number_evaluation(key, default, context)` | Resolve a numeric flag |
| `resolve_object_evaluation(key, default, context)` | Resolve any flag type |
| `shutdown` | Close the underlying client |

Each returns a `FeatureSignals::OpenFeature::ResolutionDetails` with `value`, `reason`, `error_code`, and `error_message`.

## Testing

Write tests against a mock server or stub the client:

```ruby
require "minitest/autorun"
require "featuresignals"

class MyFeatureTest < Minitest::Test
  def test_with_stubbed_client
    client = Minitest::Mock.new
    ctx = FeatureSignals::EvalContext.new(key: "test")

    client.expect(:bool_variation, true, ["my-flag", ctx, false])
    assert client.bool_variation("my-flag", ctx, false)
    client.verify
  end
end
```

Run the SDK's own test suite:

```bash
bundle install
bundle exec rake test
```

## Requirements

- Ruby >= 3.1
- No external gems required (stdlib only)

## License

Apache-2.0
