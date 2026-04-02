---
sidebar_position: 8
title: Vue SDK
---

# Vue SDK

The Vue SDK provides composables for evaluating feature flags in Vue 3 applications using the Composition API.

## Installation

```bash
npm install @featuresignals/vue
```

**Requirements**: Vue 3.3+

## Quick Start

Register the plugin in your app entry:

```typescript
// main.ts
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";
import App from "./App.vue";

const app = createApp(App);
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_your_api_key",
  envKey: "production",
});
app.mount("#app");
```

Use composables in any component:

```vue
<script setup lang="ts">
import { useFlag, useReady } from "@featuresignals/vue";

const showCheckout = useFlag("new-checkout", false);
const ready = useReady();
</script>

<template>
  <LoadingSpinner v-if="!ready" />
  <NewCheckout v-else-if="showCheckout" />
  <OldCheckout v-else />
</template>
```

## Plugin Options

```typescript
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_xxx",
  envKey: "production",
  baseURL: "http://localhost:8080",
  userKey: "user-42",
  pollingIntervalMs: 15000,
  streaming: true,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sdkKey` | `string` | (required) | Client API key |
| `envKey` | `string` | (required) | Environment slug |
| `baseURL` | `string` | `https://api.featuresignals.com` | API server URL |
| `userKey` | `string` | `"anonymous"` | User key for evaluation |
| `pollingIntervalMs` | `number` | `30000` | Polling interval (0 to disable) |
| `streaming` | `boolean` | `false` | Enable SSE for real-time updates |

## Composables

### `useFlag<T>(key, fallback): ComputedRef<T>`

Returns a computed ref with the flag value, or the fallback if the flag is not found or not yet loaded.

```vue
<script setup>
import { useFlag } from "@featuresignals/vue";

const darkMode = useFlag("dark-mode", false);
const banner = useFlag("banner-text", "Welcome!");
const limit = useFlag("request-limit", 100);
</script>
```

### `useFlags(): ComputedRef<Record<string, unknown>>`

Returns a computed ref with the full flag map.

```vue
<script setup>
import { useFlags } from "@featuresignals/vue";
const flags = useFlags();
</script>
```

### `useReady(): ComputedRef<boolean>`

Returns `true` once the initial flag fetch has completed.

```vue
<script setup>
import { useReady } from "@featuresignals/vue";
const ready = useReady();
</script>

<template>
  <div v-if="!ready">Loading flags...</div>
</template>
```

### `useError(): ComputedRef<Error | null>`

Returns the latest fetch error, or `null`.

```vue
<script setup>
import { useError } from "@featuresignals/vue";
const error = useError();
</script>

<template>
  <div v-if="error" class="error">{{ error.message }}</div>
</template>
```

## SSE Streaming

For real-time flag updates without polling:

```typescript
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_xxx",
  envKey: "production",
  streaming: true,
});
```

When a flag changes in the dashboard, all connected Vue apps receive the update within seconds via Server-Sent Events.

## Feature Gate Component

You can create a simple feature gate component:

```vue
<!-- FeatureGate.vue -->
<script setup lang="ts">
import { useFlag } from "@featuresignals/vue";

const props = defineProps<{ flagKey: string }>();
const enabled = useFlag(props.flagKey, false);
</script>

<template>
  <slot v-if="enabled" />
  <slot v-else name="fallback" />
</template>
```

Usage:

```vue
<FeatureGate flagKey="new-sidebar">
  <NewSidebar />
  <template #fallback>
    <OldSidebar />
  </template>
</FeatureGate>
```

## Nuxt 3

Create a plugin at `plugins/featuresignals.ts`:

```typescript
import { FeatureSignalsPlugin } from "@featuresignals/vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(FeatureSignalsPlugin, {
    sdkKey: useRuntimeConfig().public.fsApiKey,
    envKey: useRuntimeConfig().public.fsEnvKey,
    streaming: true,
  });
});
```

## Testing

Mock the injection key in tests:

```typescript
import { mount } from "@vue/test-utils";
import { FEATURE_SIGNALS_KEY } from "@featuresignals/vue";

const wrapper = mount(MyComponent, {
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
