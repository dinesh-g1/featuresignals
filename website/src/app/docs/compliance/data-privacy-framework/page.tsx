import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Shield, FileCheck, Users, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Privacy Framework",
  description:
    "EU-US Data Privacy Framework compliance — certification status, principles, enforcement, and redress mechanisms for cross-border data transfers.",
};

export default function DataPrivacyFrameworkPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        EU-US Data Privacy Framework
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The EU-US Data Privacy Framework (DPF) — along with the UK Extension and
        Swiss-US DPF — provides a legal mechanism for transferring personal data
        from the EU, UK, and Switzerland to the United States. This page
        describes FeatureSignals&apos; DPF compliance and what it means for our
        customers.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Globe size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Infrastructure Location: EU-Based
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              FeatureSignals&apos; infrastructure is hosted in Falkenstein,
              Germany (Hetzner data centers). For cloud customers, data remains
              within the EU. The DPF is relevant for specific scenarios such as
              US-based support access, US-based sub-processors, and US customers
              whose data originates in the EU.
            </p>
          </div>
        </div>
      </div>

      {/* DPF Overview */}
      <SectionHeading>What is the Data Privacy Framework?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The EU-US Data Privacy Framework (DPF) was adopted by the European
        Commission on July 10, 2023, as the successor to the invalidated
        Privacy Shield. It establishes a legal basis for transatlantic data
        flows by requiring US companies to adhere to a set of data protection
        principles and providing enforceable redress mechanisms for EU
        individuals.
      </p>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The framework consists of three parts:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>EU-US DPF:</strong> For personal data transferred from the
          European Union
        </li>
        <li>
          <strong>UK Extension:</strong> For personal data transferred from the
          United Kingdom (effective October 12, 2023)
        </li>
        <li>
          <strong>Swiss-US DPF:</strong> For personal data transferred from
          Switzerland (effective July 17, 2024)
        </li>
      </ul>

      {/* DPF Principles */}
      <SectionHeading>DPF Principles &amp; Our Implementation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The DPF requires participating organizations to adhere to seven core
        principles. Here&apos;s how FeatureSignals implements each:
      </p>

      <div className="space-y-4 mb-6">
        {[
          {
            num: 1,
            title: "Notice",
            description:
              "Organizations must inform individuals about data collection, processing purposes, third-party disclosures, and their rights. FeatureSignals provides transparent privacy notices at the point of data collection, in our Privacy Policy, and in this documentation.",
          },
          {
            num: 2,
            title: "Choice",
            description:
              "Individuals must be able to opt out of data disclosure to third parties or use for materially different purposes. FeatureSignals does not sell or share personal data and provides clear opt-out mechanisms for any data processing beyond the core service.",
          },
          {
            num: 3,
            title: "Accountability for Onward Transfer",
            description:
              "Organizations transferring data to third parties must ensure equivalent protection. FeatureSignals enters into Data Processing Agreements (DPAs) with all sub-processors, conducts security assessments, and maintains a public sub-processor list.",
          },
          {
            num: 4,
            title: "Security",
            description:
              "Reasonable and appropriate security measures must protect personal data. FeatureSignals implements defense-in-depth: TLS 1.3, AES-256 at rest, bcrypt password hashing, SHA-256 integrity, WAF, rate limiting, and continuous vulnerability scanning.",
          },
          {
            num: 5,
            title: "Data Integrity &amp; Purpose Limitation",
            description:
              "Data must be relevant to its processing purpose and accurate. FeatureSignals processes only the minimum data needed for feature flag management, maintains data accuracy through self-service correction tools, and enforces purpose limitation through access controls.",
          },
          {
            num: 6,
            title: "Access",
            description:
              "Individuals must be able to access their personal data and correct, amend, or delete it. FeatureSignals provides self-service profile management, API-based data export, and GDPR-compliant erasure with 30-day grace period.",
          },
          {
            num: 7,
            title: "Recourse, Enforcement &amp; Liability",
            description:
              "Organizations must provide independent recourse mechanisms and be subject to enforcement. FeatureSignals participates in DPF dispute resolution, cooperates with EU DPAs, and is subject to FTC enforcement jurisdiction for DPF compliance.",
          },
        ].map((principle) => (
          <div
            key={principle.num}
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
              {principle.num}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                {principle.title}
              </p>
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                {principle.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Redress Mechanisms */}
      <SectionHeading>Redress Mechanisms</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The DPF provides multiple layers of redress for EU individuals who
        believe their data protection rights have been violated:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Mechanism</Th>
            <Th>Description</Th>
            <Th>How to Access</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Direct complaint to FeatureSignals</Td>
            <Td>First point of contact for any DPF concern</Td>
            <Td>
              <a href="mailto:dpo@featuresignals.com" className="text-[var(--signal-fg-accent)] hover:underline">
                dpo@featuresignals.com
              </a>
            </Td>
          </Tr>
          <Tr>
            <Td>Independent dispute resolution</Td>
            <Td>Free of charge to individuals, provided by an approved ADR provider</Td>
            <Td>Available through our DPF registration</Td>
          </Tr>
          <Tr>
            <Td>EU Data Protection Authority (DPA)</Td>
            <Td>Individuals can lodge complaints with their local DPA</Td>
            <Td>DPA will coordinate with US authorities</Td>
          </Tr>
          <Tr>
            <Td>Binding arbitration</Td>
            <Td>Final recourse mechanism under the DPF Arbitration Panel</Td>
            <Td>Available for residual claims after other mechanisms exhausted</Td>
          </Tr>
          <Tr>
            <Td>FTC enforcement</Td>
            <Td>US Federal Trade Commission enforces DPF commitments</Td>
            <Td>Through FTC complaint process</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Sub-processors */}
      <SectionHeading>Onward Transfers &amp; Sub-processors</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Under the DPF&apos;s Accountability for Onward Transfer principle,
        FeatureSignals ensures all sub-processors provide equivalent data
        protection:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>All sub-processors are vetted for security and privacy compliance</li>
        <li>DPAs are in place with Standard Contractual Clauses (SCCs) where applicable</li>
        <li>Sub-processor list is publicly available and updated within 14 days of changes</li>
        <li>Customers are notified before new sub-processors are engaged</li>
      </ul>

      {/* Self-Hosting Option */}
      <SectionHeading>Self-Hosting: Eliminate Cross-Border Transfers</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For organizations that prefer to eliminate cross-border data transfers
        entirely, self-hosting FeatureSignals provides the simplest solution:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Deploy within your own EU infrastructure — data never leaves your environment</li>
        <li>No reliance on DPF or any other transfer mechanism</li>
        <li>Full control over data residency and processing locations</li>
        <li>Air-gapped deployment available for the most stringent requirements</li>
      </ul>

      {/* Contact */}
      <SectionHeading>DPF Contact &amp; Inquiries</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        For questions about our DPF participation, to exercise your DPF rights,
        or to escalate a privacy concern:{" "}
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
          { label: "GDPR Overview", href: "/docs/compliance/gdpr" },
          { label: "GDPR Data Subject Rights", href: "/docs/compliance/gdpr-rights" },
          { label: "CCPA / CPRA", href: "/docs/compliance/ccpa-cpra" },
          { label: "ISO 27701 PIMS Overview", href: "/docs/compliance/iso27701/pims-overview" },
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
