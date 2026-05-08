import type { Metadata } from "next";
import Link from "next/link";
import { RocketIcon, LightBulbIcon, ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "Get started with FeatureSignals in minutes. Install via Docker Compose, create your first feature flag, and evaluate it with any SDK.",
};

export default function QuickstartPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Quickstart
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Get FeatureSignals running locally in under 5 minutes using Docker Compose.
      </p>

      {/* Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <LightBulbIcon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Try without installing
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Want to explore FeatureSignals without any setup?{" "}
              <a
                href="https://app.featuresignals.com/register"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                Start a free trial
              </a>{" "}
              — sign up with your email to get full Pro access for 14 days, no credit card required.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Prerequisites */}
      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <a
            href="https://docs.docker.com/get-docker/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Docker
          </a>{" "}
          and Docker Compose v2+
        </li>
        <li>
          <a
            href="https://nodejs.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Node.js 18+
          </a>{" "}
          (for SDK integration)
        </li>
      </ul>

      {/* Section 2: Clone and Start */}
      <SectionHeading>1. Clone and Start</SectionHeading>
      <CodeBlock
        language="bash"
        code={`git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up -d`}
      />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        This starts{" "}
        <strong className="text-[var(--signal-fg-primary)]">PostgreSQL</strong> on port{" "}
        <InlineCode>5432</InlineCode>, the{" "}
        <strong className="text-[var(--signal-fg-primary)]">API Server</strong> on port{" "}
        <InlineCode>8080</InlineCode>, and the{" "}
        <strong className="text-[var(--signal-fg-primary)]">Flag Engine</strong> on port{" "}
        <InlineCode>3000</InlineCode>. Database migrations run automatically on startup.
      </p>

      {/* Section 3: Create Your Account */}
      <SectionHeading>2. Create Your Account</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Open{" "}
        <a
          href="https://app.featuresignals.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--signal-fg-accent)] hover:underline"
        >
          https://app.featuresignals.com
        </a>{" "}
        and register a new account. This creates:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Your user account</li>
        <li>A default organization</li>
        <li>
          A <strong>Default Project</strong> with three environments:{" "}
          <InlineCode>dev</InlineCode>, <InlineCode>staging</InlineCode>,{" "}
          <InlineCode>production</InlineCode>
        </li>
      </ul>

      {/* Section 4: Create a Feature Flag */}
      <SectionHeading>3. Create a Feature Flag</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          Navigate to <strong>Flags</strong> in the sidebar
        </li>
        <li>
          Click <strong>Create Flag</strong>
        </li>
        <li>
          Enter:
          <ul className="list-disc pl-6 mt-1 space-y-0.5">
            <li>
              <strong>Key</strong>: <InlineCode>new-checkout</InlineCode>
            </li>
            <li>
              <strong>Name</strong>: <InlineCode>New Checkout Flow</InlineCode>
            </li>
            <li>
              <strong>Type</strong>: <InlineCode>boolean</InlineCode>
            </li>
          </ul>
        </li>
        <li>
          Click <strong>Create</strong>
        </li>
      </ol>

      {/* Section 5: Enable the Flag */}
      <SectionHeading>4. Enable the Flag</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Open the flag detail page</li>
        <li>
          Switch to the <strong>dev</strong> environment tab
        </li>
        <li>
          Toggle the flag <strong>ON</strong>
        </li>
      </ol>

      {/* Section 6: Evaluate in Your App */}
      <SectionHeading>5. Evaluate in Your App</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-3">
        Create an API Key
      </h3>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Go to <strong>Settings</strong> → <strong>API Keys</strong>
        </li>
        <li>
          Create a <strong>server</strong> API key for the <InlineCode>dev</InlineCode> environment
        </li>
        <li>Copy the key (shown only once)</li>
      </ol>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-3">
        Install an SDK
      </h3>

      {/* SDK Tabs — rendered as labeled sections */}
      <div className="space-y-6 mb-8">
        <SdkExample
          label="Node.js"
          packageCmd="npm install @featuresignals/node"
          code={`import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('YOUR_API_KEY', {
  envKey: 'dev',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

const enabled = client.boolVariation('new-checkout', { key: 'user-123' }, false);
console.log('New checkout enabled:', enabled);`}
          language="typescript"
        />

        <SdkExample
          label="Go"
          packageCmd="go get github.com/featuresignals/sdk-go"
          code={`package main

import (
    "fmt"
    fs "github.com/featuresignals/sdk-go"
)

func main() {
    client := fs.NewClient("YOUR_API_KEY", "dev",
        fs.WithBaseURL("https://api.featuresignals.com"),
    )
    defer client.Close()
    <-client.Ready()

    enabled := client.BoolVariation("new-checkout", fs.NewContext("user-123"), false)
    fmt.Println("New checkout enabled:", enabled)
}`}
          language="go"
        />

        <SdkExample
          label="Python"
          packageCmd="pip install featuresignals"
          code={`from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "YOUR_API_KEY",
    ClientOptions(env_key="dev", base_url="https://api.featuresignals.com"),
)
client.wait_for_ready()

enabled = client.bool_variation("new-checkout", EvalContext(key="user-123"), False)
print("New checkout enabled:", enabled)`}
          language="python"
        />

        <SdkExample
          label="Java"
          packageCmd={`# Add to pom.xml:
# <dependency>
#   <groupId>com.featuresignals</groupId>
#   <artifactId>sdk-java</artifactId>
#   <version>0.1.0</version>
# </dependency>`}
          code={`import com.featuresignals.sdk.*;

var options = new ClientOptions("dev").baseURL("https://api.featuresignals.com");
var client = new FeatureSignalsClient("YOUR_API_KEY", options);
client.waitForReady(5000);

boolean enabled = client.boolVariation("new-checkout", new EvalContext("user-123"), false);
System.out.println("New checkout enabled: " + enabled);`}
          language="java"
        />

        <SdkExample
          label=".NET"
          packageCmd="dotnet add package FeatureSignals"
          code={`using FeatureSignals;

var options = new ClientOptions { EnvKey = "dev" };
using var client = new FeatureSignalsClient("YOUR_API_KEY", options);
await client.WaitForReadyAsync();

bool enabled = client.BoolVariation("new-checkout", new EvalContext("user-123"), false);
Console.WriteLine($"New checkout enabled: {enabled}");`}
          language="csharp"
        />

        <SdkExample
          label="Ruby"
          packageCmd="gem install featuresignals"
          code={`require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "dev", base_url: "https://api.featuresignals.com")
client = FeatureSignals::Client.new("YOUR_API_KEY", options)
client.wait_for_ready

enabled = client.bool_variation("new-checkout", FeatureSignals::EvalContext.new(key: "user-123"), false)
puts "New checkout enabled: #{enabled}"`}
          language="ruby"
        />

        <SdkExample
          label="React"
          packageCmd="npm install @featuresignals/react"
          code={`import { FeatureSignalsProvider, useFlag } from '@featuresignals/react';

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
}`}
          language="tsx"
        />

        <SdkExample
          label="Vue"
          packageCmd="npm install @featuresignals/vue"
          code={`// main.ts
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";

createApp(App)
  .use(FeatureSignalsPlugin, { sdkKey: "YOUR_API_KEY", envKey: "dev" })
  .mount("#app");`}
          language="typescript"
          extraCode={`<!-- In your component -->
<script setup>
import { useFlag } from "@featuresignals/vue";
const enabled = useFlag("new-checkout", false);
</script>`}
        />
      </div>

      {/* Section 7: Toggle and Observe */}
      <SectionHeading>6. Toggle and Observe</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        Go back to the Flag Engine, toggle the flag OFF, and re-run your app. The value changes
        instantly (or within the polling interval).
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/getting-started/create-your-first-flag"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>Create Your First Flag</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — deeper walkthrough
          </span>
        </li>
        <li>
          <Link
            href="/docs/core-concepts/feature-flags"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>Core Concepts</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — understand flag types, targeting, and rollouts
          </span>
        </li>
        <li>
          <Link
            href="/docs/sdks/overview"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>SDK Documentation</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — full SDK reference for all languages
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function SdkExample({
  label,
  packageCmd,
  code,
  language,
  extraCode,
}: {
  label: string;
  packageCmd: string;
  code: string;
  language: string;
  extraCode?: string;
}) {
  return (
    <div className="border border-[var(--signal-border-default)] rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)]">
        <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">{label}</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
            Install
          </span>
          <CodeBlock language="bash" code={packageCmd} className="mt-1" />
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
            Usage
          </span>
          <CodeBlock language={language} code={code} className="mt-1" />
          {extraCode && (
            <div className="mt-2">
              <CodeBlock language="html" code={extraCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
