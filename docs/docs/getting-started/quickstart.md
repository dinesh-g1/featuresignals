---
sidebar_position: 1
title: Quickstart
---

# Quickstart

Get FeatureSignals running locally in under 5 minutes using Docker Compose.

:::tip Try without installing
Want to explore FeatureSignals without any setup? Try the **[live demo](https://demo.featuresignals.com/demo)** — full access with sample data, no account required. Your data is kept for 7 days.
:::

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+
- [Node.js 18+](https://nodejs.org/) (for SDK integration)

## 1. Clone and Start

```bash
git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **API Server** on port `8080`
- **Flag Engine** on port `3000`

Database migrations run automatically on startup.

## 2. Create Your Account

Open [http://localhost:3000](http://localhost:3000) and register a new account. This creates:
- Your user account
- A default organization
- A **Default Project** with three environments: `dev`, `staging`, `production`

## 3. Create a Feature Flag

1. Navigate to **Flags** in the sidebar
2. Click **Create Flag**
3. Enter:
   - **Key**: `new-checkout`
   - **Name**: `New Checkout Flow`
   - **Type**: `boolean`
4. Click **Create**

## 4. Enable the Flag

1. Open the flag detail page
2. Switch to the **dev** environment tab
3. Toggle the flag **ON**

## 5. Evaluate in Your App

### Create an API Key

1. Go to **Settings** → **API Keys**
2. Create a **server** API key for the `dev` environment
3. Copy the key (shown only once)

### Install an SDK

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="node" label="Node.js" default>

```bash
npm install @featuresignals/node
```

```typescript
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('YOUR_API_KEY', {
  envKey: 'dev',
  baseURL: 'http://localhost:8080',
});

await client.waitForReady();

const enabled = client.boolVariation('new-checkout', { key: 'user-123' }, false);
console.log('New checkout enabled:', enabled);
```

</TabItem>
<TabItem value="go" label="Go">

```bash
go get github.com/featuresignals/sdk-go
```

```go
package main

import (
    "fmt"
    fs "github.com/featuresignals/sdk-go"
)

func main() {
    client := fs.NewClient("YOUR_API_KEY", "dev",
        fs.WithBaseURL("http://localhost:8080"),
    )
    defer client.Close()
    <-client.Ready()

    enabled := client.BoolVariation("new-checkout", fs.NewContext("user-123"), false)
    fmt.Println("New checkout enabled:", enabled)
}
```

</TabItem>
<TabItem value="python" label="Python">

```bash
pip install featuresignals
```

```python
from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "YOUR_API_KEY",
    ClientOptions(env_key="dev", base_url="http://localhost:8080"),
)
client.wait_for_ready()

enabled = client.bool_variation("new-checkout", EvalContext(key="user-123"), False)
print("New checkout enabled:", enabled)
```

</TabItem>
<TabItem value="java" label="Java">

```xml
<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0</version>
</dependency>
```

```java
import com.featuresignals.sdk.*;

var options = new ClientOptions("dev").baseURL("http://localhost:8080");
var client = new FeatureSignalsClient("YOUR_API_KEY", options);
client.waitForReady(5000);

boolean enabled = client.boolVariation("new-checkout", new EvalContext("user-123"), false);
System.out.println("New checkout enabled: " + enabled);
```

</TabItem>
<TabItem value="dotnet" label=".NET">

```bash
dotnet add package FeatureSignals
```

```csharp
using FeatureSignals;

var options = new ClientOptions { EnvKey = "dev" };
using var client = new FeatureSignalsClient("YOUR_API_KEY", options);
await client.WaitForReadyAsync();

bool enabled = client.BoolVariation("new-checkout", new EvalContext("user-123"), false);
Console.WriteLine($"New checkout enabled: {enabled}");
```

</TabItem>
<TabItem value="ruby" label="Ruby">

```bash
gem install featuresignals
```

```ruby
require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "dev", base_url: "http://localhost:8080")
client = FeatureSignals::Client.new("YOUR_API_KEY", options)
client.wait_for_ready

enabled = client.bool_variation("new-checkout", FeatureSignals::EvalContext.new(key: "user-123"), false)
puts "New checkout enabled: #{enabled}"
```

</TabItem>
<TabItem value="react" label="React">

```bash
npm install @featuresignals/react
```

```tsx
import { FeatureSignalsProvider, useFlag } from '@featuresignals/react';

function App() {
  return (
    <FeatureSignalsProvider sdkKey="YOUR_API_KEY" envKey="dev">
      <Checkout />
    </FeatureSignalsProvider>
  );
}

function Checkout() {
  const enabled = useFlag('new-checkout', false);
  return <div>New checkout: {enabled ? 'v2' : 'v1'}</div>;
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```bash
npm install @featuresignals/vue
```

```typescript
// main.ts
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";

createApp(App)
  .use(FeatureSignalsPlugin, { sdkKey: "YOUR_API_KEY", envKey: "dev" })
  .mount("#app");
```

```vue
<script setup>
import { useFlag } from "@featuresignals/vue";
const enabled = useFlag("new-checkout", false);
</script>
```

</TabItem>
</Tabs>

## 6. Toggle and Observe

Go back to the Flag Engine, toggle the flag OFF, and re-run your app. The value changes instantly (or within the polling interval).

## Next Steps

- [Create Your First Flag](/getting-started/create-your-first-flag) — deeper walkthrough
- [Core Concepts](/core-concepts/feature-flags) — understand flag types, targeting, and rollouts
- [SDK Documentation](/sdks/overview) — full SDK reference for all languages
