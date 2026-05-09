import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, FileCheck, Search, BookOpen, Users, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "ISO 27001 ISMS Overview",
  description:
    "ISO 27001 Information Security Management System — scope, policy, risk assessment, controls implementation, and certification status for FeatureSignals.",
};

export default function Iso27001IsmsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        ISO 27001 ISMS Overview
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        ISO/IEC 27001:2022 is the international standard for Information
        Security Management Systems (ISMS). This page describes
        FeatureSignals&apos; ISMS — its scope, governing policy, risk assessment
        methodology, Annex A controls implementation, and certification roadmap.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Certification Status: Implementation Phase
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              FeatureSignals is implementing ISO 27001:2022 controls. The ISMS
              is operational with internal audits ongoing. Formal certification
              audit is on the product roadmap. All controls documented below are
              implemented and operational.
            </p>
          </div>
        </div>
      </div>

      {/* ISMS Scope */}
      <SectionHeading>ISMS Scope</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The FeatureSignals ISMS covers:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Product:</strong> FeatureSignals feature flag management
          platform (server, dashboard, SDKs, API)
        </li>
        <li>
          <strong>Infrastructure:</strong> Production, staging, and CI/CD
          environments hosted on Hetzner (Falkenstein, Germany)
        </li>
        <li>
          <strong>Data:</strong> Customer data, evaluation context, audit logs,
          configuration, secrets
        </li>
        <li>
          <strong>People:</strong> Engineering team with access to production
          systems and customer data
        </li>
        <li>
          <strong>Processes:</strong> Development, deployment, incident
          response, access management, change management
        </li>
      </ul>

      {/* ISMS Policy */}
      <SectionHeading>Information Security Policy</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The FeatureSignals Information Security Policy establishes the
        principles that govern our ISMS:
      </p>
      <div className="space-y-3 mb-6">
        {[
          {
            icon: Shield,
            title: "Confidentiality",
            desc: "Information is accessible only to those authorized. Enforced through RBAC, encryption, and access controls.",
          },
          {
            icon: FileCheck,
            title: "Integrity",
            desc: "Information is accurate, complete, and protected from unauthorized modification. Enforced through audit trails with SHA-256 chain hashing.",
          },
          {
            icon: Lock,
            title: "Availability",
            desc: "Information is accessible when needed by authorized users. Enforced through high-availability design, backups, and DR planning.",
          },
          {
            icon: Users,
            title: "Accountability",
            desc: "All actions are attributable to identified actors. Enforced through comprehensive audit logging and access reviews.",
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

      {/* Risk Assessment */}
      <SectionHeading>Risk Assessment Methodology</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals follows the ISO 27005 risk assessment methodology,
        integrated with ISO 27001 requirements:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Asset identification:</strong> All information assets are
          catalogued (data, systems, processes, people)
        </li>
        <li>
          <strong>Threat identification:</strong> Threats are identified using
          STRIDE methodology and industry threat intelligence
        </li>
        <li>
          <strong>Vulnerability assessment:</strong> Automated scanning
          (govulncheck, npm audit) plus manual security review
        </li>
        <li>
          <strong>Risk evaluation:</strong> Risks rated by likelihood × impact
          on a 5×5 matrix; risks above threshold require treatment
        </li>
        <li>
          <strong>Risk treatment:</strong> Apply controls (avoid, mitigate,
          transfer, or accept with justification)
        </li>
        <li>
          <strong>Residual risk acceptance:</strong> Documented sign-off by
          security lead for any accepted risks
        </li>
      </ol>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Risk assessments are reviewed quarterly and updated when significant
        changes occur (new features, infrastructure changes, new threats).
      </p>

      {/* Controls */}
      <SectionHeading>Annex A Controls Implementation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        ISO 27001:2022 Annex A defines 93 controls across 4 themes.
        FeatureSignals has implemented controls across all themes:
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        A.5 — Organizational Controls (37 controls)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Key Controls</Th>
            <Th>Implementation Status</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>A.5.1 Policies for information security</Td>
            <Td>ISMS policy documented, reviewed annually, communicated to team</Td>
          </Tr>
          <Tr>
            <Td>A.5.7 Threat intelligence</Td>
            <Td>Vulnerability scanning, dependency monitoring, security advisories</Td>
          </Tr>
          <Tr>
            <Td>A.5.15 Access control</Td>
            <Td>RBAC, least privilege, quarterly access reviews</Td>
          </Tr>
          <Tr>
            <Td>A.5.17–18 Authentication</Td>
            <Td>JWT, API keys, MFA (TOTP), SSO (SAML/OIDC)</Td>
          </Tr>
          <Tr>
            <Td>A.5.19 Supplier security</Td>
            <Td>Sub-processor vetting, DPAs, vendor security assessments</Td>
          </Tr>
          <Tr>
            <Td>A.5.24–27 Incident management</Td>
            <Td>5-phase incident lifecycle, defined SLAs, post-mortems</Td>
          </Tr>
          <Tr>
            <Td>A.5.29–30 ICT readiness</Td>
            <Td>Business continuity plan, DR runbook, quarterly testing</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        A.6 — People Controls (8 controls)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Key Controls</Th>
            <Th>Implementation Status</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>A.6.1 Screening</Td>
            <Td>Background verification for all team members with production access</Td>
          </Tr>
          <Tr>
            <Td>A.6.3 Awareness training</Td>
            <Td>Security awareness training at onboarding and annually</Td>
          </Tr>
          <Tr>
            <Td>A.6.5 Responsibilities after termination</Td>
            <Td>Immediate access revocation, credential rotation on departure</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        A.7 — Physical Controls (14 controls)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Physical security is provided by Hetzner&apos;s ISO 27001-certified
        data centers (Falkenstein, Germany):
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>24/7 security personnel and video surveillance</li>
        <li>Biometric access controls and mantrap entries</li>
        <li>Redundant power (UPS + diesel generators)</li>
        <li>Fire detection and suppression systems</li>
        <li>Climate control with N+1 redundancy</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        A.8 — Technological Controls (34 controls)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Key Controls</Th>
            <Th>Implementation Status</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>A.8.3 Information access restriction</Td>
            <Td>RBAC, org-scoped queries, 404 for cross-org access</Td>
          </Tr>
          <Tr>
            <Td>A.8.5 Secure authentication</Td>
            <Td>JWT (1h TTL), API keys (SHA-256), MFA, SSO</Td>
          </Tr>
          <Tr>
            <Td>A.8.8 Vulnerability management</Td>
            <Td>govulncheck in CI, weekly full scans, responsible disclosure</Td>
          </Tr>
          <Tr>
            <Td>A.8.12–15 Secure development</Td>
            <Td>Git-based workflow, PR reviews, 80%+ test coverage, staging env</Td>
          </Tr>
          <Tr>
            <Td>A.8.20–22 Network security</Td>
            <Td>WAF, rate limiting, IP allowlisting, security headers</Td>
          </Tr>
          <Tr>
            <Td>A.8.24 Cryptography</Td>
            <Td>TLS 1.3, AES-256 at rest, bcrypt, SHA-256 integrity</Td>
          </Tr>
          <Tr>
            <Td>A.8.25 Secure lifecycle</Td>
            <Td>Containerized deployment, immutable tags, canary deployments</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Internal Audit */}
      <SectionHeading>Internal Audit &amp; Management Review</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The ISMS is maintained through a cycle of continuous improvement:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Internal audits:</strong> Conducted quarterly against ISO
          27001:2022 requirements
        </li>
        <li>
          <strong>Management review:</strong> Bi-annual review of ISMS
          performance, audit findings, and improvement opportunities
        </li>
        <li>
          <strong>Corrective actions:</strong> Tracked in issue tracker with
          owners and deadlines
        </li>
        <li>
          <strong>Continuous improvement:</strong> Lessons learned from
          incidents, audits, and reviews feed back into control design
        </li>
      </ul>

      {/* Statement of Applicability */}
      <SectionHeading>Statement of Applicability (SoA)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        The Statement of Applicability documents which Annex A controls are
        applicable, implemented, and the justification for any exclusions. The
        SoA is available to Enterprise customers under NDA. Contact{" "}
        <a
          href="mailto:compliance@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          compliance@featuresignals.com
        </a>{" "}
        to request a copy.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "ISO 27701 PIMS Overview", href: "/docs/compliance/iso27701/pims-overview" },
          { label: "SOC 2 Controls Matrix", href: "/docs/compliance/soc2/controls-matrix" },
          { label: "CSA STAR Certification", href: "/docs/compliance/csa-star" },
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
