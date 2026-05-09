import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Eye, Database, Trash2, Globe, ArrowRight } from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "FeatureSignals privacy policy covering data collection, processing, storage, user rights, and compliance commitments under GDPR, CCPA, and other frameworks.",
};

export default function PrivacyPolicyPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Privacy Policy
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals is committed to protecting your privacy. This policy explains what data
        we collect, how we process it, where we store it, and what rights you have over your
        data. We comply with GDPR, CCPA, and other applicable data protection frameworks.
      </p>

      <Callout variant="info">
        This is a summary of our privacy practices. For the full legal privacy policy, visit{" "}
        <Link href="/privacy-policy" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
          featuresignals.com/privacy-policy
        </Link>.
      </Callout>

      {/* Data Collection */}
      <SectionHeading>Data We Collect</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals collects only the data necessary to provide the feature flag service.
        We do not sell data, and we never use customer data for purposes beyond delivering
        and improving the service.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {[
          {
            icon: Eye,
            title: "Account Data",
            items: [
              "Email address (required for login)",
              "Name (optional, for display)",
              "Organization name",
              "Role and team membership",
              "Authentication method (SSO, password)",
            ],
          },
          {
            icon: Database,
            title: "Service Data",
            items: [
              "Feature flag keys, names, and descriptions",
              "Targeting rules and segment definitions",
              "Evaluation events (flag key + user key + result)",
              "Audit log entries (who changed what and when)",
              "API key metadata (name, type, environment scope)",
            ],
          },
          {
            icon: Globe,
            title: "Usage Data",
            items: [
              "API request metadata (endpoint, latency, status)",
              "SDK version and language",
              "Aggregated evaluation counts",
              "Dashboard page views and feature usage",
              "Error and crash reports (anonymized)",
            ],
          },
          {
            icon: Shield,
            title: "What We Don&apos;t Collect",
            items: [
              "User targeting attributes beyond what you configure",
              "End-user personal data (PII) in evaluation context",
              "Browser fingerprints or device IDs",
              "Payment card details (handled by Stripe)",
              "Third-party tracking data for advertising",
            ],
          },
        ].map((section) => (
          <div
            key={section.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <section.icon size={16} className="text-[var(--signal-fg-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                {section.title}
              </h3>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--signal-fg-secondary)]">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Data Processing */}
      <SectionHeading>How We Process Data</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        All data processing is tied to providing the feature flag service:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Evaluation processing</strong> — Flag evaluation context (user key, custom
          attributes) is processed in-memory during flag resolution and is not persisted
          beyond the evaluation event record.
        </li>
        <li>
          <strong>Flag management</strong> — Flag configurations, targeting rules, and
          segments are stored in PostgreSQL and cached in Redis for performance.
        </li>
        <li>
          <strong>Audit logging</strong> — All mutations to flags, segments, and
          environments are recorded in an immutable audit log. Audit entries are retained
          per your data retention settings.
        </li>
        <li>
          <strong>Analytics</strong> — Aggregated, anonymized usage analytics help us
          improve the product. Individual evaluation data is never used for analytics.
        </li>
      </ul>

      {/* Data Storage */}
      <SectionHeading>Data Storage &amp; Transfer</SectionHeading>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Primary storage:</strong> Data is stored in the cloud region you select
          during onboarding (EU, US, or APAC). For Dedicated Cloud, data stays within your
          own cloud account.
        </li>
        <li>
          <strong>Encryption at rest:</strong> All data at rest is encrypted with AES-256.
          Database volumes, backups, and object storage all use encryption by default.
        </li>
        <li>
          <strong>Encryption in transit:</strong> All connections use TLS 1.3. HTTP is
          redirected to HTTPS. HSTS is enforced with a 1-year max-age.
        </li>
        <li>
          <strong>Cross-border transfers:</strong> For customers on our EU infrastructure,
          data does not leave the EU. We maintain Data Privacy Framework (DPF) certification
          for EU-U.S. data transfers where applicable.
        </li>
      </ul>

      {/* User Rights */}
      <SectionHeading>Your Data Rights</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Depending on your jurisdiction, you have the following rights over your data:
      </p>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Right</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Description</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">How to Exercise</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                right: "Access",
                description: "Request a copy of your personal data.",
                how: "Email privacy@featuresignals.com",
              },
              {
                right: "Rectification",
                description: "Correct inaccurate or incomplete data.",
                how: "Update in FlagEngine settings or contact support",
              },
              {
                right: "Erasure",
                description: "Request deletion of your personal data.",
                how: "Email privacy@featuresignals.com with specifics",
              },
              {
                right: "Portability",
                description: "Receive your data in a machine-readable format.",
                how: "Export via FlagEngine or API; email for custom exports",
              },
              {
                right: "Objection",
                description: "Object to certain types of processing.",
                how: "Email privacy@featuresignals.com with your objection",
              },
            ].map((row) => (
              <tr
                key={row.right}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                  {row.right}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.description}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.how}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compliance */}
      <SectionHeading>Compliance Commitments</SectionHeading>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>GDPR</strong> — We act as a data processor for customer data. Our DPA
          includes Standard Contractual Clauses (SCCs) for international transfers.
        </li>
        <li>
          <strong>CCPA/CPRA</strong> — We do not sell personal information. California
          residents may exercise their rights under CCPA by contacting us.
        </li>
        <li>
          <strong>SOC 2</strong> — We maintain SOC 2 Type II compliance. Our latest report
          is available to Enterprise customers under NDA.
        </li>
        <li>
          <strong>ISO 27001</strong> — Our Information Security Management System (ISMS)
          is aligned with ISO 27001. Certification is on our roadmap.
        </li>
      </ul>

      <Callout variant="info">
        Questions about privacy? Contact our Data Protection Officer at{" "}
        <strong>privacy@featuresignals.com</strong>. We respond to all privacy inquiries
        within 72 hours.
      </Callout>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Data Processing Agreement", href: "/docs/compliance/dpa-template" },
          { label: "Data Retention Policy", href: "/docs/compliance/data-retention" },
          { label: "Subprocessors", href: "/docs/compliance/subprocessors" },
          { label: "Security Overview", href: "/docs/compliance/security-overview" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{link.label}</span>
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
