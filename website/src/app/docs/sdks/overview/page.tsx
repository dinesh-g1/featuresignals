import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "SDK Overview",
  description:
    "FeatureSignals SDK overview — architecture, initialization, evaluation methods, and OpenFeature support.",
};

export default function SdkOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        SDK Overview
      </h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        FeatureSignals provides official SDKs for server-side and client-side applications. All SDKs
        follow a consistent pattern and support{" "}
        <a
          href="https://openfeature.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          OpenFeature
        </a>{" "}
        for vendor-neutral integration.
      </p>

      {/* Available SDKs */}
      <SectionHeading>Available SDKs</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>SDK</Th>
            <Th>Language</Th>
            <Th>Type</Th>
            <Th>Package</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td><Link href="/docs/sdks/go" className="text-[var(--fgColor-accent)] hover:underline font-medium">Go</Link></Td>
            <Td>Go 1.22+</Td>
            <Td>Server</Td>
            <Td><InlineCode>github.com/featuresignals/sdk-go</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/nodejs" className="text-[var(--fgColor-accent)] hover:underline font-medium">Node.js</Link></Td>
            <Td>TypeScript/Node 22+</Td>
            <Td>Server</Td>
            <Td><InlineCode>@featuresignals/node</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/python" className="text-[var(--fgColor-accent)] hover:underline font-medium">Python</Link></Td>
            <Td>Python 3.9+</Td>
            <Td>Server</Td>
            <Td><InlineCode>featuresignals</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/java" className="text-[var(--fgColor-accent)] hover:underline font-medium">Java</Link></Td>
            <Td>Java 17+</Td>
            <Td>Server</Td>
            <Td><InlineCode>com.featuresignals:sdk-java</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/dotnet" className="text-[var(--fgColor-accent)] hover:underline font-medium">.NET</Link></Td>
            <Td>.NET 8.0+ / C#</Td>
            <Td>Server</Td>
            <Td><InlineCode>FeatureSignals</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/ruby" className="text-[var(--fgColor-accent)] hover:underline font-medium">Ruby</Link></Td>
            <Td>Ruby 3.1+</Td>
            <Td>Server</Td>
            <Td><InlineCode>featuresignals</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/react" className="text-[var(--fgColor-accent)] hover:underline font-medium">React</Link></Td>
            <Td>React 18+</Td>
            <Td>Client</Td>
            <Td><InlineCode>@featuresignals/react</InlineCode></Td>
          </Tr>
          <Tr>
            <Td><Link href="/docs/sdks/vue" className="text-[var(--fgColor-accent)] hover:underline font-medium">Vue</Link></Td>
            <Td>Vue 3.3+</Td>
            <Td>Client</Td>
            <Td><InlineCode>@featuresignals/vue</InlineCode></Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* SDK Architecture */}
      <SectionHeading>SDK Architecture</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">All SDKs follow the same core design:</p>
      <CodeBlock
        language="text"
        code={`┌──────────┐    HTTP/SSE     ┌──────────────┐
│   SDK     │ ──────────────▶│  API Server   │
│           │                │  or Relay     │
│ ┌──────┐  │  initial load  └──────────────┘
│ │Cache │  │
│ └──────┘  │  polling/SSE
│           │  (background)
└──────────┘`}
      />
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mt-4 mb-6">
        <li>
          <strong>Initialize</strong> with API key and environment key
        </li>
        <li>
          <strong>First load</strong>: Fetches all flag values via{" "}
          <InlineCode>GET /v1/client/{"{envKey}"}/flags</InlineCode>
        </li>
        <li>
          <strong>Background sync</strong>: Polls at regular intervals or streams via SSE
        </li>
        <li>
          <strong>Local evaluation</strong>: Variation methods read from the in-memory cache (no
          network call)
        </li>
        <li>
          <strong>Graceful degradation</strong>: Returns fallback values on errors or before ready
        </li>
      </ol>

      {/* Common Patterns */}
      <SectionHeading>Common Patterns</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Initialization
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">All SDKs accept:</p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Option</Th>
            <Th>Default</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr><Td><InlineCode>sdkKey</InlineCode> / <InlineCode>sdk_key</InlineCode></Td><Td>(required)</Td><Td>API key for authentication</Td></Tr>
          <Tr><Td><InlineCode>envKey</InlineCode> / <InlineCode>env_key</InlineCode></Td><Td>(required)</Td><Td>Environment key</Td></Tr>
          <Tr><Td><InlineCode>baseURL</InlineCode> / <InlineCode>base_url</InlineCode></Td><Td><InlineCode>https://api.featuresignals.com</InlineCode></Td><Td>API server URL</Td></Tr>
          <Tr><Td><InlineCode>pollingInterval</InlineCode></Td><Td>30 seconds</Td><Td>How often to refresh flags</Td></Tr>
          <Tr><Td><InlineCode>streaming</InlineCode></Td><Td><InlineCode>false</InlineCode></Td><Td>Use SSE instead of polling</Td></Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Variation Methods
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Method</Th>
            <Th>Returns</Th>
            <Th>SDK Suffix</Th>
          </tr>
        </thead>
        <tbody>
          <Tr><Td>Boolean</Td><Td><InlineCode>true</InlineCode>/<InlineCode>false</InlineCode></Td><Td><InlineCode>BoolVariation</InlineCode> / <InlineCode>boolVariation</InlineCode> / <InlineCode>bool_variation</InlineCode></Td></Tr>
          <Tr><Td>String</Td><Td>Text value</Td><Td><InlineCode>StringVariation</InlineCode> / <InlineCode>stringVariation</InlineCode> / <InlineCode>string_variation</InlineCode></Td></Tr>
          <Tr><Td>Number</Td><Td>Numeric value</Td><Td><InlineCode>NumberVariation</InlineCode> / <InlineCode>numberVariation</InlineCode> / <InlineCode>number_variation</InlineCode></Td></Tr>
          <Tr><Td>JSON</Td><Td>Object/map</Td><Td><InlineCode>JSONVariation</InlineCode> / <InlineCode>jsonVariation</InlineCode> / <InlineCode>json_variation</InlineCode></Td></Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Readiness
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">
        SDKs emit a &quot;ready&quot; event after the first successful flag load:
      </p>
      <CodeBlock
        language="typescript"
        code={`// Node.js
await client.waitForReady();

// Go
<-client.Ready()

// Python
client.wait_for_ready()

// Java
client.waitForReady(5000);

// C#
await client.WaitForReadyAsync();

// Ruby
client.wait_for_ready`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Lifecycle
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">
        Always close the client when shutting down:
      </p>
      <CodeBlock
        language="typescript"
        code={`client.close();   // Node.js, Go, Java
client.close()    // Python, Ruby
client.Dispose(); // C#`}
      />

      {/* OpenFeature */}
      <SectionHeading>OpenFeature Support</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-6">
        All server SDKs include an{" "}
        <a
          href="https://openfeature.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          OpenFeature
        </a>{" "}
        provider for vendor-neutral flag consumption. See the{" "}
        <Link href="/docs/sdks/openfeature" className="text-[var(--fgColor-accent)] hover:underline">
          OpenFeature guide
        </Link>{" "}
        for details.
      </p>

      {/* API keys & HTTP */}
      <SectionHeading>API keys and HTTP behavior</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--fgColor-default)] mb-6">
        <li>
          <strong>API key expiration</strong>: Environment API keys can be created with an optional
          expiration time. Expired keys are rejected; rotate keys before they expire.
        </li>
        <li>
          <strong>SSE authentication</strong>: Passing the API key as the{" "}
          <InlineCode>api_key</InlineCode> query parameter on{" "}
          <InlineCode>GET /v1/stream/{"{envKey}"}</InlineCode> is{" "}
          <strong>deprecated</strong> and will be removed in a future version. Use the{" "}
          <InlineCode>X-API-Key</InlineCode> header instead.
        </li>
        <li>
          <strong>Rate limits</strong>: Evaluation and other rate-limited responses include{" "}
          <InlineCode>X-RateLimit-Limit</InlineCode>,{" "}
          <InlineCode>X-RateLimit-Remaining</InlineCode>, and{" "}
          <InlineCode>X-RateLimit-Reset</InlineCode>. SDKs should respect these (for example by
          backing off or reducing request frequency) to avoid <InlineCode>429</InlineCode>{" "}
          responses.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Go SDK", href: "/docs/sdks/go" },
          { label: "Node.js SDK", href: "/docs/sdks/nodejs" },
          { label: "Python SDK", href: "/docs/sdks/python" },
          { label: "React SDK", href: "/docs/sdks/react" },
          { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">
      {children}
    </code>
  );
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">{children}</tr>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>;
}
