import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "OpenFeature Integration", description: "Use FeatureSignals with the OpenFeature standard for vendor-neutral feature flag evaluation." };

export default function OpenFeaturePage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">OpenFeature Integration</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        All FeatureSignals SDKs ship with an{" "}
        <a href="https://openfeature.dev/" className="text-[var(--fgColor-accent)] hover:underline">OpenFeature</a> provider,
        giving you a vendor-neutral API for feature flag evaluation.
      </p>

      <SectionHeading>How It Works</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">Each SDK includes a <strong>local provider</strong> that bridges the FeatureSignals client to the OpenFeature API:</p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>The FeatureSignals client connects to the server, fetches flags, and keeps a local cache.</li>
        <li>The OpenFeature provider wraps that client and resolves every evaluation from the local cache — no per-evaluation network calls.</li>
        <li>Client lifecycle events (flag updates, errors) are bridged to OpenFeature provider events.</li>
      </ol>

      <SectionHeading>Go</SectionHeading>
      <CodeBlock language="go" code={`import (
    fs "github.com/featuresignals/sdk-go"
    of "github.com/open-feature/go-sdk/openfeature"
)

client := fs.NewClient("fs_srv_...", "production")
of.SetProviderAndWait(fs.NewProvider(client))

ofClient := of.NewClient("my-service")
enabled, _ := ofClient.BooleanValue(context.Background(), "dark-mode", false, of.EvaluationContext{})`} />

      <SectionHeading>Node.js</SectionHeading>
      <CodeBlock language="typescript" code={`import { FeatureSignalsClient, FeatureSignalsProvider } from "@featuresignals/node";
import { OpenFeature } from "@openfeature/server-sdk";

const fsClient = new FeatureSignalsClient("fs_srv_...", {
  envKey: "production",
});
await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));

const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue("dark-mode", false);`} />

      <SectionHeading>Resolution Details</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Field</Th><Th>Value on Success</Th><Th>Value on Error</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>value</InlineCode></Td><Td>The resolved flag value</Td><Td>The default value</Td></Tr>
          <Tr><Td><InlineCode>reason</InlineCode></Td><Td><InlineCode>CACHED</InlineCode></Td><Td><InlineCode>ERROR</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>errorCode</InlineCode></Td><Td>—</Td><Td><InlineCode>FLAG_NOT_FOUND</InlineCode> or <InlineCode>TYPE_MISMATCH</InlineCode></Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "Go SDK", href: "/docs/sdks/go" }, { label: "Node.js SDK", href: "/docs/sdks/nodejs" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--fgColor-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">{children}</h2>; }
function InlineCode({ children }: { children: React.ReactNode }) { return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">{children}</code>; }
function SimpleTable({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">{children}</th>; }
function Tr({ children }: { children: React.ReactNode }) { return <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">{children}</tr>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>; }
