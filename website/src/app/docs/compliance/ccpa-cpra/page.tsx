import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, Ban, Trash2, Download, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "CCPA / CPRA Compliance",
  description:
    "California Consumer Privacy Act and California Privacy Rights Act compliance — data inventory, consumer rights, opt-out mechanisms, and how FeatureSignals supports your obligations.",
};

export default function CcpaCpraPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        CCPA / CPRA Compliance
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The California Consumer Privacy Act (CCPA) and its amendment, the
        California Privacy Rights Act (CPRA), grant California residents
        specific rights over their personal information. This guide explains how
        FeatureSignals supports your organization&apos;s CCPA/CPRA compliance
        obligations.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Service Provider Role
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Under CCPA/CPRA, FeatureSignals acts as a{" "}
              <strong>service provider</strong> (equivalent to a processor under
              GDPR). We process personal information only for the purpose of
              providing the feature flag service and do not sell, share, or use
              personal information for any other purpose.
            </p>
          </div>
        </div>
      </div>

      {/* CCPA vs CPRA */}
      <SectionHeading>CCPA vs. CPRA: Key Differences</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Aspect</Th>
            <Th>CCPA (2020)</Th>
            <Th>CPRA (2023 Amendment)</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Sensitive PI</Td>
            <Td>Not separately regulated</Td>
            <Td>New category with opt-out right</Td>
          </Tr>
          <Tr>
            <Td>Enforcement</Td>
            <Td>Attorney General only</Td>
            <Td>California Privacy Protection Agency (CPPA)</Td>
          </Tr>
          <Tr>
            <Td>Correction right</Td>
            <Td>Not included</Td>
            <Td>Right to correct inaccurate PI</Td>
          </Tr>
          <Tr>
            <Td>Data minimization</Td>
            <Td>Not explicit</Td>
            <Td>Explicit requirement</Td>
          </Tr>
          <Tr>
            <Td>Risk assessments</Td>
            <Td>Not required</Td>
            <Td>Required for high-risk processing</Td>
          </Tr>
          <Tr>
            <Td>Threshold</Td>
            <Td>50,000+ consumers or 50%+ revenue from data sales</Td>
            <Td>100,000+ consumers or derive 50%+ revenue from sharing</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Consumer Rights */}
      <SectionHeading>Consumer Rights Under CCPA/CPRA</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Right to Know (CCPA §1798.100 / CPRA §1798.100)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consumers can request disclosure of the categories and specific pieces
        of personal information collected. FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Maintains a data inventory mapping all personal information categories</li>
        <li>Provides API-based data export (JSON/CSV) within 45 days</li>
        <li>Records all data access requests for compliance documentation</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Right to Delete (CCPA §1798.105 / CPRA §1798.105)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consumers can request deletion of personal information, with limited
        exceptions (e.g., legal obligations, security). FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Implements immediate soft deletion with permanent purge after 30 days</li>
        <li>Anonymizes audit log references to preserve integrity</li>
        <li>Provides deletion confirmation and compliance record</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Right to Opt-Out of Sale/Sharing (CPRA §1798.120)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consumers can opt out of the sale or sharing of their personal
        information. FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Does not sell personal information</strong> — we have never
          sold PI and never will
        </li>
        <li>
          <strong>Does not share PI for cross-context behavioral advertising</strong>
        </li>
        <li>Publishes a clear &ldquo;Do Not Sell or Share My Personal Information&rdquo; notice</li>
        <li>Maintains an opt-out preference signal detection mechanism (GPC)</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Right to Correct (CPRA §1798.106)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consumers can request correction of inaccurate personal information.
        FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Enables self-service profile corrections via the dashboard</li>
        <li>Supports admin-initiated corrections through team management</li>
        <li>Records all corrections in the audit trail with before/after state</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Right to Limit Use of Sensitive PI (CPRA §1798.121)
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consumers can limit the use of sensitive personal information to
        specific business purposes. FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Does not collect sensitive PI</strong> as defined by CPRA
          (SSN, precise geolocation, biometric data, etc.)
        </li>
        <li>Processes only the minimum data necessary for flag evaluation</li>
        <li>Evaluation context is under your control — we don&apos;t inspect or profile it</li>
      </ul>

      {/* Data Inventory */}
      <SectionHeading>Data Inventory &amp; Mapping</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        CCPA/CPRA requires businesses to maintain a data inventory. As a service
        provider, FeatureSignals provides transparency into what data we process
        on your behalf:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Data Category</Th>
            <Th>Examples</Th>
            <Th>Purpose</Th>
            <Th>Retention</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Identifiers</Td>
            <Td>Name, email, IP address</Td>
            <Td>Account management, audit trail</Td>
            <Td>Account lifetime + 30 days</Td>
          </Tr>
          <Tr>
            <Td>Commercial information</Td>
            <Td>Subscription tier, billing history</Td>
            <Td>Billing, license enforcement</Td>
            <Td>7 years (tax requirements)</Td>
          </Tr>
          <Tr>
            <Td>Internet activity</Td>
            <Td>API request logs, evaluation history</Td>
            <Td>Performance, debugging</Td>
            <Td>90 days (logs), 1 year (audit)</Td>
          </Tr>
          <Tr>
            <Td>Professional information</Td>
            <Td>Organization, role</Td>
            <Td>Team management, RBAC</Td>
            <Td>Account lifetime + 30 days</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Opt-Out Mechanisms */}
      <SectionHeading>Opt-Out Mechanisms</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals provides multiple mechanisms for consumers to exercise
        their opt-out rights:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Global Privacy Control (GPC):</strong> We honor the GPC
          browser signal as a valid opt-out request
        </li>
        <li>
          <strong>Email request:</strong>{" "}
          <a href="mailto:privacy@featuresignals.com" className="text-[var(--signal-fg-accent)] hover:underline">
            privacy@featuresignals.com
          </a>
        </li>
        <li>
          <strong>Privacy request form:</strong>{" "}
          <Link href="/contact?reason=privacy" className="text-[var(--signal-fg-accent)] hover:underline">
            Online privacy request portal
          </Link>
        </li>
        <li>
          <strong>Toll-free number:</strong> Available to Enterprise customers
          for consumer-facing compliance support
        </li>
      </ul>

      {/* Verification */}
      <SectionHeading>Consumer Request Verification</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To prevent fraudulent requests, FeatureSignals verifies the identity of
        consumers making CCPA/CPRA requests:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Account-holder requests: verified through existing authentication</li>
        <li>Non-account requests: verified through email confirmation + identity challenge</li>
        <li>Authorized agent requests: verified through written authorization + direct consumer confirmation</li>
        <li>All verification is documented for compliance evidence</li>
      </ul>

      {/* Non-Discrimination */}
      <SectionHeading>Non-Discrimination</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        In accordance with CCPA §1798.125, FeatureSignals does not discriminate
        against consumers who exercise their CCPA/CPRA rights. Exercising your
        privacy rights will not result in denial of service, different pricing,
        or degraded quality of service.
      </p>

      {/* Contact */}
      <SectionHeading>Privacy Contact</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        For CCPA/CPRA inquiries, data subject requests, or privacy concerns:{" "}
        <a
          href="mailto:privacy@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          privacy@featuresignals.com
        </a>
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "GDPR Overview", href: "/docs/compliance/gdpr" },
          { label: "GDPR Data Subject Rights", href: "/docs/compliance/gdpr-rights" },
          { label: "ISO 27701 PIMS Overview", href: "/docs/compliance/iso27701/pims-overview" },
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
