import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Java SDK", description: "FeatureSignals Java SDK — Maven setup, polling, SSE, and OpenFeature provider." };

export default function JavaSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Java SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Thread-safe client for evaluating feature flags in Java applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="xml" code={`<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0</version>
</dependency>`} />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Java 17+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="java" code={`import com.featuresignals.sdk.*;

var options = new ClientOptions("production")
    .baseURL("https://api.featuresignals.com");

var client = new FeatureSignalsClient("fs_srv_your_api_key", options);
client.waitForReady(5000);

var ctx = new EvalContext("user-123")
    .withAttribute("country", "US")
    .withAttribute("plan", "enterprise");

boolean enabled = client.boolVariation("new-feature", ctx, false);
System.out.println("Feature enabled: " + enabled);

client.close();`} />

      <SectionHeading>Variation Methods</SectionHeading>
      <CodeBlock language="java" code={`// Boolean
boolean enabled = client.boolVariation("flag-key", ctx, false);

// String
String theme = client.stringVariation("theme", ctx, "light");

// Number (returns double)
double limit = client.numberVariation("rate-limit", ctx, 100.0);

// JSON
MyConfig config = client.jsonVariation("feature-config", ctx, defaultConfig);`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRight size={14} /><span>{step.label}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">{children}</h2>; }
function InlineCode({ children }: { children: React.ReactNode }) { return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">{children}</code>; }
function SimpleTable({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">{children}</th>; }
function Tr({ children }: { children: React.ReactNode }) { return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>; }
