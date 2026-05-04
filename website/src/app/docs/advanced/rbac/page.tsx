import type { Metadata } from "next";
import Link from "next/link";
import { LightBulbIcon, ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Role-Based Access Control", description: "RBAC with owner, admin, developer, and viewer roles plus per-environment permissions." };

export default function RbacPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">Role-Based Access Control</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">FeatureSignals implements RBAC to control what team members can do within the platform.</p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)]">
        <div className="flex items-start gap-3">
          <LightBulbIcon size={18} className="text-[var(--fgColor-accent)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--fgColor-muted)]">Manage team roles in{" "}
            <a href="https://app.featuresignals.com/settings/team" className="text-[var(--fgColor-accent)] hover:underline font-medium">Settings → Team →</a>
          </p>
        </div>
      </div>

      <SectionHeading>Roles</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Role</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><strong>Owner</strong></Td><Td>Full access. Can manage billing, org settings, and all resources.</Td></Tr>
          <Tr><Td><strong>Admin</strong></Td><Td>Can manage team, API keys, webhooks, and approve changes. Cannot manage billing.</Td></Tr>
          <Tr><Td><strong>Developer</strong></Td><Td>Can create, modify, and delete flags and segments. Can submit approval requests.</Td></Tr>
          <Tr><Td><strong>Viewer</strong></Td><Td>Read-only access to all resources. Cannot make changes.</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Environment-Level Permissions</SectionHeading>
      <CodeBlock language="bash" code={`curl -X PUT https://api.featuresignals.com/v1/members/$MEMBER_ID/permissions \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"permissions": [{"env_id": "prod-id", "can_toggle": false, "can_edit_rules": false}]}'`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Audit Logging", href: "/docs/advanced/audit-logging" }, { label: "Approval Workflows", href: "/docs/advanced/approval-workflows" }].map((step) => (
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
