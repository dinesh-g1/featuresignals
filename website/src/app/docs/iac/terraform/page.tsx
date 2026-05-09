import type { Metadata } from "next";
import Link from "next/link";
import { Download, Key, Shield, BookOpen } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Terraform Provider",
  description:
    "Use the FeatureSignals Terraform provider to manage feature flags, segments, environments, API keys, and webhooks as HCL resources with full state management.",
};

export default function TerraformProviderPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Terraform Provider
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Use the FeatureSignals Terraform provider to manage your feature flags, segments,
        environments, API keys, and webhooks as Terraform resources. Declarative, version-controlled,
        and integrated with your existing Terraform workflows.
      </p>

      {/* Installation */}
      <SectionHeading>Installation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Declare the FeatureSignals provider in your Terraform configuration. The provider is
        available in the Terraform Registry:
      </p>
      <CodeBlock language="hcl" title="versions.tf">
{`terraform {
  required_version = ">= 1.0"
  required_providers {
    featuresignals = {
      source  = "featuresignals/featuresignals"
      version = "~> 1.0"
    }
  }
}`}
      </CodeBlock>

      {/* Provider Configuration */}
      <SectionHeading>Provider Configuration</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Configure the provider with your API token. Use environment variables or Terraform
        variables to keep secrets out of your configuration files:
      </p>
      <CodeBlock language="hcl" title="provider.tf">
{`# Provider configuration
provider "featuresignals" {
  # Prefer environment variable: export FEATURESIGNALS_API_TOKEN="fs_api_..."
  # api_token = var.featuresignals_api_token

  # Optional: custom API endpoint for self-hosted deployments
  # api_url = "https://featuresignals.yourcompany.com"
}`}
      </CodeBlock>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Set the <InlineCode>FEATURESIGNALS_API_TOKEN</InlineCode> environment variable
        instead of hardcoding tokens in your Terraform files. Terraform automatically
        reads this variable when <InlineCode>api_token</InlineCode> is not set.
      </p>

      {/* Resource: Feature Flag */}
      <SectionHeading>Resource: Feature Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Create and manage feature flags with full lifecycle support:
      </p>
      <CodeBlock language="hcl" title="flags.tf">
{`# A simple boolean feature flag
resource "featuresignals_flag" "dark_mode" {
  project_key = featuresignals_project.webapp.key
  key         = "dark-mode"
  name        = "Dark Mode"
  description = "Enable the new dark mode UI"
  type        = "boolean"
  default_value = jsonencode(false)
}

# A multi-variant flag with targeting rules
resource "featuresignals_flag" "checkout_v2" {
  project_key = featuresignals_project.webapp.key
  key         = "checkout-v2"
  name        = "Checkout v2"
  description = "New checkout experience with saved payment methods"
  type        = "boolean"
  default_value = jsonencode(false)

  # Gradual rollout targeting
  targeting {
    rule {
      attribute  = "email"
      operator   = "ends_with"
      values     = ["@beta.featuresignals.com"]
      serve_value = true
    }
  }

  # Percentage rollout for remaining traffic
  rollout {
    percentage = 10
    serve_value = true
  }
}`}
      </CodeBlock>

      {/* Resource: Segment */}
      <SectionHeading>Resource: Segment</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Define reusable targeting segments that can be shared across multiple flags:
      </p>
      <CodeBlock language="hcl" title="segments.tf">
{`resource "featuresignals_segment" "beta_users" {
  project_key = featuresignals_project.webapp.key
  key         = "beta-users"
  name        = "Beta Users"
  description = "Users enrolled in the beta program"

  rule {
    attribute = "email"
    operator  = "ends_with"
    values    = ["@beta.featuresignals.com", "@testers.featuresignals.com"]
  }

  rule {
    attribute = "beta_access"
    operator  = "is"
    values    = ["true"]
  }
}`}
      </CodeBlock>

      {/* Resource: Environment */}
      <SectionHeading>Resource: Environment</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Create environments and manage environment-specific flag overrides:
      </p>
      <CodeBlock language="hcl" title="environments.tf">
{`resource "featuresignals_environment" "staging" {
  project_key = featuresignals_project.webapp.key
  key         = "staging"
  name        = "Staging"
  description = "Pre-production staging environment"
}

resource "featuresignals_environment" "production" {
  project_key = featuresignals_project.webapp.key
  key         = "production"
  name        = "Production"
  description = "Production environment"

  # Require change requests for flags in production
  require_change_request = true
}`}
      </CodeBlock>

      {/* Resource: API Key */}
      <SectionHeading>Resource: API Key</SectionHeading>
      <CodeBlock language="hcl" title="api_keys.tf">
{`resource "featuresignals_api_key" "server_sdk" {
  project_key = featuresignals_project.webapp.key
  name        = "Production Server SDK"
  type        = "server"
  environment_keys = [featuresignals_environment.production.key]
}

resource "featuresignals_api_key" "client_sdk" {
  project_key = featuresignals_project.webapp.key
  name        = "Production Client SDK"
  type        = "client"
  environment_keys = [featuresignals_environment.production.key]
}`}
      </CodeBlock>

      {/* Resource: Webhook */}
      <SectionHeading>Resource: Webhook</SectionHeading>
      <CodeBlock language="hcl" title="webhooks.tf">
{`resource "featuresignals_webhook" "slack_changes" {
  project_key = featuresignals_project.webapp.key
  name        = "Slack Flag Changes"
  url         = "https://hooks.slack.com/services/T.../B.../..."
  events      = ["flag.created", "flag.updated", "flag.toggled"]
  secret      = var.webhook_signing_secret
}`}
      </CodeBlock>

      {/* Full Example */}
      <SectionHeading>Complete Example</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Here&apos;s a complete Terraform configuration that provisions a project with
        environments, flags, segments, and API keys:
      </p>
      <CodeBlock language="hcl" title="main.tf">
{`resource "featuresignals_project" "webapp" {
  key         = "webapp"
  name        = "Web Application"
  description = "Main customer-facing web application"
}

resource "featuresignals_environment" "staging" {
  project_key = featuresignals_project.webapp.key
  key         = "staging"
  name        = "Staging"
}

resource "featuresignals_environment" "production" {
  project_key = featuresignals_project.webapp.key
  key         = "production"
  name        = "Production"
}

resource "featuresignals_segment" "internal" {
  project_key = featuresignals_project.webapp.key
  key         = "internal-users"
  name        = "Internal Users"

  rule {
    attribute = "email"
    operator  = "ends_with"
    values    = ["@featuresignals.com"]
  }
}

resource "featuresignals_flag" "new_dashboard" {
  project_key = featuresignals_project.webapp.key
  key         = "new-dashboard"
  name        = "New Dashboard"
  type        = "boolean"
  default_value = jsonencode(false)

  targeting {
    rule {
      segment_key = featuresignals_segment.internal.key
      serve_value = true
    }
  }
}

resource "featuresignals_api_key" "prod_sdk" {
  project_key      = featuresignals_project.webapp.key
  name             = "Production SDK Key"
  type             = "server"
  environment_keys = [featuresignals_environment.production.key]
}`}
      </CodeBlock>

      {/* State Management */}
      <SectionHeading>State Management</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The provider supports full Terraform state management:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Plan</strong> — Run <InlineCode>terraform plan</InlineCode> to preview
          changes before applying. The provider computes the diff between your configuration
          and the live FeatureSignals state.
        </li>
        <li>
          <strong>Apply</strong> — <InlineCode>terraform apply</InlineCode> provisions
          resources idempotently.
        </li>
        <li>
          <strong>Import</strong> — Use{" "}
          <InlineCode>terraform import</InlineCode> to bring existing flags and segments
          under Terraform management.
        </li>
        <li>
          <strong>Destroy</strong> — <InlineCode>terraform destroy</InlineCode> cleans up
          resources. Production environments are protected by default.
        </li>
      </ul>

      {/* Import Existing */}
      <SectionHeading>Importing Existing Resources</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Already have flags in FeatureSignals? Import them into Terraform state:
      </p>
      <CodeBlock language="bash" title="Import existing flag">
{`# Import a flag by project key and flag key
terraform import featuresignals_flag.dark_mode webapp/dark-mode

# Import a segment
terraform import featuresignals_segment.beta_users webapp/beta-users`}
      </CodeBlock>

      {/* Helpful Links */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { icon: BookOpen, label: "IaC Overview", href: "/docs/iac/overview" },
          { icon: Download, label: "Terraform Registry — FeatureSignals Provider", href: "https://registry.terraform.io/providers/featuresignals/featuresignals" },
          { icon: Key, label: "API Keys Documentation", href: "/docs/api-reference/api-keys" },
          { icon: Shield, label: "Security Best Practices", href: "/docs/advanced/security" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <link.icon size={14} />
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
