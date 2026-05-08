import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Approval Workflows", description: "Require approval before flag changes take effect in production environments." };

export default function ApprovalWorkflowsPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Approval Workflows</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Approval workflows add a review step before flag changes are applied, providing an extra layer of safety for production environments.</p>

      <SectionHeading>How It Works</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>A developer <strong>creates an approval request</strong> with the desired change</li>
        <li>The request enters a <InlineCode>pending</InlineCode> state</li>
        <li>An admin or owner <strong>reviews</strong> the request</li>
        <li>If approved, the change is <strong>automatically applied</strong></li>
      </ol>

      <SectionHeading>Creating an Approval Request</SectionHeading>
      <CodeBlock language="bash" code={`curl -X POST https://api.featuresignals.com/v1/approvals \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"flag_id": "flag-uuid", "env_id": "production-uuid", "change_type": "enable_with_rollout", "payload": {"enabled": true, "percentage_rollout": 5000}}'`} />

      <SectionHeading>Reviewing</SectionHeading>
      <CodeBlock language="bash" code={`# Approve
curl -X POST https://api.featuresignals.com/v1/approvals/$APPROVAL_ID/review \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"action": "approve", "note": "Looks good for 50% rollout"}'

# Reject
curl -X POST https://api.featuresignals.com/v1/approvals/$APPROVAL_ID/review \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"action": "reject", "note": "Needs more testing in staging first"}'`} />

      <SectionHeading>Rules</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Only <InlineCode>pending</InlineCode> requests can be reviewed</li>
        <li><strong>Self-approval is not allowed</strong></li>
        <li>Only <InlineCode>owner</InlineCode> or <InlineCode>admin</InlineCode> roles can review</li>
      </ul>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "RBAC", href: "/docs/advanced/rbac" }, { label: "Audit Logging", href: "/docs/advanced/audit-logging" }].map((step) => (
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
