import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileCode,
  Terminal,
  Download,
  GitBranch,
  Shield,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Migration IaC Export",
  description:
    "Export feature flags as Infrastructure as Code — Terraform, Pulumi, or Crossplane — during migration. Treat flags as managed resources from day one.",
};

export default function MigrationIacExportPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migration IaC Export
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Instead of importing flags directly into FeatureSignals, you can export
        them as Infrastructure as Code (IaC) — Terraform, Pulumi, or Crossplane
        configurations. This gives you GitOps-managed feature flags from day
        one, with version control, code review, and audit trail for every flag
        change.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <GitBranch
            size={18}
            className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Why IaC Export?
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              IaC export gives you GitOps-native flag management: every flag is
              a version-controlled resource. Changes go through PR review. Flag
              state is declarative and reproducible. If you&apos;re migrating
              from a platform where flags were managed via UI clicks, this is
              the upgrade you&apos;ve been waiting for.
            </p>
          </div>
        </div>
      </div>

      {/* Supported IaC Formats */}
      <SectionHeading>Supported IaC Formats</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The FeatureSignals migration CLI can export flags to three IaC formats:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Format</Th>
            <Th>Best For</Th>
            <Th>Provider</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Terraform (HCL)</Td>
            <Td>Teams already using Terraform for infrastructure</Td>
            <Td>
              <InlineCode>featuresignals/featuresignals</InlineCode>
            </Td>
          </Tr>
          <Tr>
            <Td>Pulumi (TypeScript)</Td>
            <Td>Teams using Pulumi or preferring general-purpose languages</Td>
            <Td>
              <InlineCode>@featuresignals/pulumi</InlineCode>
            </Td>
          </Tr>
          <Tr>
            <Td>Crossplane (YAML)</Td>
            <Td>Teams using Kubernetes-native GitOps (ArgoCD, Flux)</Td>
            <Td>
              <InlineCode>provider-featuresignals</InlineCode>
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Terraform Export */}
      <SectionHeading>Terraform Export</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Export your existing flags as Terraform HCL resources:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`fs-migrate export iac \\
  --source unleash \\
  --source-config ./unleash-config.json \\
  --format terraform \\
  --output ./terraform/feature-flags/`}
      </div>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        This generates Terraform resources like:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`resource "featuresignals_flag" "enable_dark_mode" {
  key         = "enable-dark-mode"
  name        = "Enable Dark Mode"
  type        = "boolean"
  description = "Toggles the dark mode feature"
  project_id  = featuresignals_project.main.id

  environment {
    key     = "production"
    enabled = true

    rule {
      type = "percentage"
      rollout = {
        percentage = 50
        stickiness = "user_id"
      }
    }
  }
}`}
      </div>

      {/* Pulumi Export */}
      <SectionHeading>Pulumi Export</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For Pulumi users, export flags as TypeScript resources:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`fs-migrate export iac \\
  --source unleash \\
  --source-config ./unleash-config.json \\
  --format pulumi \\
  --output ./pulumi/flags/`}
      </div>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`import * as fs from "@featuresignals/pulumi";

const darkMode = new fs.Flag("enable-dark-mode", {
  key: "enable-dark-mode",
  name: "Enable Dark Mode",
  type: "boolean",
  projectId: project.id,
  environments: [{
    key: "production",
    enabled: true,
    rules: [{
      type: "percentage",
      rollout: {
        percentage: 50,
        stickiness: "user_id",
      },
    }],
  }],
});`}
      </div>

      {/* Crossplane Export */}
      <SectionHeading>Crossplane Export</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For Kubernetes-native teams, export flags as Crossplane managed
        resources:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`fs-migrate export iac \\
  --source unleash \\
  --source-config ./unleash-config.json \\
  --format crossplane \\
  --output ./crossplane/flags/`}
      </div>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`apiVersion: featuresignals.com/v1
kind: Flag
metadata:
  name: enable-dark-mode
  namespace: production
spec:
  key: enable-dark-mode
  name: "Enable Dark Mode"
  type: boolean
  projectId: main
  environments:
    - key: production
      enabled: true
      rules:
        - type: percentage
          rollout:
            percentage: 50
            stickiness: user_id`}
      </div>

      {/* IaC Workflow */}
      <SectionHeading>IaC-Powered Flag Management Workflow</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Once your flags are in IaC, here&apos;s the new workflow:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Edit:</strong> Modify the Terraform/Pulumi/Crossplane
          configuration in your editor
        </li>
        <li>
          <strong>Review:</strong> Open a PR — your team reviews the flag change
          before it goes live
        </li>
        <li>
          <strong>Plan:</strong> CI runs <InlineCode>terraform plan</InlineCode>{" "}
          / <InlineCode>pulumi preview</InlineCode> to show what will change
        </li>
        <li>
          <strong>Apply:</strong> Merge the PR — CI applies the change
          automatically
        </li>
        <li>
          <strong>Verify:</strong> The Flag Engine dashboard reflects the change
          within seconds
        </li>
      </ol>

      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Shield
            size={18}
            className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Best Practice: Use IaC from Day One
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Even if you start with UI-based flag management, consider IaC
              export as your target state. IaC-managed flags are auditable,
              reproducible, and eliminate configuration drift between
              environments.
            </p>
          </div>
        </div>
      </div>

      {/* State Management */}
      <SectionHeading>IaC State Management</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals supports two modes of IaC state management:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Mode</Th>
            <Th>Description</Th>
            <Th>Import Behavior</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>IaC-only</Td>
            <Td>
              Flags are managed exclusively through IaC. UI changes are
              read-only.
            </Td>
            <Td>Flags are created with IaC as the source of truth</Td>
          </Tr>
          <Tr>
            <Td>Hybrid</Td>
            <Td>
              Flags can be managed through IaC or UI. IaC imports existing
              flags.
            </Td>
            <Td>
              <InlineCode>terraform import</InlineCode> links existing flags to
              IaC resources
            </Td>
          </Tr>
          <Tr>
            <Td>UI-first</Td>
            <Td>
              Flags are managed through UI. IaC is used only for initial
              seeding.
            </Td>
            <Td>One-time import; subsequent changes via UI</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Migration Overview",
            href: "/docs/getting-started/migration-overview",
          },
          {
            label: "Migrate from LaunchDarkly",
            href: "/docs/getting-started/migrate-from-launchdarkly",
          },
          {
            label: "Migrate from Flagsmith",
            href: "/docs/getting-started/migrate-from-flagsmith",
          },
          {
            label: "Migration Troubleshooting",
            href: "/docs/getting-started/migration-troubleshooting",
          },
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

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
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
