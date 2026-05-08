import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Node.js SDK", description: "FeatureSignals Node.js SDK — installation, TypeScript support, polling, SSE, and OpenFeature provider." };

export default function NodejsSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Node.js SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">TypeScript-first client for evaluating feature flags in Node.js applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="npm install @featuresignals/node" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Node.js 22+, ESM</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="typescript" code={`import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_your_api_key', {
  envKey: 'production',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

const enabled = client.boolVariation('new-feature', { key: 'user-123' }, false);
console.log('Feature enabled:', enabled);

// When shutting down
client.close();`} />

      <SectionHeading>Configuration Options</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Option</Th><Th>Type</Th><Th>Default</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>envKey</InlineCode></Td><Td><InlineCode>string</InlineCode></Td><Td>(required)</Td></Tr>
          <Tr><Td><InlineCode>baseURL</InlineCode></Td><Td><InlineCode>string</InlineCode></Td><Td><InlineCode>https://api.featuresignals.com</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>pollingIntervalMs</InlineCode></Td><Td><InlineCode>number</InlineCode></Td><Td><InlineCode>30000</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>streaming</InlineCode></Td><Td><InlineCode>boolean</InlineCode></Td><Td><InlineCode>false</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>timeoutMs</InlineCode></Td><Td><InlineCode>number</InlineCode></Td><Td><InlineCode>10000</InlineCode></Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Events</SectionHeading>
      <CodeBlock language="typescript" code={`client.on('ready', () => console.log('Flags loaded'));
client.on('error', (err) => console.error('Fetch failed:', err));
client.on('update', (flags) => console.log('Updated:', Object.keys(flags).length));`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
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
