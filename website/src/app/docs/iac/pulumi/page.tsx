import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, ArrowRight } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Pulumi Provider",
  description:
    "Use FeatureSignals with Pulumi to manage feature flags, segments, and environments in TypeScript, Python, Go, or C# with full type safety and IDE autocompletion.",
};

const CI_WORKFLOW_YAML = `name: Feature Flag Management

on:
  pull_request:
    paths: ["flags/**"]
  push:
    branches: [main]
    paths: ["flags/**"]

jobs:
  flags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
        working-directory: flags

      - name: Pulumi Preview
        if: github.event_name == 'pull_request'
        uses: pulumi/actions@v5
        with:
          command: preview
          stack-name: production
          work-dir: flags
        env:
          PULUMI_ACCESS_TOKEN: \${{ secrets.PULUMI_ACCESS_TOKEN }}

      - name: Pulumi Up
        if: github.event_name == 'push'
        uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
          work-dir: flags
        env:
          PULUMI_ACCESS_TOKEN: \${{ secrets.PULUMI_ACCESS_TOKEN }}`;

export default function PulumiProviderPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Pulumi Provider
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Use FeatureSignals with Pulumi to manage feature flags, segments,
        environments, API keys, and webhooks in TypeScript, Python, Go, or C#.
        Full type safety, IDE autocompletion, and integration with your existing
        Pulumi stacks.
      </p>

      {/* Installation */}
      <SectionHeading>Installation</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        TypeScript / JavaScript
      </h3>
      <CodeBlock language="bash" title="TypeScript install">
        {`npm install @featuresignals/pulumi`}
      </CodeBlock>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Python
      </h3>
      <CodeBlock language="bash" title="Python install">
        {`pip install pulumi-featuresignals`}
      </CodeBlock>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Go
      </h3>
      <CodeBlock language="bash" title="Go install">
        {`go get github.com/featuresignals/pulumi-featuresignals/sdk`}
      </CodeBlock>

      {/* Provider Configuration */}
      <SectionHeading>Provider Configuration</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Configure the provider with your API token. Use Pulumi config secrets to
        keep tokens out of source control:
      </p>
      <CodeBlock language="bash" title="Set API token">
        {`# Set the API token as a Pulumi secret
pulumi config set featuresignals:apiToken --secret`}
      </CodeBlock>

      {/* TypeScript Example */}
      <SectionHeading>TypeScript Example</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Create a project with environments, a segment, and a feature flag using
        TypeScript:
      </p>
      <CodeBlock language="ts" title="index.ts">
        {`import * as pulumi from "@pulumi/pulumi";
import * as featuresignals from "@featuresignals/pulumi";

// Create a project
const webapp = new featuresignals.Project("webapp", {
  key: "webapp",
  name: "Web Application",
  description: "Main customer-facing web application",
});

// Create environments
const staging = new featuresignals.Environment("staging", {
  projectKey: webapp.key,
  key: "staging",
  name: "Staging",
});

const production = new featuresignals.Environment("production", {
  projectKey: webapp.key,
  key: "production",
  name: "Production",
});

// Define a reusable segment
const betaUsers = new featuresignals.Segment("beta-users", {
  projectKey: webapp.key,
  key: "beta-users",
  name: "Beta Users",
  rules: [
    {
      attribute: "email",
      operator: "ends_with",
      values: ["@beta.featuresignals.com"],
    },
  ],
});

// Create a feature flag
const checkoutV2 = new featuresignals.Flag("checkout-v2", {
  projectKey: webapp.key,
  key: "checkout-v2",
  name: "Checkout v2",
  type: "boolean",
  defaultValue: false,
  targeting: {
    rules: [
      {
        segmentKey: betaUsers.key,
        serveValue: true,
      },
    ],
  },
  rollout: {
    percentage: 10,
    serveValue: true,
  },
});

// Create an API key for the production environment
const prodKey = new featuresignals.ApiKey("prod-sdk", {
  projectKey: webapp.key,
  name: "Production SDK Key",
  type: "server",
  environmentKeys: [production.key],
});

// Export the API key secret (sensitive)
export const apiKeySecret = prodKey.token;`}
      </CodeBlock>

      {/* Python Example */}
      <SectionHeading>Python Example</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The same configuration in Python:
      </p>
      <CodeBlock language="python" title="__main__.py">
        {`import pulumi
import pulumi_featuresignals as featuresignals

# Create a project
webapp = featuresignals.Project("webapp",
    key="webapp",
    name="Web Application",
    description="Main customer-facing web application",
)

# Create environments
staging = featuresignals.Environment("staging",
    project_key=webapp.key,
    key="staging",
    name="Staging",
)

production = featuresignals.Environment("production",
    project_key=webapp.key,
    key="production",
    name="Production",
)

# Define a reusable segment
beta_users = featuresignals.Segment("beta-users",
    project_key=webapp.key,
    key="beta-users",
    name="Beta Users",
    rules=[{
        "attribute": "email",
        "operator": "ends_with",
        "values": ["@beta.featuresignals.com"],
    }],
)

# Create a feature flag
checkout_v2 = featuresignals.Flag("checkout-v2",
    project_key=webapp.key,
    key="checkout-v2",
    name="Checkout v2",
    type="boolean",
    default_value=False,
    targeting={
        "rules": [{
            "segment_key": beta_users.key,
            "serve_value": True,
        }],
    },
    rollout={
        "percentage": 10,
        "serve_value": True,
    },
)

# Create an API key
prod_key = featuresignals.ApiKey("prod-sdk",
    project_key=webapp.key,
    name="Production SDK Key",
    type="server",
    environment_keys=[production.key],
)

pulumi.export("api_key_secret", prod_key.token)`}
      </CodeBlock>

      {/* CI/CD Integration */}
      <SectionHeading>CI/CD Integration</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Pulumi integrates naturally with CI/CD pipelines. Here&apos;s a GitHub
        Actions workflow that previews flag changes on PR and applies on merge:
      </p>
      <CodeBlock language="yaml" title=".github/workflows/feature-flags.yml">
        {CI_WORKFLOW_YAML}
      </CodeBlock>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "IaC Overview", href: "/docs/iac/overview" },
          { label: "Terraform Provider", href: "/docs/iac/terraform" },
          { label: "Ansible Collection", href: "/docs/iac/ansible" },
          {
            label: "Pulumi Registry — FeatureSignals",
            href: "https://www.pulumi.com/registry/packages/featuresignals/",
          },
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
