import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Users,
  Key,
  Globe,
  Download,
  Headphones,
  Clock,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Enterprise Overview",
  description:
    "FeatureSignals Enterprise — SSO/SAML, SCIM provisioning, custom roles, IP allowlisting, audit log export, priority support, and SLA guarantees for teams that need more.",
};

const features = [
  {
    icon: Shield,
    title: "SSO / SAML",
    description:
      "Single sign-on via SAML 2.0. Integrate with Okta, Azure AD, Google Workspace, OneLogin, and any SAML-compatible identity provider. Enforce MFA at the IdP level.",
  },
  {
    icon: Users,
    title: "SCIM Provisioning",
    description:
      "Automate user lifecycle management with SCIM 2.0. Provision and deprovision users, sync group memberships, and manage roles — all from your identity provider.",
  },
  {
    icon: Key,
    title: "Custom Roles",
    description:
      "Create fine-grained IAM roles beyond the built-in Admin, Editor, and Viewer. Define permissions per resource type, per environment, per project — the way your team works.",
  },
  {
    icon: Globe,
    title: "IP Allowlisting",
    description:
      "Restrict access to the FeatureSignals dashboard and API by IP range. Enforce network-level security so only traffic from your corporate VPN or office CIDRs reaches your flags.",
  },
  {
    icon: Download,
    title: "Audit Log Export",
    description:
      "Export complete audit logs to your SIEM, data warehouse, or compliance archive. Stream events in real-time via webhooks or batch-export as CSV/JSON.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description:
      "Dedicated Slack channel, 1-hour response SLA for P1 incidents, and a named solutions engineer who knows your setup. We answer before you finish your coffee.",
  },
  {
    icon: Clock,
    title: "SLA Guarantees",
    description:
      "99.95% uptime SLA for FeatureSignals Cloud. 99.99% for Dedicated Cloud deployments. Financially backed with service credits — we put our money where our uptime is.",
  },
];

export default function EnterpriseOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Enterprise Overview
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals Enterprise is built for teams that need advanced security, compliance,
        and administrative controls. SSO, SCIM, custom IAM, IP allowlisting, audit log export,
        and financially-backed SLAs — everything you need to run feature flags at scale in a
        regulated environment.
      </p>

      {/* Feature Grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="p-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[var(--signal-bg-accent-muted)] shrink-0">
                  <Icon size={18} className="text-[var(--signal-fg-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployment Options */}
      <SectionHeading>Deployment Options</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Plan</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Deployment</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">SLA</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Best For</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                plan: "Enterprise Cloud",
                deployment: "Multi-tenant SaaS",
                sla: "99.95%",
                best: "Most enterprises. Fastest time to value.",
              },
              {
                plan: "Enterprise Dedicated",
                deployment: "Single-tenant, your cloud",
                sla: "99.99%",
                best: "Compliance-heavy, data residency, isolated infra.",
              },
              {
                plan: "Enterprise Self-Hosted",
                deployment: "Your infrastructure",
                sla: "Your SLA",
                best: "Regulated, air-gapped, or fully self-managed.",
              },
            ].map((row) => (
              <tr
                key={row.plan}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                  {row.plan}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.deployment}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.sla}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.best}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Getting Started */}
      <SectionHeading>Getting Started with Enterprise</SectionHeading>
      <ol className="list-decimal pl-6 space-y-3 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Contact sales</strong> — Reach out to discuss your team&apos;s needs,
          compliance requirements, and deployment model.
        </li>
        <li>
          <strong>Security review</strong> — We&apos;ll share our SOC 2 report, penetration
          test results, and architecture documentation.
        </li>
        <li>
          <strong>Proof of concept</strong> — Spin up a dedicated instance in your
          cloud and validate against your requirements.
        </li>
        <li>
          <strong>Onboarding</strong> — SSO setup, SCIM configuration, team provisioning,
          and a guided walkthrough of enterprise features.
        </li>
      </ol>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Enterprise Onboarding Guide", href: "/docs/enterprise/onboarding" },
          { label: "Security & Compliance", href: "/docs/compliance/security-overview" },
          { label: "Architecture Overview", href: "/docs/architecture/overview" },
          { label: "Contact Enterprise Sales", href: "/contact" },
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
