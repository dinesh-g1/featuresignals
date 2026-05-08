import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Webhooks", description: "Configure webhook endpoints to receive real-time notifications when feature flags change." };

export default function WebhooksPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Webhooks</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Webhooks notify external systems when flag changes occur. Use them to trigger CI/CD pipelines, send Slack notifications, or sync with other tools.</p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Lightbulb size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--signal-fg-secondary)]">Configure webhooks in{" "}
            <a href="https://app.featuresignals.com/settings/webhooks" className="text-[var(--signal-fg-accent)] hover:underline font-medium">Settings → Webhooks →</a>
          </p>
        </div>
      </div>

      <SectionHeading>Event Types</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Event</Th><Th>When</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>flag.created</InlineCode></Td><Td>A new flag is created</Td></Tr>
          <Tr><Td><InlineCode>flag.updated</InlineCode></Td><Td>Flag metadata is updated</Td></Tr>
          <Tr><Td><InlineCode>flag.deleted</InlineCode></Td><Td>A flag is deleted</Td></Tr>
          <Tr><Td><InlineCode>flag.killed</InlineCode></Td><Td>Kill switch activated</Td></Tr>
          <Tr><Td><InlineCode>flag.promoted</InlineCode></Td><Td>Flag promoted between environments</Td></Tr>
          <Tr><Td><InlineCode>*</InlineCode></Td><Td>All events</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Payload Format</SectionHeading>
      <CodeBlock language="json" code={`{
  "type": "flag.updated",
  "flag_id": "uuid",
  "env_id": "uuid",
  "timestamp": "2026-04-01T12:00:00Z"
}`} />

      <SectionHeading>Signature Verification</SectionHeading>
      <CodeBlock language="python" code={`import hmac, hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Audit Logging", href: "/docs/advanced/audit-logging" }, { label: "RBAC", href: "/docs/advanced/rbac" }].map((step) => (
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
