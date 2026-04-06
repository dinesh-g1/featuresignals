---
sidebar_position: 6
title: React SDK
---

# React SDK

The React SDK provides React components and hooks for evaluating feature flags in React applications.

## Installation

```bash
npm install @featuresignals/react
```

**Requirements**: React 18+

## Quick Start

### 1. Wrap Your App

```tsx
import { FeatureSignalsProvider } from '@featuresignals/react';

function App() {
  return (
    <FeatureSignalsProvider
      sdkKey="fs_cli_your_client_key"
      envKey="production"
      baseURL="https://api.featuresignals.com" // For self-hosted, use your own API URL
      userKey="user-123"
    >
      <YourApp />
    </FeatureSignalsProvider>
  );
}
```

### 2. Use Hooks

```tsx
import { useFlag, useReady } from '@featuresignals/react';

function MyComponent() {
  const ready = useReady();
  const darkMode = useFlag('dark-mode', false);

  if (!ready) return <div>Loading...</div>;

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <h1>Dark mode is {darkMode ? 'on' : 'off'}</h1>
    </div>
  );
}
```

## Provider Props

```tsx
<FeatureSignalsProvider
  sdkKey="fs_cli_..."         // Required: client API key
  envKey="production"          // Required: environment slug
  baseURL="https://api.featuresignals.com" // API server URL (optional); for self-hosted, use your own API URL
  userKey="user-123"          // User identifier (default: "anonymous")
  pollingIntervalMs={30000}   // Polling interval (default: 30000, 0 to disable)
  streaming={false}           // Use SSE (default: false)
>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sdkKey` | `string` | (required) | Client API key (e.g., `fs_cli_...`) |
| `envKey` | `string` | (required) | Environment slug |
| `baseURL` | `string` | `https://api.featuresignals.com` | API server URL |
| `userKey` | `string` | `"anonymous"` | User identifier |
| `pollingIntervalMs` | `number` | `30000` | Polling interval (0 = disabled when not streaming) |
| `streaming` | `boolean` | `false` | Enable SSE streaming |

## Hooks

### `useFlag<T>(key, fallback)`

Returns the value of a feature flag. Falls back to the provided default if the flag doesn't exist or isn't loaded yet.

```tsx
const enabled = useFlag('my-flag', false);         // boolean
const theme = useFlag<string>('theme', 'light');    // string
const limit = useFlag<number>('rate-limit', 100);   // number
```

### `useFlags()`

Returns all flag values as a `Record<string, unknown>`.

```tsx
const flags = useFlags();
console.log(flags['my-flag']); // flag value
```

### `useReady()`

Returns `true` once the initial flag load completes.

```tsx
const ready = useReady();
if (!ready) return <Spinner />;
```

### `useError()`

Returns the last error encountered during flag fetching, or `null`.

```tsx
const error = useError();
if (error) return <ErrorBanner message={error.message} />;
```

## Streaming

Enable SSE for real-time updates:

```tsx
<FeatureSignalsProvider
  sdkKey="fs_cli_..."
  envKey="production"
  streaming={true}
>
```

When streaming is enabled, the provider:
1. Opens an SSE connection to `/v1/stream/{envKey}`
2. Listens for `flag-update` events
3. Automatically refetches flags when notified
4. Falls back to polling if `EventSource` is unavailable

## Conditional Rendering

```tsx
function PricingPage() {
  const newPricing = useFlag('new-pricing-page', false);

  if (newPricing) {
    return <NewPricingPage />;
  }
  return <OldPricingPage />;
}
```

## Dynamic User Key

Update the user key for targeting after authentication:

```tsx
function App() {
  const [userId, setUserId] = useState('anonymous');

  return (
    <FeatureSignalsProvider
      sdkKey="fs_cli_..."
      envKey="production"
      userKey={userId}
    >
      <LoginForm onLogin={(id) => setUserId(id)} />
      <MainApp />
    </FeatureSignalsProvider>
  );
}
```

When `userKey` changes, the provider refetches flags for the new user.

## OpenFeature

This SDK includes an optional OpenFeature web provider. See the [OpenFeature Integration](./openfeature.md) page for details. Install `@openfeature/web-sdk` and use `FeatureSignalsWebProvider`.
