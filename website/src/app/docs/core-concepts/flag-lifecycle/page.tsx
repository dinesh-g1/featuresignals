import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Flag Lifecycle",
  description: "Track feature flags through active, rolled out, deprecated, and archived lifecycle stages.",
};

export default function FlagLifecyclePage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Flag Lifecycle</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Feature flags have a lifecycle from creation to retirement. Managing this lifecycle is critical to avoiding technical debt.</p>

      <SectionHeading>Status Model</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Status</Th><Th>Meaning</Th><Th>Next Steps</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>active</InlineCode></Td><Td>Flag is in use and being evaluated</Td><Td>Monitor, iterate, or roll out</Td></Tr>
          <Tr><Td><InlineCode>rolled_out</InlineCode></Td><Td>Feature fully enabled for all users</Td><Td>Remove flag from code, then deprecate</Td></Tr>
          <Tr><Td><InlineCode>deprecated</InlineCode></Td><Td>Flag is scheduled for removal</Td><Td>Delete after confirming no SDK references</Td></Tr>
          <Tr><Td><InlineCode>archived</InlineCode></Td><Td>Flag retained for audit purposes only</Td><Td>No action needed</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Lifecycle Stages</SectionHeading>
      <CodeBlock language="text" code={`Created → Configured → Enabled (Dev) → Enabled (Staging) → Enabled (Production) → Fully Rolled Out → Archived/Deleted`} />

      <SectionHeading>Cleanup Timelines by Category</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Category</Th><Th>Expected Cleanup Timeline</Th></tr></thead>
        <tbody>
          <Tr><Td>Release</Td><Td>Days to weeks after full rollout</Td></Tr>
          <Tr><Td>Experiment</Td><Td>After experiment concludes and winner is declared</Td></Tr>
          <Tr><Td>Ops</Td><Td>Rarely — ops flags are often long-lived</Td></Tr>
          <Tr><Td>Permission</Td><Td>Rarely — permission flags may be permanent</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Flag Expiration</SectionHeading>
      <CodeBlock language="bash" code={`curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"expires_at": "2026-06-01T00:00:00Z"}'`} />

      <SectionHeading>Kill Switch</SectionHeading>
      <CodeBlock language="bash" code={`curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/kill \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"env_id": "production-id"}'`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Toggle Categories", href: "/docs/core-concepts/toggle-categories" }, { label: "Scheduling", href: "/docs/advanced/scheduling" }].map((step) => (
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
