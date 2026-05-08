import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Relay Proxy", description: "Deploy the FeatureSignals Relay Proxy for edge caching, reduced latency, and high availability." };

export default function RelayProxyPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Relay Proxy</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">The relay proxy is a lightweight Go binary that caches flag values from the central FeatureSignals API and serves them locally.</p>

      <SectionHeading>Use Cases</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li><strong>Edge deployment:</strong> Run the proxy close to your application for sub-millisecond flag reads</li>
        <li><strong>On-premises:</strong> Serve flags within your private network</li>
        <li><strong>High availability:</strong> Cached flags survive brief upstream outages</li>
        <li><strong>Reduce API load:</strong> Hundreds of SDK instances connect to the proxy instead of the central API</li>
      </ul>

      <SectionHeading>Running the Relay Proxy</SectionHeading>
      <CodeBlock language="bash" code={`docker run -d \\
  -p 8090:8090 \\
  -e FS_API_KEY="fs_srv_your_key" \\
  -e FS_ENV_KEY="production" \\
  -e FS_UPSTREAM="http://your-server:8080" \\
  featuresignals-relay`} />

      <SectionHeading>Configuration</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Flag / Env Var</Th><Th>Default</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>-api-key</InlineCode> / <InlineCode>FS_API_KEY</InlineCode></Td><Td>(required)</Td><Td>Server API key</Td></Tr>
          <Tr><Td><InlineCode>-env-key</InlineCode> / <InlineCode>FS_ENV_KEY</InlineCode></Td><Td>(required)</Td><Td>Environment key</Td></Tr>
          <Tr><Td><InlineCode>-upstream</InlineCode> / <InlineCode>FS_UPSTREAM</InlineCode></Td><Td><InlineCode>https://api.featuresignals.com</InlineCode></Td><Td>Upstream API URL</Td></Tr>
          <Tr><Td><InlineCode>-port</InlineCode> / <InlineCode>FS_PORT</InlineCode></Td><Td><InlineCode>8090</InlineCode></Td><Td>Local listening port</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Connecting SDKs</SectionHeading>
      <CodeBlock language="typescript" code={`const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'production',
  baseURL: 'http://relay-proxy:8090', // ← proxy URL
});`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting" }, { label: "Configuration", href: "/docs/deployment/configuration" }].map((step) => (
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
