import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Server, Lock, Users, ArrowRight } from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description:
    "FeatureSignals Data Processing Agreement (DPA) template — data processing scope, subprocessor list, technical and organizational measures, and how to execute the DPA.",
};

const technicalMeasures = [
  {
    icon: Lock,
    title: "Encryption",
    description:
      "AES-256 encryption at rest for all databases, backups, and object storage. TLS 1.3 for all data in transit. HSTS enforced with 1-year max-age.",
  },
  {
    icon: Shield,
    title: "Access Control",
    description:
      "RBAC with fine-grained permissions. SAML SSO with MFA enforcement. IP allowlisting. All access logged in immutable audit trail. No standing production access for engineers.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description:
      "Infrastructure as Code with immutable deployments. Host-based firewalls. Automatic security patching. Regular vulnerability scanning. Intrusion detection on all production systems.",
  },
  {
    icon: Users,
    title: "Organizational Measures",
    description:
      "Background checks for all employees. Annual security awareness training. Incident response plan tested quarterly. Dedicated Data Protection Officer. SOC 2 Type II audited annually.",
  },
];

export default function DPATemplatePage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Data Processing Agreement
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        This Data Processing Agreement (DPA) governs the processing of personal data by
        FeatureSignals on behalf of our customers. It incorporates the EU Standard Contractual
        Clauses (SCCs), defines the scope of processing, lists our subprocessors, and describes
        the technical and organizational measures we maintain to protect your data.
      </p>

      <Callout variant="info" title="How to Execute">
        Enterprise customers receive a pre-signed DPA during onboarding. If you need to
        execute a DPA before starting a trial, email{" "}
        <strong>legal@featuresignals.com</strong> and we&apos;ll return a countersigned copy
        within 2 business days.
      </Callout>

      {/* Scope */}
      <SectionHeading>Data Processing Scope</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals acts as a <strong>data processor</strong>. You, the customer, are the{" "}
        <strong>data controller</strong>. The DPA covers all personal data processed through
        the FeatureSignals service, which falls into these categories:
      </p>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Category</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Examples</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                category: "Account data",
                examples: "Email, name, organization",
                purpose: "User authentication and account management",
              },
              {
                category: "Configuration data",
                examples: "Flag keys, targeting rules, segment definitions",
                purpose: "Providing the feature flag service",
              },
              {
                category: "Evaluation context",
                examples: "User keys, custom targeting attributes",
                purpose: "Flag evaluation and targeting",
              },
              {
                category: "Audit data",
                examples: "Action logs, timestamps, actor IDs",
                purpose: "Security, compliance, and debugging",
              },
              {
                category: "Support data",
                examples: "Support tickets, debug logs",
                purpose: "Customer support and troubleshooting",
              },
            ].map((row) => (
              <tr
                key={row.category}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                  {row.category}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.examples}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.purpose}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Processing Details */}
      <SectionHeading>Processing Details</SectionHeading>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Subject matter:</strong> Provision of feature flag management, evaluation,
          and related services as described in the Master Services Agreement.
        </li>
        <li>
          <strong>Duration:</strong> For the term of the Master Services Agreement plus any
          post-termination retention period (maximum 30 days, unless otherwise agreed).
        </li>
        <li>
          <strong>Nature and purpose:</strong> Hosting, storing, and processing feature flag
          configurations, evaluation requests, and audit logs to deliver the service.
        </li>
        <li>
          <strong>Data subjects:</strong> Your authorized users (employees, contractors) and
          end-users whose data is used in evaluation context (user keys, targeting attributes).
        </li>
        <li>
          <strong>Personal data categories:</strong> Identification data (email, name, user
          key), professional data (organization, role), and technical data (IP address,
          evaluation context attributes you configure).
        </li>
      </ul>

      {/* Technical Measures */}
      <SectionHeading>Technical &amp; Organizational Measures</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals implements the following technical and organizational measures to
        protect personal data, as required by Article 32 of the GDPR:
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {technicalMeasures.map((measure) => (
          <div
            key={measure.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div className="flex items-start gap-3">
              <measure.icon
                size={18}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                  {measure.title}
                </h3>
                <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                  {measure.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subprocessors */}
      <SectionHeading>Subprocessors</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals engages the following categories of subprocessors. A complete list
        of subprocessors is maintained on our{" "}
        <Link href="/docs/compliance/subprocessors" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
          Subprocessors page
        </Link>:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Cloud infrastructure providers</strong> — AWS, GCP, Azure, Hetzner (for
          hosting, compute, storage, and networking).
        </li>
        <li>
          <strong>Monitoring and observability</strong> — SigNoz (for metrics, traces,
          and alerting).
        </li>
        <li>
          <strong>Email and communication</strong> — Email delivery provider (for
          transactional emails and notifications).
        </li>
        <li>
          <strong>Payment processing</strong> — Stripe, Razorpay, Paddle (for billing
          and subscription management).
        </li>
        <li>
          <strong>AI/LLM providers</strong> — For the AI Janitor feature (optional;
          Enterprise customers can disable this).
        </li>
      </ul>

      <Callout variant="info">
        We notify customers of new subprocessors at least 30 days before they begin
        processing data. Enterprise customers subscribed to subprocessor notifications
        receive email alerts. You may object to new subprocessors within 15 days of
        notification.
      </Callout>

      {/* Data Subject Rights */}
      <SectionHeading>Data Subject Rights &amp; Cooperation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals will:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Assist you in fulfilling data subject access requests (DSARs) within the
          timeframes required by applicable law.
        </li>
        <li>
          Notify you without undue delay upon becoming aware of a personal data breach.
        </li>
        <li>
          Cooperate with supervisory authorities and provide reasonable assistance for
          data protection impact assessments (DPIAs).
        </li>
        <li>
          Make available all information necessary to demonstrate compliance with the
          obligations laid down in Article 28 of the GDPR.
        </li>
      </ul>

      {/* International Transfers */}
      <SectionHeading>International Data Transfers</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For customers in the EU/EEA, UK, or Switzerland, the DPA incorporates the applicable
        Standard Contractual Clauses (SCCs) to ensure adequate safeguards for international
        data transfers:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>EU/EEA:</strong> EU Standard Contractual Clauses (2021/914), Module 2
          (Controller-to-Processor).
        </li>
        <li>
          <strong>UK:</strong> UK International Data Transfer Addendum to the EU SCCs.
        </li>
        <li>
          <strong>Switzerland:</strong> Swiss Addendum to the EU SCCs.
        </li>
        <li>
          <strong>Data residency:</strong> Customers may select their primary data region
          (EU, US, or APAC). Data does not leave the selected region except as described
          in the subprocessor list.
        </li>
      </ul>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Subprocessors", href: "/docs/compliance/subprocessors" },
          { label: "Privacy Policy", href: "/docs/compliance/privacy-policy" },
          { label: "Data Retention Policy", href: "/docs/compliance/data-retention" },
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
