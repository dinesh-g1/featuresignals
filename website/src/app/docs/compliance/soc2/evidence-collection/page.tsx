import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, Database, FileCheck, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "SOC 2 Evidence Collection",
  description:
    "How FeatureSignals collects and maintains SOC 2 evidence — automated controls testing, audit trail integrity, and evidence retention policies.",
};

export default function Soc2EvidenceCollectionPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        SOC 2 Evidence Collection
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        SOC 2 audits require extensive evidence that controls are designed
        appropriately and operating effectively over time. FeatureSignals
        automates evidence collection wherever possible, reducing the burden of
        audit preparation while maintaining a continuously audit-ready posture.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <ClipboardCheck size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Continuous Audit Readiness
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Our goal is to be audit-ready every day, not just during audit
              season. Automated evidence collection runs continuously so that
              audit evidence is always current and complete.
            </p>
          </div>
        </div>
      </div>

      {/* Evidence Categories */}
      <SectionHeading>Evidence Categories</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        SOC 2 evidence falls into four categories. FeatureSignals collects each
        systematically:
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        1. Design Evidence — &ldquo;The control exists&rdquo;
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Architecture diagrams and data flow documentation</li>
        <li>Security policy documents and standards</li>
        <li>RBAC role definitions and permission matrices</li>
        <li>Encryption standards and key management policies</li>
        <li>Network diagrams and firewall rule documentation</li>
      </ul>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Source: Architecture wiki, CLAUDE.md, security documentation
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        2. Operating Evidence — &ldquo;The control is running&rdquo;
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control Area</Th>
            <Th>Automated Evidence</Th>
            <Th>Collection Frequency</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Access provisioning</Td>
            <Td>Team member audit log (add/remove/role change)</Td>
            <Td>Real-time</Td>
          </Tr>
          <Tr>
            <Td>Authentication</Td>
            <Td>Login success/failure logs, MFA enrollment status</Td>
            <Td>Real-time</Td>
          </Tr>
          <Tr>
            <Td>Change management</Td>
            <Td>PR reviews, CI/CD pipeline logs, deployment records</Td>
            <Td>Per change</Td>
          </Tr>
          <Tr>
            <Td>Vulnerability scanning</Td>
            <Td>govulncheck reports, npm audit output, dependency scan results</Td>
            <Td>Daily (CI), weekly (full scan)</Td>
          </Tr>
          <Tr>
            <Td>Backup verification</Td>
            <Td>Backup completion logs, restore test results</Td>
            <Td>Daily (backup), quarterly (restore test)</Td>
          </Tr>
          <Tr>
            <Td>Availability monitoring</Td>
            <Td>Uptime metrics, health check logs, incident records</Td>
            <Td>Continuous</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        3. Testing Evidence — &ldquo;We verify the control works&rdquo;
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Automated test suite results (80%+ coverage, CI-enforced)</li>
        <li>Penetration test reports (annual, third-party)</li>
        <li>Disaster recovery test results (quarterly)</li>
        <li>Access review attestations (quarterly)</li>
        <li>Tabletop exercise outcomes (semi-annual incident response drills)</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        4. Remediation Evidence — &ldquo;We fix what breaks&rdquo;
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Incident post-mortems with root cause analysis</li>
        <li>Vulnerability remediation timelines</li>
        <li>Configuration drift correction records</li>
        <li>Access removal confirmation timestamps</li>
      </ul>

      {/* Audit Trail */}
      <SectionHeading>Audit Trail Architecture</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The audit trail is the backbone of SOC 2 evidence collection. Every
        mutating operation in FeatureSignals produces an immutable audit record:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Field</Th>
            <Th>Description</Th>
            <Th>Retention</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Timestamp</Td>
            <Td>UTC, RFC 3339 format</Td>
            <Td>Permanent</Td>
          </Tr>
          <Tr>
            <Td>Actor</Td>
            <Td>User ID, email, role</Td>
            <Td>Permanent</Td>
          </Tr>
          <Tr>
            <Td>Action</Td>
            <Td>Resource type, action name, resource ID</Td>
            <Td>Permanent</Td>
          </Tr>
          <Tr>
            <Td>Before/After</Td>
            <Td>State diff for modifications</Td>
            <Td>Permanent</Td>
          </Tr>
          <Tr>
            <Td>Client</Td>
            <Td>IP address, user agent</Td>
            <Td>1 year (GDPR-minimized)</Td>
          </Tr>
          <Tr>
            <Td>Integrity Hash</Td>
            <Td>SHA-256 chain-linked to previous entry</Td>
            <Td>Permanent</Td>
          </Tr>
        </tbody>
      </SimpleTable>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        The chain-linked SHA-256 hashing ensures that any tampering with the
        audit trail is detectable — each entry&apos;s hash depends on the
        previous entry&apos;s hash, creating a cryptographic chain of custody.
      </p>

      {/* Evidence Retention */}
      <SectionHeading>Evidence Retention Policy</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Evidence Type</Th>
            <Th>Retention Period</Th>
            <Th>Storage</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Audit logs</Td>
            <Td>Minimum 1 year (SOC 2 requirement)</Td>
            <Td>Database (active), encrypted backups (archive)</Td>
          </Tr>
          <Tr>
            <Td>Access review records</Td>
            <Td>3 years</Td>
            <Td>Database + export archive</Td>
          </Tr>
          <Tr>
            <Td>Incident reports</Td>
            <Td>7 years</Td>
            <Td>Secure document store</Td>
          </Tr>
          <Tr>
            <Td>Vulnerability scans</Td>
            <Td>3 years</Td>
            <Td>CI artifact storage</Td>
          </Tr>
          <Tr>
            <Td>DR test results</Td>
            <Td>3 years</Td>
            <Td>Secure document store</Td>
          </Tr>
          <Tr>
            <Td>Change management records</Td>
            <Td>Indefinite (git history)</Td>
            <Td>Git repository</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Automation */}
      <SectionHeading>Automated Controls Testing</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To reduce the manual burden of evidence collection, FeatureSignals
        automates control testing where possible:
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          {
            icon: RefreshCw,
            title: "CI-Enforced Controls",
            desc: "Test coverage gates, dependency vulnerability scans, and code quality checks run on every PR — no merge without passing.",
          },
          {
            icon: Clock,
            title: "Scheduled Attestations",
            desc: "Quarterly access reviews, semi-annual DR tests, and annual pen tests are scheduled with automated reminders and evidence capture.",
          },
          {
            icon: Database,
            title: "Automated Collection",
            desc: "Metrics, logs, and audit records are collected continuously. Evidence packages are auto-generated for each control period.",
          },
          {
            icon: FileCheck,
            title: "Evidence Packaging",
            desc: "Audit evidence is organized by TSC criteria and control period, ready for auditor review without manual assembly.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <item.icon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                {item.title}
              </p>
              <p className="text-sm text-[var(--signal-fg-secondary)]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Auditor Access */}
      <SectionHeading>Auditor Access</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        During a SOC 2 audit engagement, auditors require access to evidence.
        FeatureSignals supports:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Read-only auditor role:</strong> Time-limited access to audit
          logs, configuration, and evidence without ability to modify
        </li>
        <li>
          <strong>Evidence exports:</strong> Structured exports of audit logs,
          access reviews, and test results in auditor-preferred formats
        </li>
        <li>
          <strong>Interview support:</strong> Engineering team availability for
          auditor interviews and control walkthroughs
        </li>
        <li>
          <strong>Bridge letter:</strong> Available between audit periods to
          confirm continued control operation
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "SOC 2 Controls Matrix", href: "/docs/compliance/soc2/controls-matrix" },
          { label: "SOC 2 Incident Response", href: "/docs/compliance/soc2/incident-response" },
          { label: "ISO 27001 ISMS Overview", href: "/docs/compliance/iso27001/isms-overview" },
          { label: "Security Overview", href: "/docs/compliance/security-overview" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>
  );
}
