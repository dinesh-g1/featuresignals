import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Eye, FileCheck, Lock, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "ISO 27701 PIMS Overview",
  description:
    "ISO 27701 Privacy Information Management System — privacy controls, GDPR mapping, PII handling, privacy by design, and how FeatureSignals implements privacy management.",
};

export default function Iso27701PimsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        ISO 27701 PIMS Overview
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        ISO/IEC 27701:2019 extends ISO 27001 with privacy-specific requirements,
        establishing a Privacy Information Management System (PIMS). This page
        describes how FeatureSignals implements privacy controls, maps to GDPR
        requirements, and manages PII throughout its lifecycle.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Eye size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              PIMS Status: Implementation Phase
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              FeatureSignals is implementing ISO 27701 PIMS controls as an
              extension of our ISO 27001 ISMS. The PIMS framework is operational
              with internal assessments ongoing. All privacy controls documented
              below are implemented and operational.
            </p>
          </div>
        </div>
      </div>

      {/* PIMS Overview */}
      <SectionHeading>What is ISO 27701?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        ISO 27701 extends the ISO 27001 ISMS framework with privacy-specific
        requirements for both PII controllers and processors. It provides a
        structured approach to:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Establishing, implementing, maintaining, and improving a PIMS</li>
        <li>Mapping privacy controls to GDPR, CCPA, and other privacy regulations</li>
        <li>Demonstrating compliance with data protection requirements</li>
        <li>Building trust with customers through certified privacy management</li>
        <li>Integrating privacy into the broader information security framework</li>
      </ul>

      {/* PII Controller vs Processor */}
      <SectionHeading>PII Controller &amp; Processor Controls</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        ISO 27701 distinguishes between controls for PII controllers and PII
        processors. FeatureSignals implements both sets, as we act as a
        processor for customer data and a controller for our own business data
        (billing, team accounts):
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        PII Controller Controls (ISO 27701 Clause 7.2)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control Category</Th>
            <Th>ISO 27701 Reference</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Privacy policies &amp; notices</Td>
            <Td>7.2.2</Td>
            <Td>Privacy Policy, cookie notice, DPF notice, transparency at collection points</Td>
          </Tr>
          <Tr>
            <Td>Lawful basis for processing</Td>
            <Td>7.2.3</Td>
            <Td>Consent, contract necessity, legitimate interest — documented per processing purpose</Td>
          </Tr>
          <Tr>
            <Td>Privacy by design</Td>
            <Td>7.2.5</Td>
            <Td>Data minimization, purpose limitation, access controls baked into architecture</Td>
          </Tr>
          <Tr>
            <Td>Data subject rights</Td>
            <Td>7.2.6–7.2.8</Td>
            <Td>Self-service access, correction, deletion, portability — all API-backed</Td>
          </Tr>
          <Tr>
            <Td>Consent management</Td>
            <Td>7.2.4</Td>
            <Td>Explicit consent capture, withdrawal mechanism, consent audit trail</Td>
          </Tr>
          <Tr>
            <Td>Data Protection Impact Assessment</Td>
            <Td>7.2.9</Td>
            <Td>DPIA conducted for new processing activities, reviewed annually</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-8 mb-3">
        PII Processor Controls (ISO 27701 Clause 7.3)
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Control Category</Th>
            <Th>ISO 27701 Reference</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Processing only on instructions</Td>
            <Td>7.3.2</Td>
            <Td>DPA strictly defines processing purposes, no processing beyond documented scope</Td>
          </Tr>
          <Tr>
            <Td>Sub-processing authorization</Td>
            <Td>7.3.3–7.3.4</Td>
            <Td>Prior notification for new sub-processors, equivalent contractual terms</Td>
          </Tr>
          <Tr>
            <Td>Confidentiality of personnel</Td>
            <Td>7.3.5</Td>
            <Td>Confidentiality agreements, access restrictions, need-to-know enforcement</Td>
          </Tr>
          <Tr>
            <Td>Data breach notification</Td>
            <Td>7.3.6</Td>
            <Td>Controller notification within 24 hours of confirmed breach, incident response plan</Td>
          </Tr>
          <Tr>
            <Td>Data retention &amp; deletion</Td>
            <Td>7.3.7</Td>
            <Td>Defined retention periods, secure deletion (30-day grace, permanent purge), backup cycling</Td>
          </Tr>
          <Tr>
            <Td>Assistance with controller obligations</Td>
            <Td>7.3.8</Td>
            <Td>API-based DSAR support, data export, DPIA assistance, audit support</Td>
          </Tr>
          <Tr>
            <Td>Audit &amp; compliance</Td>
            <Td>7.3.9</Td>
            <Td>Right to audit, SOC 2 evidence packages, CAIQ availability</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* GDPR Mapping */}
      <SectionHeading>GDPR Mapping</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        ISO 27701 Annex D maps PIMS controls directly to GDPR articles.
        FeatureSignals uses this mapping to demonstrate GDPR compliance:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>GDPR Article</Th>
            <Th>Requirement</Th>
            <Th>ISO 27701 Control</Th>
            <Th>FeatureSignals Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Art. 5</Td>
            <Td>Data protection principles</Td>
            <Td>7.2.1–7.2.5</Td>
            <Td>Data minimization, purpose limitation, accuracy, storage limitation</Td>
          </Tr>
          <Tr>
            <Td>Art. 15</Td>
            <Td>Right of access</Td>
            <Td>7.2.6</Td>
            <Td>API data export, self-service dashboard access</Td>
          </Tr>
          <Tr>
            <Td>Art. 17</Td>
            <Td>Right to erasure</Td>
            <Td>7.2.8</Td>
            <Td>Soft delete + 30-day grace + permanent purge</Td>
          </Tr>
          <Tr>
            <Td>Art. 20</Td>
            <Td>Data portability</Td>
            <Td>7.2.8</Td>
            <Td>JSON/CSV export, machine-readable formats</Td>
          </Tr>
          <Tr>
            <Td>Art. 25</Td>
            <Td>Data protection by design</Td>
            <Td>7.2.5</Td>
            <Td>Privacy baked into hexagonal architecture, data minimization by default</Td>
          </Tr>
          <Tr>
            <Td>Art. 28</Td>
            <Td>Processor obligations</Td>
            <Td>7.3.2–7.3.9</Td>
            <Td>DPA, sub-processor management, breach notification, audit rights</Td>
          </Tr>
          <Tr>
            <Td>Art. 32</Td>
            <Td>Security of processing</Td>
            <Td>7.3.5</Td>
            <Td>TLS 1.3, AES-256, bcrypt, WAF, rate limiting, vulnerability scanning</Td>
          </Tr>
          <Tr>
            <Td>Art. 33–34</Td>
            <Td>Breach notification</Td>
            <Td>7.3.6</Td>
            <Td>24h notification to controller, 72h to supervisory authority</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* PII Handling */}
      <SectionHeading>PII Handling Lifecycle</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals manages PII through its full lifecycle with documented
        controls at each stage:
      </p>
      <div className="space-y-4 mb-6">
        {[
          {
            phase: "Collection",
            desc: "PII is collected only for specified purposes. Data minimization is applied — only what's necessary for the service. Consent is captured where required. Privacy notices are provided at the point of collection.",
          },
          {
            phase: "Processing",
            desc: "PII is processed strictly in accordance with documented purposes in the DPA. Access is restricted by RBAC and need-to-know. Processing activities are logged for audit purposes.",
          },
          {
            phase: "Storage",
            desc: "PII is encrypted at rest (AES-256). Backups are encrypted. Data is stored in EU-based infrastructure (Hetzner, Falkenstein). Retention periods are enforced automatically.",
          },
          {
            phase: "Transfer",
            desc: "Cross-border transfers only with appropriate safeguards (DPF, SCCs, or adequacy decision). Sub-processors are vetted and contractually bound to equivalent protections.",
          },
          {
            phase: "Deletion",
            desc: "PII is permanently purged at end of retention. Two-phase deletion: soft delete (immediate) + hard delete (day 31). Audit log references are anonymized. Backups cycle out within 90 days.",
          },
        ].map((stage) => (
          <div
            key={stage.phase}
            className="flex items-start gap-4 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none"
              style={{
                backgroundColor: "var(--signal-bg-accent-emphasis)",
                color: "var(--signal-fg-on-emphasis)",
              }}
              aria-hidden="true"
            >
              {stage.phase.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                {stage.phase}
              </p>
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                {stage.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy by Design */}
      <SectionHeading>Privacy by Design &amp; Default</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals incorporates privacy by design (PbD) and privacy by
        default (PbD) principles, as required by GDPR Article 25 and ISO 27701:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Proactive not reactive:</strong> Privacy considered at the
          architecture level, not bolted on afterward
        </li>
        <li>
          <strong>Privacy as the default:</strong> Minimum data collection by
          default; users must opt in to additional data sharing
        </li>
        <li>
          <strong>Privacy embedded into design:</strong> Hexagonal architecture
          provides clear data boundaries
        </li>
        <li>
          <strong>Full functionality:</strong> Privacy controls do not degrade
          the service; feature flags work identically with minimal data
        </li>
        <li>
          <strong>End-to-end security:</strong> Data protected throughout its
          lifecycle — collection to deletion
        </li>
        <li>
          <strong>Visibility and transparency:</strong> Clear privacy
          documentation, accessible DPIA summaries
        </li>
        <li>
          <strong>Respect for user privacy:</strong> Data subject rights built
          into the product with self-service capabilities
        </li>
      </ul>

      {/* Contact */}
      <SectionHeading>DPO &amp; Privacy Contact</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        For PIMS inquiries, DPIA requests, or privacy concerns:{" "}
        <a
          href="mailto:dpo@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          dpo@featuresignals.com
        </a>
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "ISO 27001 ISMS Overview", href: "/docs/compliance/iso27001/isms-overview" },
          { label: "GDPR Overview", href: "/docs/compliance/gdpr" },
          { label: "GDPR Data Subject Rights", href: "/docs/compliance/gdpr-rights" },
          { label: "CCPA / CPRA", href: "/docs/compliance/ccpa-cpra" },
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
