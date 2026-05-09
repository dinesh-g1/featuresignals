import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, BarChart3, Mail, CreditCard, Brain, Globe, ArrowRight } from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "List of FeatureSignals subprocessors — infrastructure (AWS/GCP/Azure/Hetzner), monitoring, email, payment, and AI/LLM providers. Updated regularly with change notifications.",
};

interface Subprocessor {
  name: string;
  category: string;
  purpose: string;
  location: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const subprocessorCategories: { category: string; icon: React.ComponentType<{ size?: number; className?: string }>; subprocessors: Subprocessor[] }[] = [
  {
    category: "Cloud Infrastructure",
    icon: Cloud,
    subprocessors: [
      {
        name: "Hetzner",
        category: "Cloud Infrastructure",
        purpose: "Primary hosting provider — compute, storage, and networking for FeatureSignals Cloud (EU region).",
        location: "Germany (Falkenstein, Nuremberg), Finland (Helsinki)",
        icon: Cloud,
      },
      {
        name: "Amazon Web Services (AWS)",
        category: "Cloud Infrastructure",
        purpose: "Secondary cloud provider — compute, S3 object storage for backups, and Dedicated Cloud deployments in US and APAC regions.",
        location: "US (us-east-1), EU (eu-west-1), Asia Pacific (ap-southeast-1)",
        icon: Cloud,
      },
      {
        name: "Google Cloud Platform (GCP)",
        category: "Cloud Infrastructure",
        purpose: "Optional hosting for Dedicated Cloud customers who prefer GCP. Cloud Storage for customer-configured backup targets.",
        location: "US, EU, Asia Pacific (customer-selected region)",
        icon: Cloud,
      },
      {
        name: "Microsoft Azure",
        category: "Cloud Infrastructure",
        purpose: "Optional hosting for Dedicated Cloud customers who prefer Azure. Blob Storage for customer-configured backup targets.",
        location: "US, EU, Asia Pacific (customer-selected region)",
        icon: Cloud,
      },
    ],
  },
  {
    category: "Monitoring & Observability",
    icon: BarChart3,
    subprocessors: [
      {
        name: "SigNoz",
        category: "Monitoring & Observability",
        purpose: "Metrics, distributed tracing, and alerting for the FeatureSignals platform. Self-hosted on Hetzner infrastructure. No customer data leaves our infrastructure.",
        location: "Germany (self-hosted on FeatureSignals infrastructure)",
        icon: BarChart3,
      },
    ],
  },
  {
    category: "Email & Communication",
    icon: Mail,
    subprocessors: [
      {
        name: "Email Service Provider",
        category: "Email & Communication",
        purpose: "Transactional email delivery — account verification, password resets, invitation emails, and notification digests.",
        location: "US, EU (data routed to customer's region)",
        icon: Mail,
      },
    ],
  },
  {
    category: "Payment Processing",
    icon: CreditCard,
    subprocessors: [
      {
        name: "Stripe",
        category: "Payment Processing",
        purpose: "Subscription billing, invoice generation, and payment processing for credit/debit cards. FeatureSignals never stores full payment card details.",
        location: "US, with global payment processing",
        icon: CreditCard,
      },
      {
        name: "Razorpay",
        category: "Payment Processing",
        purpose: "Payment processing for Indian customers (INR billing). UPI, net banking, and card payments.",
        location: "India",
        icon: CreditCard,
      },
      {
        name: "Paddle",
        category: "Payment Processing",
        purpose: "Merchant of record for international customers. Handles VAT, GST, and sales tax compliance.",
        location: "UK, with global operations",
        icon: CreditCard,
      },
    ],
  },
  {
    category: "AI / LLM Providers",
    icon: Brain,
    subprocessors: [
      {
        name: "AI/LLM Provider",
        category: "AI / LLM Providers",
        purpose: "Powers the AI Janitor feature for stale flag detection and flag cleanup recommendations. Processes flag metadata only — flag keys, names, evaluation counts, and last-evaluated timestamps. No targeting rules, user data, or evaluation context is sent to the LLM provider.",
        location: "US (Enterprise customers can opt out or configure to EU-only processing)",
        icon: Brain,
      },
    ],
  },
];

export default function SubprocessorsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Subprocessors
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals uses the following subprocessors to deliver the service. This page is
        updated regularly as subprocessors change. Enterprise customers are notified of new
        subprocessors at least 30 days in advance.
      </p>

      <Callout variant="info">
        <strong>Last updated:</strong> Q1 2026.{" "}
        <Link href="/docs/compliance/dpa-template" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
          View the DPA
        </Link>{" "}
        for contractual details on subprocessor engagement. Enterprise customers can subscribe to
        subprocessor change notifications in FlagEngine at{" "}
        <InlineCode>Settings &rarr; Organization &rarr; Notifications</InlineCode>.
      </Callout>

      {/* Subprocessor Categories */}
      {subprocessorCategories.map((category) => {
        const CatIcon = category.icon;
        return (
          <div key={category.category} className="mb-8">
            <SectionHeading>
              <span className="flex items-center gap-2">
                <CatIcon size={18} className="text-[var(--signal-fg-accent)]" />
                {category.category}
              </span>
            </SectionHeading>
            <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)]">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                    <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Subprocessor</th>
                    <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Data Location</th>
                  </tr>
                </thead>
                <tbody>
                  {category.subprocessors.map((sub) => (
                    <tr
                      key={sub.name}
                      className="border-b border-[var(--signal-border-default)] last:border-b-0"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                        {sub.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                        {sub.purpose}
                      </td>
                      <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe size={14} className="text-[var(--signal-fg-accent)]" />
                          {sub.location}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Data Processing by Subprocessors */}
      <SectionHeading>What Data Subprocessors Access</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Each subprocessor accesses only the minimum data necessary to perform its function:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Infrastructure providers</strong> — Host the application, database, and
          backups. Have access to infrastructure-level data but not application-level
          customer data. All data encrypted at rest (AES-256).
        </li>
        <li>
          <strong>Monitoring</strong> — SigNoz processes metrics and traces. Traces may
          include API endpoint paths and latency data but exclude request bodies and
          authentication tokens. Self-hosted on our infrastructure.
        </li>
        <li>
          <strong>Email provider</strong> — Receives email addresses and email content
          for delivery. Does not have access to any other FeatureSignals data.
        </li>
        <li>
          <strong>Payment processors</strong> — Receive billing contact information and
          payment method details. Do not have access to feature flag data, evaluation
          data, or audit logs.
        </li>
        <li>
          <strong>AI/LLM provider</strong> — Receives flag metadata only (keys, names,
          evaluation counts, timestamps) for stale flag analysis. No targeting rules,
          user data, or evaluation context is shared. Enterprise customers can disable
          AI Janitor entirely.
        </li>
      </ul>

      {/* Objecting to Subprocessors */}
      <SectionHeading>Objecting to Subprocessors</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Enterprise customers may object to new subprocessors within 15 days of notification:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Email your objection to <strong>legal@featuresignals.com</strong> with
          specifics about which subprocessor you object to and the reason.
        </li>
        <li>
          FeatureSignals will work with you to find a reasonable accommodation —
          this may include data region restrictions, opting you out of the specific
          feature, or configuring an alternative provider.
        </li>
        <li>
          If accommodation is not possible, you may terminate the affected service
          without penalty, as provided in the DPA.
        </li>
      </ol>

      <Callout variant="warning">
        For Dedicated Cloud and Self-Hosted deployments, subprocessors are limited to those
        you explicitly choose to integrate. Your FeatureSignals instance does not share data
        with any subprocessor unless you configure the integration (e.g., adding a webhook
        URL, connecting an email provider, or enabling the AI Janitor).
      </Callout>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Data Processing Agreement", href: "/docs/compliance/dpa-template" },
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

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}
