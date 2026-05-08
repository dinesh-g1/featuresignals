import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "SOC 2 Controls Matrix", description: "FeatureSignals SOC 2 Trust Service Criteria controls matrix mapping technical controls to audit requirements." };

export default function Soc2Page() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">SOC 2 Controls Matrix</h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">Last updated: April 2026</p>
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <p className="text-sm text-[var(--signal-fg-secondary)]">This document maps SOC 2 Trust Service Criteria to technical controls. A formal SOC 2 Type II audit is on our roadmap.</p>
      </div>

      <SectionHeading>CC6 — Logical and Physical Access</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Criteria</Th><Th>Control</Th><Th>Implementation</Th></tr></thead>
        <tbody>
          <Tr><Td>CC6.1</Td><Td>Logical access</Td><Td>JWT authentication, API key authentication</Td></Tr>
          <Tr><Td>CC6.2</Td><Td>Access provisioning</Td><Td>RBAC (owner/admin/developer/viewer), SSO/SCIM</Td></Tr>
          <Tr><Td>CC6.3</Td><Td>Access removal</Td><Td>Team member removal, API key revocation</Td></Tr>
          <Tr><Td>CC6.5</Td><Td>Authentication</Td><Td>MFA (TOTP), SSO (SAML/OIDC), password policies</Td></Tr>
          <Tr><Td>CC6.6</Td><Td>Access controls</Td><Td>IP allowlisting, rate limiting</Td></Tr>
          <Tr><Td>CC6.7</Td><Td>Information protection</Td><Td>TLS 1.3, AES-256 at rest, bcrypt passwords</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>CC7 — System Operations</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Criteria</Th><Th>Control</Th><Th>Implementation</Th></tr></thead>
        <tbody>
          <Tr><Td>CC7.1</Td><Td>Monitoring</Td><Td>Structured logging, metrics, health checks</Td></Tr>
          <Tr><Td>CC7.3</Td><Td>Security events</Td><Td>Audit log with IP/user agent, integrity hashing</Td></Tr>
          <Tr><Td>CC7.4</Td><Td>Incident response</Td><Td>Incident response plan, on-call procedures</Td></Tr>
          <Tr><Td>CC7.5</Td><Td>Recovery</Td><Td>Backup procedures, disaster recovery runbook</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>CC8 — Change Management</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Criteria</Th><Th>Control</Th><Th>Implementation</Th></tr></thead>
        <tbody>
          <Tr><Td>CC8.1</Td><Td>Change management</Td><Td>Git-based workflow, PR reviews, CI/CD</Td></Tr>
          <Tr><Td>CC8.2</Td><Td>Change testing</Td><Td>Automated test suite (80%+ coverage), staging environment</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "GDPR", href: "/docs/compliance/gdpr" }, { label: "HIPAA", href: "/docs/compliance/hipaa" }, { label: "Security Overview", href: "/docs/compliance/security-overview" }].map((step) => (
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
