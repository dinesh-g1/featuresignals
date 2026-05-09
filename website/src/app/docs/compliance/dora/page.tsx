import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, AlertTriangle, FileText, Activity, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "DORA Compliance",
  description:
    "Digital Operational Resilience Act compliance — ICT risk management, incident reporting, resilience testing, and third-party risk management for financial entities using FeatureSignals.",
};

export default function DoraPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        DORA Compliance
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The Digital Operational Resilience Act (DORA) — Regulation (EU)
        2022/2554 — establishes a comprehensive framework for ICT risk
        management, incident reporting, digital operational resilience testing,
        and third-party risk management for financial entities operating in the
        EU. This guide explains how FeatureSignals supports DORA compliance as
        an ICT third-party service provider.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              DORA Applicability
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              DORA applies to financial entities operating in the EU — banks,
              insurance companies, investment firms, payment providers, and
              crypto-asset service providers — and the ICT third-party service
              providers (like FeatureSignals) that support them. DORA went into
              full effect on January 17, 2025.
            </p>
          </div>
        </div>
      </div>

      {/* Five Pillars */}
      <SectionHeading>The Five Pillars of DORA</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        DORA is structured around five pillars. FeatureSignals addresses each
        as it relates to our role as an ICT service provider:
      </p>

      {/* Pillar 1: ICT Risk Management */}
      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Pillar 1: ICT Risk Management (Articles 5–16)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Financial entities must maintain a comprehensive ICT risk management
        framework. FeatureSignals supports this by:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>DORA Requirement</Th>
            <Th>FeatureSignals Support</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>ICT risk identification &amp; assessment</Td>
            <Td>Documented architecture, threat model, risk register, dependency vulnerability scanning</Td>
          </Tr>
          <Tr>
            <Td>ICT asset management</Td>
            <Td>Full asset inventory, data flow diagrams, sub-processor disclosure</Td>
          </Tr>
          <Tr>
            <Td>Business continuity</Td>
            <Td>Automated backups, DR runbook, RPO &lt;24h, RTO &lt;30min</Td>
          </Tr>
          <Tr>
            <Td>Backup &amp; restoration</Td>
            <Td>Daily encrypted backups, quarterly restore testing, off-site replication</Td>
          </Tr>
          <Tr>
            <Td>Network security</Td>
            <Td>TLS 1.3, WAF, rate limiting, IP allowlisting, security headers</Td>
          </Tr>
          <Tr>
            <Td>Access control</Td>
            <Td>RBAC, JWT with short TTL, MFA, SSO, API key rotation</Td>
          </Tr>
          <Tr>
            <Td>Cryptography &amp; encryption</Td>
            <Td>AES-256 at rest, TLS 1.3 in transit, bcrypt for passwords, SHA-256 for integrity</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Pillar 2: Incident Reporting */}
      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        Pillar 2: ICT-Related Incident Reporting (Articles 17–23)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Financial entities must classify and report major ICT-related incidents
        to regulators within strict timelines. As an ICT provider,
        FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Initial notification:</strong> Within 4 hours of classifying
          an incident as &ldquo;major&rdquo;
        </li>
        <li>
          <strong>Intermediate report:</strong> Within 72 hours with impact
          assessment and remediation status
        </li>
        <li>
          <strong>Final report:</strong> Within 1 month with root cause
          analysis and preventive measures
        </li>
        <li>Provides incident data in the format required by DORA regulatory technical standards (RTS)</li>
        <li>Maintains incident records for a minimum of 5 years</li>
      </ul>

      {/* Pillar 3: Resilience Testing */}
      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        Pillar 3: Digital Operational Resilience Testing (Articles 24–27)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Financial entities must test their ICT systems regularly, including
        threat-led penetration testing (TLPT) for critical entities.
        FeatureSignals supports resilience testing through:
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          {
            title: "Self-Hosted Testing",
            desc: "Self-hosted deployments give you full control over resilience testing. Run penetration tests, chaos engineering, and TLPT against your own FeatureSignals instance without needing our approval.",
          },
          {
            title: "Test Environments",
            desc: "Dedicated staging environments allow you to test failover, backup restoration, and incident response procedures without affecting production traffic.",
          },
          {
            title: "Automated Testing",
            desc: "CI/CD pipeline with 80%+ test coverage, table-driven tests, and integration tests provides continuous assurance of system reliability.",
          },
          {
            title: "DR Testing",
            desc: "Quarterly disaster recovery testing with documented results. Restore from backup, verify data integrity, and validate RTO/RPO targets.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <Activity size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                {item.title}
              </p>
              <p className="text-sm text-[var(--signal-fg-secondary)]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pillar 4: Third-Party Risk */}
      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        Pillar 4: ICT Third-Party Risk Management (Articles 28–44)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        DORA introduces a regulatory oversight framework for critical ICT
        third-party providers. FeatureSignals addresses third-party risk requirements:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>DORA Requirement</Th>
            <Th>FeatureSignals Approach</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Contractual safeguards</Td>
            <Td>Data Processing Agreement with DORA-aligned terms, SLAs, and termination assistance</Td>
          </Tr>
          <Tr>
            <Td>Sub-processing disclosure</Td>
            <Td>Complete sub-processor list with services, location, and DORA compliance status</Td>
          </Tr>
          <Tr>
            <Td>Audit rights</Td>
            <Td>Right to audit (including joint audits with regulators), SOC 2 evidence packages</Td>
          </Tr>
          <Tr>
            <Td>Exit strategy</Td>
            <Td>Documented exit plan with data export, migration support, and 30-day transition period</Td>
          </Tr>
          <Tr>
            <Td>Security certifications</Td>
            <Td>SOC 2 (planned), ISO 27001 (planned), penetration test reports available under NDA</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Pillar 5: Information Sharing */}
      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        Pillar 5: Information Sharing (Article 45)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        DORA encourages information sharing on cyber threats and intelligence
        among financial entities. FeatureSignals supports this by:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Publishing security advisories for vulnerabilities and incidents</li>
        <li>Maintaining a responsible disclosure program at security@featuresignals.com</li>
        <li>Participating in industry threat intelligence sharing where applicable</li>
        <li>Providing transparent incident post-mortems for major events</li>
      </ul>

      {/* Self-Hosting for DORA */}
      <SectionHeading>Self-Hosting for Maximum DORA Compliance</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For financial entities with the strictest DORA requirements,
        self-hosting FeatureSignals provides the highest level of control:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Deploy within your own infrastructure and network boundaries</li>
        <li>Full control over resilience testing, backup strategy, and DR planning</li>
        <li>No dependency on external ICT provider availability</li>
        <li>Complete audit trail under your direct control</li>
        <li>Air-gapped deployment supported for the most sensitive environments</li>
      </ul>

      {/* Contact */}
      <SectionHeading>DORA Compliance Contact</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        For DORA compliance inquiries, ICT third-party risk assessments, or to
        request audit documentation:{" "}
        <a
          href="mailto:compliance@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          compliance@featuresignals.com
        </a>
      </p>

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
