import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Audit Logging", description: "Tamper-evident audit log tracking all flag changes with before/after state diffs and actor information." };

export default function AuditLoggingPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Audit Logging</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">FeatureSignals maintains a comprehensive audit log that records all changes to flags, environments, and team configuration. The log is tamper-evident and includes before/after state diffs.</p>

      <SectionHeading>What&apos;s Logged</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Action</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>flag.created</InlineCode></Td><Td>New flag created</Td></Tr>
          <Tr><Td><InlineCode>flag.updated</InlineCode></Td><Td>Flag metadata changed</Td></Tr>
          <Tr><Td><InlineCode>flag.deleted</InlineCode></Td><Td>Flag deleted</Td></Tr>
          <Tr><Td><InlineCode>flag.killed</InlineCode></Td><Td>Kill switch activated</Td></Tr>
          <Tr><Td><InlineCode>api_key.created</InlineCode></Td><Td>API key created</Td></Tr>
          <Tr><Td><InlineCode>api_key.revoked</InlineCode></Td><Td>API key revoked</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Before/After State Diffs</SectionHeading>
      <CodeBlock language="json" code={`{
  "action": "flag.updated",
  "before_state": { "name": "Old Name", "tags": ["beta"] },
  "after_state": { "name": "New Name", "tags": ["beta", "production"] }
}`} />

      <SectionHeading>Viewing the Audit Log</SectionHeading>
      <CodeBlock language="bash" code={`curl "https://api.featuresignals.com/v1/audit?limit=50&offset=0" \\
  -H "Authorization: Bearer $TOKEN"`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Webhooks", href: "/docs/advanced/webhooks" }, { label: "RBAC", href: "/docs/advanced/rbac" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
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
