import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Server, Cloud, Wrench, Code } from "lucide-react";

export const metadata: Metadata = {
  title: "Infrastructure as Code Overview",
  description:
    "Manage FeatureSignals resources as code using Terraform, Pulumi, or Ansible. Supported resources: projects, environments, flags, segments, API keys, webhooks.",
};

const iacProviders = [
  {
    icon: Server,
    title: "Terraform",
    description:
      "Declarative HCL-based infrastructure provisioning. The FeatureSignals Terraform provider lets you manage flags, segments, environments, API keys, and webhooks as Terraform resources with full state management and drift detection.",
    href: "/docs/iac/terraform",
  },
  {
    icon: Cloud,
    title: "Pulumi",
    description:
      "Infrastructure as code in TypeScript, Python, Go, or C#. The FeatureSignals Pulumi provider brings feature flag management into your existing Pulumi stacks with full IDE autocompletion and type safety.",
    href: "/docs/iac/pulumi",
  },
  {
    icon: Wrench,
    title: "Ansible",
    description:
      "Agentless configuration management with YAML playbooks. The FeatureSignals Ansible collection provides modules for automating flag lifecycle, segment management, and environment configuration across your infrastructure.",
    href: "/docs/iac/ansible",
  },
];

const supportedResources = [
  {
    name: "Projects",
    description: "Create and manage projects that organize your flags by application or service.",
  },
  {
    name: "Environments",
    description: "Define development, staging, and production environments with environment-specific flag overrides.",
  },
  {
    name: "Feature Flags",
    description: "Full flag lifecycle management — create, update, toggle, archive, and delete flags.",
  },
  {
    name: "Segments",
    description: "Target user cohorts with reusable targeting rules defined as code.",
  },
  {
    name: "API Keys",
    description: "Provision and rotate server-side and client-side API keys for your SDKs.",
  },
  {
    name: "Webhooks",
    description: "Configure webhook endpoints for flag change events, evaluation metrics, and audit log streaming.",
  },
];

export default function IaCOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Infrastructure as Code Overview
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Manage FeatureSignals resources as code using Terraform, Pulumi, or Ansible.
        Define your feature flags, segments, environments, and API keys alongside your
        application infrastructure — version-controlled, repeatable, and auditable.
      </p>

      {/* Why IaC */}
      <SectionHeading>Why Infrastructure as Code?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Feature flags are infrastructure. When a flag controls whether a payment integration
        is active or a new checkout flow is visible, that flag should be managed with the same
        rigor as your database schema or Kubernetes manifests. IaC brings:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-8">
        <li>
          <strong>Version control</strong> — Every flag change is a commit with context.
        </li>
        <li>
          <strong>Review workflow</strong> — Flag changes go through PR review before deployment.
        </li>
        <li>
          <strong>Drift detection</strong> — IaC reconciles desired state with actual state.
        </li>
        <li>
          <strong>Reproducibility</strong> — Spin up new environments with the exact flag configuration.
        </li>
        <li>
          <strong>Audit trail</strong> — Git history provides a complete record of who changed what and why.
        </li>
      </ul>

      {/* Provider Choices */}
      <SectionHeading>Choose Your Provider</SectionHeading>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {iacProviders.map((provider) => {
          const Icon = provider.icon;
          return (
            <Link
              key={provider.href}
              href={provider.href}
              className="group block p-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)] hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[var(--signal-bg-accent-muted)] shrink-0">
                  <Icon size={18} className="text-[var(--signal-fg-accent)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] group-hover:text-[var(--signal-fg-accent)] transition-colors">
                  {provider.title}
                </h3>
              </div>
              <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed mb-3">
                {provider.description}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--signal-fg-accent)]">
                View docs <ArrowRight size={12} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Supported Resources */}
      <SectionHeading>Supported Resources</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                Resource
              </th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {supportedResources.map((resource) => (
              <tr
                key={resource.name}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-[var(--signal-fg-primary)]">
                  <Code size={14} className="inline mr-2 text-[var(--signal-fg-accent)]" />
                  {resource.name}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {resource.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Getting Started */}
      <SectionHeading>Getting Started</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        All IaC providers use the FeatureSignals API under the hood. You&apos;ll need an API
        key with the appropriate permissions. Create one from your{" "}
        <Link href="/docs/getting-started/quickstart" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
          FlagEngine dashboard
        </Link>{" "}
        or via the API:
      </p>
      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)] overflow-x-auto">
        <pre className="whitespace-pre">
{`# Set your API token as an environment variable
export FEATURESIGNALS_API_TOKEN="fs_api_..."`}
        </pre>
      </div>
      <p className="text-[var(--signal-fg-secondary)]">
        Then follow the provider-specific guide for Terraform, Pulumi, or Ansible to start
        managing your flags as code.
      </p>
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
