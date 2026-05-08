import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Python SDK", description: "FeatureSignals Python SDK — installation, polling, SSE streaming, and OpenFeature provider." };

export default function PythonSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Python SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Thread-safe client for evaluating feature flags in Python applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="pip install featuresignals" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Python 3.9+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="python" code={`from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "fs_srv_your_api_key",
    ClientOptions(env_key="production", base_url="https://api.featuresignals.com"),
)
client.wait_for_ready()

ctx = EvalContext(key="user-123", attributes={"country": "US"})
enabled = client.bool_variation("new-feature", ctx, False)
print(f"Feature enabled: {enabled}")

client.close()`} />

      <SectionHeading>Configuration Options</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Option</Th><Th>Type</Th><Th>Default</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>env_key</InlineCode></Td><Td><InlineCode>str</InlineCode></Td><Td>(required)</Td></Tr>
          <Tr><Td><InlineCode>base_url</InlineCode></Td><Td><InlineCode>str</InlineCode></Td><Td><InlineCode>https://api.featuresignals.com</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>polling_interval</InlineCode></Td><Td><InlineCode>float</InlineCode></Td><Td><InlineCode>30.0</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>streaming</InlineCode></Td><Td><InlineCode>bool</InlineCode></Td><Td><InlineCode>False</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>timeout</InlineCode></Td><Td><InlineCode>float</InlineCode></Td><Td><InlineCode>10.0</InlineCode></Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Variation Methods</SectionHeading>
      <CodeBlock language="python" code={`# Boolean
enabled = client.bool_variation("flag-key", ctx, False)

# String
theme = client.string_variation("theme", ctx, "light")

# Number
limit = client.number_variation("rate-limit", ctx, 100)

# JSON
config = client.json_variation("feature-config", ctx, {})`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRight size={14} /><span>{step.label}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">{children}</h2>;
}
function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">{children}</code>;
}
function SimpleTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">{children}</th>;
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
