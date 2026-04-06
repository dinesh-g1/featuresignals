# FeatureSignals React SDK

Official React SDK for [FeatureSignals](https://featuresignals.com) -- client-side feature flag evaluation with hooks and real-time updates.

## Installation

```bash
npm install @featuresignals/react
```

**Peer dependency:** React 18+

## Quick Start

Wrap your app with the `FeatureSignalsProvider`, then use hooks to check flags:

```tsx
import { FeatureSignalsProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FeatureSignalsProvider
      sdkKey="fs_cli_xxx"
      envKey="production"
      userKey="user-42"
    >
      <MyComponent />
    </FeatureSignalsProvider>
  );
}

function MyComponent() {
  const showNewCheckout = useFlag("new-checkout", false);
  return showNewCheckout ? <NewCheckout /> : <OldCheckout />;
}
```

## Features

- **React hooks** -- `useFlag`, `useFlags`, `useReady`, `useError`
- **Context provider** -- wraps your app, manages flag state automatically
- **Real-time updates** -- SSE streaming for instant flag changes
- **Polling fallback** -- configurable interval when SSE is not enabled
- **Graceful degradation** -- returns fallback values when flags haven't loaded yet

## OpenFeature Usage

FeatureSignals integrates with the [OpenFeature](https://openfeature.dev) standard. Install the OpenFeature Web SDK and register the FeatureSignals provider:

```tsx
import { OpenFeature } from "@openfeature/web-sdk"; // npm install @openfeature/web-sdk
import { FeatureSignalsWebProvider } from "@featuresignals/react";

const provider = new FeatureSignalsWebProvider({
  sdkKey: "fs_cli_...",
  envKey: "production",
});
await OpenFeature.setProviderAndWait(provider);
const client = OpenFeature.getClient();
const enabled = client.getBooleanValue("dark-mode", false);
```

## API Reference

### `<FeatureSignalsProvider>`

The context provider that fetches and manages flag state.

```tsx
<FeatureSignalsProvider
  sdkKey="fs_cli_xxx"
  envKey="production"
  userKey="user-42"
  baseURL="https://api.featuresignals.com"
  streaming={true}
  pollingIntervalMs={30000}
>
  {children}
</FeatureSignalsProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sdkKey` | `string` | **required** | Client API key |
| `envKey` | `string` | **required** | Environment slug |
| `userKey` | `string` | `"anonymous"` | User identifier for evaluation |
| `baseURL` | `string` | `https://api.featuresignals.com` | API server URL |
| `streaming` | `boolean` | `false` | Enable SSE for real-time updates |
| `pollingIntervalMs` | `number` | `30000` | Polling frequency (0 to disable when not streaming) |

### `useFlag<T>(key: string, fallback: T): T`

Returns the value of a single flag. Falls back to the provided default if the flag is not found or not yet loaded.

```tsx
const enabled = useFlag("new-checkout", false);          // boolean
const banner = useFlag("banner-text", "Welcome!");       // string
const limit = useFlag("request-limit", 100);             // number
const config = useFlag("theme", { mode: "light" });      // object
```

### `useFlags(): Record<string, unknown>`

Returns the full flag map.

```tsx
const flags = useFlags();
console.log(flags["dark-mode"]);
```

### `useReady(): boolean`

Returns `true` once the initial flag fetch completes.

```tsx
const ready = useReady();

if (!ready) return <LoadingSpinner />;
return <App />;
```

### `useError(): Error | null`

Returns the latest error from flag fetching or streaming, or `null`.

```tsx
const error = useError();

if (error) {
  console.error("Flag error:", error.message);
}
```

## Usage Patterns

### With SSE Streaming

For real-time flag updates without polling:

```tsx
<FeatureSignalsProvider
  sdkKey="fs_cli_xxx"
  envKey="production"
  userKey={currentUser.id}
  streaming={true}
>
  <App />
</FeatureSignalsProvider>
```

### Conditional Rendering

```tsx
function FeatureGate({ flagKey, children, fallback = null }) {
  const enabled = useFlag(flagKey, false);
  return enabled ? children : fallback;
}

// Usage
<FeatureGate flagKey="new-sidebar" fallback={<OldSidebar />}>
  <NewSidebar />
</FeatureGate>
```

### Loading States

```tsx
function App() {
  const ready = useReady();
  const error = useError();

  if (error) return <ErrorBanner message={error.message} />;
  if (!ready) return <SplashScreen />;

  return <Dashboard />;
}
```

### Development Setup

Point at your local API server:

```tsx
<FeatureSignalsProvider
  sdkKey="fs_cli_xxx"
  envKey="development"
  userKey="dev-user"
  baseURL="http://localhost:8080"
>
  <App />
</FeatureSignalsProvider>
```

## Testing

```bash
npm test
```

Tests use `@testing-library/react` with `jsdom`. You can test components that use flag hooks by wrapping them in the provider with a mocked API endpoint.

## License

Apache-2.0
