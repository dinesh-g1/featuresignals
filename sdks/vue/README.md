# @featuresignals/vue

Official Vue 3 SDK for [FeatureSignals](https://featuresignals.com) — feature flags and remote configuration with real-time updates.

## Installation

```bash
npm install @featuresignals/vue
```

> **Peer dependency:** Vue 3.3+

## Quick Start

### 1. Register the Plugin

In your `main.ts`:

```typescript
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";
import App from "./App.vue";

const app = createApp(App);

app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_your_key_here",
  envKey: "production",
});

app.mount("#app");
```

### 2. Use Composables in Components

```vue
<script setup lang="ts">
import { useFlag, useReady } from "@featuresignals/vue";

const darkMode = useFlag("dark-mode", false);
const ready = useReady();
</script>

<template>
  <div v-if="!ready">Loading flags…</div>
  <div v-else :class="{ dark: darkMode }">
    <p>Dark mode is {{ darkMode ? "on" : "off" }}</p>
  </div>
</template>
```

## OpenFeature Usage

FeatureSignals integrates with the [OpenFeature](https://openfeature.dev) standard. Install the OpenFeature Web SDK and register the FeatureSignals provider:

```ts
import { OpenFeature } from "@openfeature/web-sdk"; // npm install @openfeature/web-sdk
import { createOpenFeatureProvider } from "@featuresignals/vue";

const provider = createOpenFeatureProvider({
  sdkKey: "fs_cli_...",
  envKey: "production",
});
await OpenFeature.setProviderAndWait(provider);
const client = OpenFeature.getClient();
const enabled = client.getBooleanValue("dark-mode", false);
```

## API Reference

### `FeatureSignalsPlugin`

Vue 3 plugin. Register via `app.use()`.

#### Options

| Option              | Type      | Default                              | Description                              |
| ------------------- | --------- | ------------------------------------ | ---------------------------------------- |
| `sdkKey`            | `string`  | **(required)**                       | Client-side API key (`fs_cli_...`)       |
| `envKey`            | `string`  | **(required)**                       | Environment slug (e.g. `"production"`)   |
| `baseURL`           | `string`  | `"https://api.featuresignals.com"`   | API base URL                             |
| `userKey`           | `string`  | `"anonymous"`                        | User key for targeting                   |
| `pollingIntervalMs` | `number`  | `30000`                              | Polling interval in ms. `0` to disable   |
| `streaming`         | `boolean` | `false`                              | Enable SSE streaming (disables polling)  |

### Composables

All composables return a `ComputedRef` for full Vue reactivity.

#### `useFlag<T>(key: string, fallback: T): ComputedRef<T>`

Returns the value of a single flag, or `fallback` if the flag is not yet loaded or doesn't exist.

```typescript
const darkMode = useFlag("dark-mode", false);
const banner = useFlag<string>("banner-text", "Welcome!");
const maxItems = useFlag("max-items", 10);
```

#### `useFlags(): ComputedRef<Record<string, unknown>>`

Returns the full flag map.

```typescript
const flags = useFlags();
// flags.value => { "dark-mode": true, "banner-text": "Hello", ... }
```

#### `useReady(): ComputedRef<boolean>`

Returns `true` once the initial flag fetch has completed.

```typescript
const ready = useReady();
```

#### `useError(): ComputedRef<Error | null>`

Returns the last fetch error, or `null` if no error.

```typescript
const error = useError();
```

## Usage Patterns

### SSE Streaming

Enable real-time flag updates via Server-Sent Events:

```typescript
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_your_key_here",
  envKey: "production",
  streaming: true,
});
```

When streaming is enabled, polling is automatically disabled. Flags are refetched whenever a `flag-update` event arrives.

### Loading States

```vue
<script setup lang="ts">
import { useReady, useError, useFlag } from "@featuresignals/vue";

const ready = useReady();
const error = useError();
const feature = useFlag("new-feature", false);
</script>

<template>
  <div v-if="error">Error: {{ error.message }}</div>
  <div v-else-if="!ready">Loading…</div>
  <div v-else>
    <NewFeature v-if="feature" />
    <LegacyFeature v-else />
  </div>
</template>
```

### Custom User Key

Pass a user identifier for targeted flag evaluation:

```typescript
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_your_key_here",
  envKey: "production",
  userKey: currentUser.id,
});
```

## Testing

Use `app.provide()` to inject mock state in tests:

```typescript
import { mount } from "@vue/test-utils";
import { FEATURE_SIGNALS_KEY } from "@featuresignals/vue";

mount(MyComponent, {
  global: {
    provide: {
      [FEATURE_SIGNALS_KEY as symbol]: {
        flags: { "dark-mode": true },
        ready: true,
        error: null,
      },
    },
  },
});
```

## License

Apache-2.0
