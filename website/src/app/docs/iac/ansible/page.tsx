import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Ansible Collection",
  description:
    "Use the FeatureSignals Ansible collection to manage feature flags, segments, environments, and API keys with YAML playbooks.",
};

const moduleList = [
  {
    name: "featuresignals_flag",
    description: "Create, update, toggle, archive, and delete feature flags.",
  },
  {
    name: "featuresignals_segment",
    description: "Define reusable targeting segments with rules.",
  },
  {
    name: "featuresignals_environment",
    description: "Manage environments with key, name, and description.",
  },
  {
    name: "featuresignals_api_key",
    description: "Provision and rotate server-side and client-side API keys.",
  },
  {
    name: "featuresignals_webhook",
    description: "Configure webhook endpoints for flag change events.",
  },
  {
    name: "featuresignals_flag_info",
    description: "Retrieve flag details for use in conditional playbook logic.",
  },
];

export default function AnsibleCollectionPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Ansible Collection
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Use the FeatureSignals Ansible collection to automate feature flag management
        alongside your infrastructure. Define flags, segments, environments, and API keys
        in YAML playbooks — idempotent, auditable, and reproducible.
      </p>

      {/* Installation */}
      <SectionHeading>Installation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Install the FeatureSignals collection from Ansible Galaxy:
      </p>
      <CodeBlock language="bash" title="Install via ansible-galaxy">
{`ansible-galaxy collection install featuresignals.featuresignals`}
      </CodeBlock>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Or declare it in your <InlineCode>requirements.yml</InlineCode>:
      </p>
      <CodeBlock language="yaml" title="requirements.yml">
{`collections:
  - name: featuresignals.featuresignals
    version: ">=1.0.0"`}
      </CodeBlock>
      <CodeBlock language="bash" title="Install from requirements">
{`ansible-galaxy collection install -r requirements.yml`}
      </CodeBlock>

      {/* Authentication */}
      <SectionHeading>Authentication</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        All modules require an API token. Provide it via environment variable
        or the <InlineCode>api_token</InlineCode> module parameter:
      </p>
      <CodeBlock language="yaml" title="auth.yml">
{`# Option 1: Environment variable (recommended)
# export FEATURESIGNALS_API_TOKEN="fs_api_..."

# Option 2: Module parameter
- name: Create a flag
  featuresignals.featuresignals.featuresignals_flag:
    api_token: "{{ vault_featuresignals_api_token }}"
    project_key: "webapp"
    key: "dark-mode"
    name: "Dark Mode"
    type: "boolean"
    default_value: false`}
      </CodeBlock>

      {/* Playbook Examples */}
      <SectionHeading>Playbook Examples</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Provision a Complete Project
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A playbook that creates a project, environments, segments, and flags in one run:
      </p>
      <CodeBlock language="yaml" title="provision-flags.yml">
{`---
- name: Provision FeatureSignals resources
  hosts: localhost
  gather_facts: false
  vars:
    project_key: "webapp"

  tasks:
    - name: Create staging environment
      featuresignals.featuresignals.featuresignals_environment:
        project_key: "{{ project_key }}"
        key: "staging"
        name: "Staging"
        description: "Pre-production staging environment"

    - name: Create production environment
      featuresignals.featuresignals.featuresignals_environment:
        project_key: "{{ project_key }}"
        key: "production"
        name: "Production"
        description: "Production environment"

    - name: Create beta users segment
      featuresignals.featuresignals.featuresignals_segment:
        project_key: "{{ project_key }}"
        key: "beta-users"
        name: "Beta Users"
        description: "Users enrolled in the beta program"
        rules:
          - attribute: "email"
            operator: "ends_with"
            values:
              - "@beta.featuresignals.com"
              - "@testers.featuresignals.com"

    - name: Create dark mode feature flag
      featuresignals.featuresignals.featuresignals_flag:
        project_key: "{{ project_key }}"
        key: "dark-mode"
        name: "Dark Mode"
        description: "Enable the new dark mode UI"
        type: "boolean"
        default_value: false

    - name: Create checkout v2 flag with targeting
      featuresignals.featuresignals.featuresignals_flag:
        project_key: "{{ project_key }}"
        key: "checkout-v2"
        name: "Checkout v2"
        type: "boolean"
        default_value: false
        targeting:
          rules:
            - segment_key: "beta-users"
              serve_value: true
        rollout:
          percentage: 10
          serve_value: true

    - name: Create production API key
      featuresignals.featuresignals.featuresignals_api_key:
        project_key: "{{ project_key }}"
        name: "Production SDK Key"
        type: "server"
        environment_keys:
          - "production"
      register: api_key_result

    - name: Store API key in vault
      ansible.builtin.set_fact:
        prod_sdk_key: "{{ api_key_result.token }}"
      no_log: true`}
      </CodeBlock>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Toggle Flags During Deployment
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Integrate flag toggling into your deployment playbooks. Enable a maintenance
        mode flag before deployment, then disable it after:
      </p>
      <CodeBlock language="yaml" title="deploy-with-flags.yml">
{`---
- name: Deploy with feature flag coordination
  hosts: app_servers
  vars:
    project_key: "webapp"

  tasks:
    - name: Enable maintenance mode flag
      featuresignals.featuresignals.featuresignals_flag:
        project_key: "{{ project_key }}"
        key: "maintenance-mode"
        state: "enabled"
      delegate_to: localhost
      run_once: true

    - name: Deploy application
      ansible.builtin.import_role:
        name: app_deploy

    - name: Run smoke tests against new version
      ansible.builtin.uri:
        url: "https://{{ inventory_hostname }}/health"
        return_content: true
      register: health_check

    - name: Disable maintenance mode flag
      featuresignals.featuresignals.featuresignals_flag:
        project_key: "{{ project_key }}"
        key: "maintenance-mode"
        state: "disabled"
      delegate_to: localhost
      run_once: true
      when: health_check.status == 200`}
      </CodeBlock>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Conditional Logic with Flag Info
      </h3>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Use <InlineCode>featuresignals_flag_info</InlineCode> to query flag state
        and drive conditional playbook logic:
      </p>
      <CodeBlock language="yaml" title="conditional-flag.yml">
{`---
- name: Conditional deployment based on flag state
  hosts: localhost
  vars:
    project_key: "webapp"

  tasks:
    - name: Get flag state
      featuresignals.featuresignals.featuresignals_flag_info:
        project_key: "{{ project_key }}"
        key: "new-checkout"
      register: flag_info

    - name: Deploy new checkout service
      ansible.builtin.debug:
        msg: "Deploying new checkout service..."
      when: flag_info.enabled

    - name: Skip new checkout service
      ansible.builtin.debug:
        msg: "New checkout flag is disabled — skipping deployment."
      when: not flag_info.enabled`}
      </CodeBlock>

      {/* Module Reference */}
      <SectionHeading>Module Reference</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                Module
              </th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {moduleList.map((mod) => (
              <tr
                key={mod.name}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--signal-fg-primary)]">
                  {mod.name}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {mod.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Idempotency */}
      <SectionHeading>Idempotency</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        All modules are idempotent. Running the same playbook multiple times produces the
        same result — existing flags are updated if changed, or left untouched if they
        already match the desired state. The modules return <InlineCode>changed: false</InlineCode>{" "}
        when no modifications are needed.
      </p>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "IaC Overview", href: "/docs/iac/overview" },
          { label: "Terraform Provider", href: "/docs/iac/terraform" },
          { label: "Pulumi Provider", href: "/docs/iac/pulumi" },
          { label: "Ansible Galaxy — FeatureSignals Collection", href: "https://galaxy.ansible.com/featuresignals/featuresignals" },
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
