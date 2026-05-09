import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Server, Eye, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "SOC 2 Controls Matrix",
  description:
    "SOC 2 Type II controls matrix mapping security, availability, and confidentiality trust service criteria to FeatureSignals features and processes.",
};

export default function Soc2ControlsMatrixPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        SOC 2 Controls Matrix
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        This matrix maps SOC 2 Trust Service Criteria — security, availability,
        and confidentiality — to the specific features, processes, and technical
        controls implemented in FeatureSignals. A formal SOC 2 Type II audit is
        on our roadmap.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Status: Controls Implemented — Audit Planned
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              All controls listed below are implemented and operational. The
              formal SOC 2 Type II audit engagement is on the product roadmap.
              This matrix serves as readiness documentation for the audit
              process.
            </p>
          </div>
        </div>
      </div>

      {/* Security — Common Criteria */}
      <SectionHeading>
        <Shield size={18} className="inline mr-2 text-[var(--signal-fg-accent)]" />
        Common Criteria — Security (CC1–CC9)
      </SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        CC6 — Logical and Physical Access Controls
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC6.1</Td>
            <Td>Logical access security</Td>
            <Td>JWT authentication (1h TTL), API key auth (SHA-256 hashed), TLS 1.3</Td>
          </Tr>
          <Tr>
            <Td>CC6.2</Td>
            <Td>User access provisioning</Td>
            <Td>RBAC with four roles (owner/admin/developer/viewer), SSO/SCIM provisioning</Td>
          </Tr>
          <Tr>
            <Td>CC6.3</Td>
            <Td>Access removal</Td>
            <Td>Immediate member removal, API key revocation, session invalidation</Td>
          </Tr>
          <Tr>
            <Td>CC6.4</Td>
            <Td>Physical access</Td>
            <Td>Cloud provider physical security (Hetzner ISO 27001 data centers)</Td>
          </Tr>
          <Tr>
            <Td>CC6.5</Td>
            <Td>Authentication mechanisms</Td>
            <Td>MFA (TOTP), SSO (SAML/OIDC), bcrypt password hashing (cost 12)</Td>
          </Tr>
          <Tr>
            <Td>CC6.6</Td>
            <Td>External access points</Td>
            <Td>IP allowlisting (Enterprise), rate limiting, WAF rules</Td>
          </Tr>
          <Tr>
            <Td>CC6.7</Td>
            <Td>Information transmission</Td>
            <Td>TLS 1.3 in transit, AES-256 at rest, HSTS enforcement</Td>
          </Tr>
          <Tr>
            <Td>CC6.8</Td>
            <Td>Malicious software</Td>
            <Td>Containerized deployment, read-only filesystem, vulnerability scanning</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        CC7 — System Operations
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC7.1</Td>
            <Td>Detection &amp; monitoring</Td>
            <Td>Structured JSON logging (slog), SigNoz observability, health checks, metrics</Td>
          </Tr>
          <Tr>
            <Td>CC7.2</Td>
            <Td>Security monitoring</Td>
            <Td>Audit log with actor/IP/timestamp, SHA-256 integrity chain hashing</Td>
          </Tr>
          <Tr>
            <Td>CC7.3</Td>
            <Td>Security incident evaluation</Td>
            <Td>Incident response plan, on-call rotation, 15-min P0 acknowledgment</Td>
          </Tr>
          <Tr>
            <Td>CC7.4</Td>
            <Td>Incident response</Td>
            <Td>Defined severity levels (P0–P4), runbooks, post-mortem process</Td>
          </Tr>
          <Tr>
            <Td>CC7.5</Td>
            <Td>Recovery plans</Td>
            <Td>Automated backups, disaster recovery runbook, RPO &lt;24h, RTO &lt;30min</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Availability */}
      <SectionHeading>
        <Server size={18} className="inline mr-2 text-[var(--signal-fg-accent)]" />
        Availability Criteria (A1)
      </SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>A1.1</Td>
            <Td>Capacity management</Td>
            <Td>Connection pool tuning (20–50 conns), horizontal scaling, load testing</Td>
          </Tr>
          <Tr>
            <Td>A1.2</Td>
            <Td>Environmental protections</Td>
            <Td>Hetzner data center redundancy, UPS, generator backup, fire suppression</Td>
          </Tr>
          <Tr>
            <Td>A1.3</Td>
            <Td>Recovery testing</Td>
            <Td>Quarterly DR testing, backup verification, restore procedure validation</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Confidentiality */}
      <SectionHeading>
        <Eye size={18} className="inline mr-2 text-[var(--signal-fg-accent)]" />
        Confidentiality Criteria (C1)
      </SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>C1.1</Td>
            <Td>Confidential information identification</Td>
            <Td>Data classification: PII, PHI, secrets, credentials — all encrypted at rest</Td>
          </Tr>
          <Tr>
            <Td>C1.2</Td>
            <Td>Confidential information disposal</Td>
            <Td>GDPR-compliant erasure, 30-day grace period, permanent purge on day 31</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Change Management */}
      <SectionHeading>CC8 — Change Management</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC8.1</Td>
            <Td>Change management process</Td>
            <Td>Git-based workflow, mandatory PR reviews, branch protection rules, CI/CD pipeline</Td>
          </Tr>
          <Tr>
            <Td>CC8.2</Td>
            <Td>Authorized changes</Td>
            <Td>Code owners, required approvers, signed commits, immutable release tags</Td>
          </Tr>
          <Tr>
            <Td>CC8.3</Td>
            <Td>Change testing</Td>
            <Td>80%+ test coverage, table-driven tests, staging environment, canary deployments</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Risk Assessment */}
      <SectionHeading>CC3 — Risk Assessment</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC3.1</Td>
            <Td>Risk identification</Td>
            <Td>Threat modeling, dependency scanning (govulncheck, npm audit), security review process</Td>
          </Tr>
          <Tr>
            <Td>CC3.2</Td>
            <Td>Risk mitigation</Td>
            <Td>Defense-in-depth architecture, least privilege, deny-by-default security posture</Td>
          </Tr>
          <Tr>
            <Td>CC3.3</Td>
            <Td>Vendor risk management</Td>
            <Td>Sub-processor assessment, vendor security review, data processing agreements</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Monitoring */}
      <SectionHeading>CC4 — Monitoring Activities</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Criteria</Th>
            <Th>Control Objective</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC4.1</Td>
            <Td>Ongoing monitoring</Td>
            <Td>SigNoz dashboards, Prometheus metrics, alerting on anomaly detection</Td>
          </Tr>
          <Tr>
            <Td>CC4.2</Td>
            <Td>Control evaluation</Td>
            <Td>Automated control testing, quarterly access review, configuration drift detection</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "SOC 2 Evidence Collection", href: "/docs/compliance/soc2/evidence-collection" },
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
