import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Trash2, Download, Lock, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "GDPR Data Subject Rights",
  description:
    "How to exercise GDPR data subject rights — access, rectification, erasure, portability, objection — and how FeatureSignals helps you comply.",
};

export default function GdprRightsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        GDPR Data Subject Rights
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The GDPR grants individuals eight fundamental rights over their personal
        data. This guide explains each right, how to exercise it with
        FeatureSignals, and how our platform helps your organization meet its
        obligations as a data controller.
      </p>

      {/* Overview callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Controller vs. Processor
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              FeatureSignals acts as a <strong>data processor</strong> when you
              use our platform. Your organization is the{" "}
              <strong>data controller</strong> and is responsible for responding
              to data subject requests. FeatureSignals provides the technical
              capabilities to fulfill those requests.
            </p>
          </div>
        </div>
      </div>

      {/* Right of Access */}
      <SectionHeading>Right of Access (Article 15)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects can request a copy of all personal data you hold about
        them. FeatureSignals provides API endpoints and export tools to retrieve
        user data:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Export user profile data via the Management API</li>
        <li>Retrieve audit log entries scoped to the requesting user</li>
        <li>Download evaluation history associated with the user context</li>
        <li>Response time target: within 30 days (GDPR requirement)</li>
      </ul>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6">
        <p className="text-sm text-[var(--signal-fg-secondary)] font-mono">
          GET /v1/users/&#123;userId&#125;/data-export
        </p>
      </div>

      {/* Right to Rectification */}
      <SectionHeading>Right to Rectification (Article 16)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects can request correction of inaccurate or incomplete
        personal data. FeatureSignals enables:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Self-service profile updates via the Flag Engine dashboard</li>
        <li>Admin-initiated corrections through the team management interface</li>
        <li>API-based correction for automated workflows</li>
        <li>Audit trail records the before/after state of all corrections</li>
      </ul>

      {/* Right to Erasure */}
      <SectionHeading>Right to Erasure — &ldquo;Right to be Forgotten&rdquo; (Article 17)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects can request deletion of their personal data under specific
        circumstances. FeatureSignals implements a two-phase deletion process:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Soft delete (immediate):</strong> Account is deactivated, user
          cannot log in. Data is flagged for deletion but recoverable for 30
          days.
        </li>
        <li>
          <strong>Hard delete (day 31):</strong> All personal data is
          permanently purged. Audit log entries are anonymized (user ID replaced
          with a non-reversible hash). Backups cycle out within 90 days.
        </li>
      </ol>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6">
        <p className="text-sm text-[var(--signal-fg-secondary)] font-mono">
          DELETE /v1/users/&#123;userId&#125;/gdpr-erasure
        </p>
      </div>

      {/* Right to Portability */}
      <SectionHeading>Right to Data Portability (Article 20)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects can receive their personal data in a structured, commonly
        used, machine-readable format and transmit it to another controller.
        FeatureSignals supports:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Format</Th>
            <Th>Data Included</Th>
            <Th>Method</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>JSON</Td>
            <Td>Profile, team memberships, audit log entries</Td>
            <Td>API export endpoint</Td>
          </Tr>
          <Tr>
            <Td>CSV</Td>
            <Td>Evaluation history, flag change log</Td>
            <Td>Dashboard export</Td>
          </Tr>
          <Tr>
            <Td>Machine-readable archive</Td>
            <Td>Complete data package (all categories)</Td>
            <Td>Email request to DPO</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Right to Object */}
      <SectionHeading>Right to Object (Article 21)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects can object to processing of their personal data for direct
        marketing, research, or legitimate interest grounds. FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Does not use personal data for marketing or profiling</li>
        <li>Processes only the data necessary to provide the feature flag service</li>
        <li>Honors objection requests within 72 hours of receipt</li>
        <li>Maintains an objection register for compliance documentation</li>
      </ul>

      {/* Rights Related to Automated Decision-Making */}
      <SectionHeading>Rights Related to Automated Decision-Making (Article 22)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data subjects have the right not to be subject to decisions based solely
        on automated processing that produce legal effects. FeatureSignals:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Does <strong>not</strong> perform automated decision-making that has
          legal or similarly significant effects on individuals
        </li>
        <li>Flag evaluations are deterministic rule evaluations, not profiling</li>
        <li>Targeting rules are configured by your team, not by automated systems</li>
      </ul>

      {/* How FeatureSignals Helps */}
      <SectionHeading>How FeatureSignals Helps You Comply</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        As a data controller, your organization is responsible for handling data
        subject requests. FeatureSignals provides the infrastructure to make
        compliance straightforward:
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          {
            icon: FileText,
            title: "API-First Design",
            desc: "Every data subject right is backed by an API endpoint. Integrate DSAR fulfillment into your existing privacy workflow.",
          },
          {
            icon: Trash2,
            title: "Automated Erasure",
            desc: "Trigger GDPR-compliant deletion with a single API call. Soft delete with 30-day grace period, then permanent purge.",
          },
          {
            icon: Download,
            title: "Portable Exports",
            desc: "Export user data in JSON or CSV formats suitable for transmission to another controller.",
          },
          {
            icon: Lock,
            title: "Audit Trail Integrity",
            desc: "All access, rectification, and erasure operations are logged with SHA-256 chain hashing for tamper evidence.",
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

      {/* DPO Contact */}
      <SectionHeading>Data Protection Officer</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For GDPR inquiries, data subject requests, or to escalate a privacy
        concern:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Email:{" "}
          <a
            href="mailto:dpo@featuresignals.com"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            dpo@featuresignals.com
          </a>
        </li>
        <li>
          Privacy request form:{" "}
          <Link
            href="/contact?reason=privacy"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Contact Privacy Team
          </Link>
        </li>
        <li>Response SLA: within 72 hours for urgent requests, 30 days for standard DSARs</li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "GDPR Overview", href: "/docs/compliance/gdpr" },
          { label: "CCPA / CPRA Compliance", href: "/docs/compliance/ccpa-cpra" },
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
