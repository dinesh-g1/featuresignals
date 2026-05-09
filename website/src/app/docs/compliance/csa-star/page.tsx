import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cloud, Star, Shield, CheckCircle, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "CSA STAR Certification",
  description:
    "Cloud Security Alliance STAR Certification — level attained, control categories, assessment methodology, and how FeatureSignals aligns with the CSA Cloud Controls Matrix.",
};

export default function CsaStarPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        CSA STAR Certification
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The Cloud Security Alliance (CSA) Security, Trust, Assurance, and Risk
        (STAR) program is the industry-standard framework for cloud security
        assurance. This page describes FeatureSignals&apos; alignment with the
        CSA STAR program and Cloud Controls Matrix (CCM).
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Star size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              CSA STAR Level: Self-Assessment (Level 1)
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              FeatureSignals has completed a CSA STAR Level 1 self-assessment.
              Level 2 (third-party audit) and Level 3 (continuous monitoring)
              are on the product roadmap. This page documents our alignment with
              the CSA Cloud Controls Matrix v4.
            </p>
          </div>
        </div>
      </div>

      {/* STAR Levels */}
      <SectionHeading>STAR Program Levels</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The CSA STAR program has four levels of assurance. FeatureSignals is
        progressing through each:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Level</Th>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>FeatureSignals Status</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>1</Td>
            <Td>Self-Assessment</Td>
            <Td>Organization completes CAIQ and submits to CSA STAR registry</Td>
            <Td>
              <span className="inline-flex items-center gap-1 text-[var(--signal-fg-success)]">
                <CheckCircle size={14} /> Completed
              </span>
            </Td>
          </Tr>
          <Tr>
            <Td>2</Td>
            <Td>Third-Party Audit</Td>
            <Td>Independent auditor validates controls against CCM and ISO 27001 or SOC 2</Td>
            <Td>Planned — post SOC 2 Type II</Td>
          </Tr>
          <Tr>
            <Td>2+</Td>
            <Td>Continuous (Silver)</Td>
            <Td>Continuous monitoring with automated evidence collection</Td>
            <Td>Planned</Td>
          </Tr>
          <Tr>
            <Td>3</Td>
            <Td>Continuous (Gold)</Td>
            <Td>Full continuous monitoring with real-time control validation</Td>
            <Td>Future</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* CCM Control Categories */}
      <SectionHeading>Cloud Controls Matrix (CCM v4) Alignment</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The CSA Cloud Controls Matrix v4 defines 17 control domains with 197
        controls. Below is FeatureSignals&apos; alignment with the key domains:
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        A — Application &amp; Interface Security (AIS)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control ID</Th>
            <Th>Control</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>AIS-01</Td>
            <Td>Application security</Td>
            <Td>OWASP Top 10 mitigations, input validation, parameterized SQL</Td>
          </Tr>
          <Tr>
            <Td>AIS-02</Td>
            <Td>API security</Td>
            <Td>JWT + API key auth, rate limiting, request body limits (1MB)</Td>
          </Tr>
          <Tr>
            <Td>AIS-03</Td>
            <Td>Data integrity</Td>
            <Td>SHA-256 audit trail chain hashing, TLS 1.3 for data in transit</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        IAM — Identity &amp; Access Management
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control ID</Th>
            <Th>Control</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>IAM-01</Td>
            <Td>Identity management</Td>
            <Td>UUID-based user IDs, SSO (SAML/OIDC), SCIM provisioning</Td>
          </Tr>
          <Tr>
            <Td>IAM-02</Td>
            <Td>Credential management</Td>
            <Td>bcrypt password hashing (cost 12), API key SHA-256 hashing</Td>
          </Tr>
          <Tr>
            <Td>IAM-04</Td>
            <Td>Privileged access</Td>
            <Td>RBAC (4 roles), least privilege, quarterly access reviews</Td>
          </Tr>
          <Tr>
            <Td>IAM-05</Td>
            <Td>Segregation of duties</Td>
            <Td>Developer cannot approve own PRs, separate deployment role</Td>
          </Tr>
          <Tr>
            <Td>IAM-07</Td>
            <Td>Access revocation</Td>
            <Td>Immediate member removal, API key rotation, session invalidation</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        DSI — Data Security &amp; Information Lifecycle
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control ID</Th>
            <Th>Control</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>DSI-01</Td>
            <Td>Data classification</Td>
            <Td>PII, PHI, secrets, credentials — classified and encrypted</Td>
          </Tr>
          <Tr>
            <Td>DSI-02</Td>
            <Td>Data inventory</Td>
            <Td>Complete data mapping for GDPR/CCPA compliance</Td>
          </Tr>
          <Tr>
            <Td>DSI-03</Td>
            <Td>Data encryption at rest</Td>
            <Td>AES-256 for database, backups, and archives</Td>
          </Tr>
          <Tr>
            <Td>DSI-05</Td>
            <Td>Data retention</Td>
            <Td>Defined retention periods, automated purging after expiry</Td>
          </Tr>
          <Tr>
            <Td>DSI-07</Td>
            <Td>Secure disposal</Td>
            <Td>GDPR-compliant erasure, permanent purge, backup cycling</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        IVS — Infrastructure &amp; Virtualization Security
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control ID</Th>
            <Th>Control</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>IVS-01</Td>
            <Td>Network security</Td>
            <Td>WAF, DDoS mitigation, firewall rules, TLS 1.3 enforcement</Td>
          </Tr>
          <Tr>
            <Td>IVS-03</Td>
            <Td>Workload security</Td>
            <Td>Containerized deployment, read-only filesystem, vulnerability scanning</Td>
          </Tr>
          <Tr>
            <Td>IVS-04</Td>
            <Td>Clock synchronization</Td>
            <Td>NTP-synchronized, all timestamps in UTC RFC 3339</Td>
          </Tr>
          <Tr>
            <Td>IVS-07</Td>
            <Td>Network segmentation</Td>
            <Td>Internal services not exposed to internet, management network isolation</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        SEF — Security Incident Management, E-Discovery, &amp; Cloud Forensics
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control ID</Th>
            <Th>Control</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>SEF-01</Td>
            <Td>Incident response</Td>
            <Td>Defined severity levels (P0–P4), 5-phase lifecycle, on-call rotation</Td>
          </Tr>
          <Tr>
            <Td>SEF-02</Td>
            <Td>Incident reporting</Td>
            <Td>Customer notification within SLA, regulatory reporting (GDPR: 72h)</Td>
          </Tr>
          <Tr>
            <Td>SEF-04</Td>
            <Td>Forensic data</Td>
            <Td>Audit trail with chain of custody, SHA-256 integrity hashing</Td>
          </Tr>
          <Tr>
            <Td>SEF-05</Td>
            <Td>Audit logging</Td>
            <Td>All mutating operations logged with actor/IP/timestamp</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* CAIQ */}
      <SectionHeading>Consensus Assessments Initiative Questionnaire (CAIQ)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The CAIQ is the standardized assessment questionnaire used in CSA STAR
        Level 1 self-assessment. FeatureSignals has completed the CAIQ v4,
        covering:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>197 control specifications across all 17 CCM domains</li>
        <li>Control ownership, implementation status, and evidence references</li>
        <li>Gap analysis with remediation plans for any partial implementations</li>
      </ul>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        The completed CAIQ is available to Enterprise customers under NDA.
        Contact{" "}
        <a
          href="mailto:compliance@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline"
        >
          compliance@featuresignals.com
        </a>{" "}
        to request a copy.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "ISO 27001 ISMS Overview", href: "/docs/compliance/iso27001/isms-overview" },
          { label: "SOC 2 Controls Matrix", href: "/docs/compliance/soc2/controls-matrix" },
          { label: "Data Privacy Framework", href: "/docs/compliance/data-privacy-framework" },
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
