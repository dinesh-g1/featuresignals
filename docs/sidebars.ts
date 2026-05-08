import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * FeatureSignals Documentation — 3-Tier Progressive Architecture
 *
 * Tier 1: Concepts  — "I want to understand" (builds mental model)
 * Tier 2: Guides    — "I want to do something" (activity-centered)
 * Tier 3: Reference — "I want the details"
 *
 * Collapsed defaults:
 *   - Concepts tier: mostly false (learners should see the full map)
 *   - Guides tier:   false at top level, false for Quick Start, true for sub-guides
 *   - Reference tier: true (deep reference, collapsed by default)
 */

const sidebars: SidebarsConfig = {
  docs: [
    // ═══════════════════════════════════════════════════════════════════
    // TIER 1: CONCEPTS — "I want to understand"
    // ═══════════════════════════════════════════════════════════════════
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      items: [
        "intro", // What is a feature flag?
        {
          type: "category",
          label: "Core Concepts",
          collapsed: false,
          items: [
            "core-concepts/feature-flags",
            "core-concepts/toggle-categories",
            "core-concepts/projects-and-environments",
            "core-concepts/targeting-and-segments",
            "core-concepts/implementation-patterns",
            "core-concepts/percentage-rollouts",
            "core-concepts/ab-experimentation",
            "core-concepts/mutual-exclusion",
            "core-concepts/prerequisites",
            "core-concepts/flag-lifecycle",
          ],
        },
        {
          type: "category",
          label: "Architecture",
          collapsed: false,
          items: [
            "architecture/overview",
            "architecture/evaluation-engine",
            "architecture/real-time-updates",
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════
    // TIER 2: GUIDES — "I want to do something"
    // ═══════════════════════════════════════════════════════════════════
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: [
        {
          type: "category",
          label: "Quick Start",
          collapsed: false,
          items: [
            "getting-started/quickstart",
            "getting-started/installation",
            "getting-started/create-your-first-flag",
          ],
        },
        {
          type: "category",
          label: "Feature Flag Lifecycle",
          collapsed: true,
          items: [
            {
              type: "category",
              label: "Create",
              items: [
                "core-concepts/feature-flags",
                "core-concepts/toggle-categories",
                "core-concepts/projects-and-environments",
              ],
            },
            {
              type: "category",
              label: "Target",
              items: [
                "core-concepts/targeting-and-segments",
                "core-concepts/implementation-patterns",
              ],
            },
            {
              type: "category",
              label: "Rollout",
              items: [
                "core-concepts/percentage-rollouts",
                "core-concepts/ab-experimentation",
                "core-concepts/mutual-exclusion",
                "core-concepts/prerequisites",
              ],
            },
            {
              type: "category",
              label: "Monitor",
              items: [
                "dashboard/evaluation-metrics",
                "dashboard/flag-health",
                "dashboard/usage-insights",
              ],
            },
            {
              type: "category",
              label: "Clean Up",
              items: [
                "core-concepts/flag-lifecycle",
                "advanced/ai-janitor",
                "advanced/ai-janitor-quickstart",
                "advanced/ai-janitor-git-providers",
                "advanced/ai-janitor-configuration",
                "advanced/ai-janitor-pr-workflow",
                "advanced/ai-janitor-llm-integration",
                "advanced/ai-janitor-troubleshooting",
              ],
            },
            {
              type: "category",
              label: "Migrate",
              items: [
                "getting-started/migration-overview",
                "getting-started/migrate-from-launchdarkly",
                "getting-started/migrate-from-flagsmith",
                "getting-started/migrate-from-unleash",
                "getting-started/migration-iac-export",
                "getting-started/migration-troubleshooting",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "Tutorials",
          collapsed: true,
          items: [
            "tutorials/feature-flag-checkout",
            "tutorials/ab-testing-react",
            "tutorials/progressive-rollout",
            "tutorials/kill-switch",
          ],
        },
        {
          type: "category",
          label: "Platform",
          collapsed: true,
          items: [
            "dashboard/overview",
            "dashboard/managing-flags",
            "dashboard/env-comparison",
            "dashboard/target-inspector",
            "dashboard/target-comparison",
            "advanced/relay-proxy",
            "advanced/scheduling",
            "advanced/kill-switch",
            "advanced/approval-workflows",
            "advanced/webhooks",
            "advanced/audit-logging",
            "advanced/rbac",
          ],
        },
        {
          type: "category",
          label: "AI Janitor",
          collapsed: true,
          items: [
            "advanced/ai-janitor",
            "advanced/ai-janitor-quickstart",
            "advanced/ai-janitor-git-providers",
            "advanced/ai-janitor-configuration",
            "advanced/ai-janitor-pr-workflow",
            "advanced/ai-janitor-llm-integration",
            "advanced/ai-janitor-troubleshooting",
          ],
        },
        {
          type: "category",
          label: "Infrastructure as Code",
          collapsed: true,
          items: ["iac/overview", "iac/terraform", "iac/pulumi", "iac/ansible"],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════
    // TIER 3: REFERENCE — "I want the details"
    // ═══════════════════════════════════════════════════════════════════
    {
      type: "category",
      label: "Reference",
      collapsed: true,
      items: [
        {
          type: "category",
          label: "API Reference",
          collapsed: true,
          items: [
            "api-reference/overview",
            "api-reference/authentication",
            "api-reference/projects",
            "api-reference/environments",
            "api-reference/flags",
            "api-reference/flag-state",
            "api-reference/evaluation",
            "api-reference/segments",
            "api-reference/api-keys",
            "api-reference/team-management",
            "api-reference/approvals",
            "api-reference/webhooks",
            "api-reference/audit-log",
            "api-reference/metrics",
            "api-reference/billing",
            "api-reference/demo",
            "api-reference/onboarding",
            {
              type: "category",
              label: "Enterprise APIs",
              collapsed: true,
              items: [
                "api-reference/sso",
                "api-reference/scim",
                "api-reference/mfa",
                "api-reference/ip-allowlist",
                "api-reference/custom-roles",
                "api-reference/data-export",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "SDKs",
          collapsed: true,
          items: [
            "sdks/overview",
            "sdks/go",
            "sdks/nodejs",
            "sdks/python",
            "sdks/java",
            "sdks/dotnet",
            "sdks/ruby",
            "sdks/react",
            "sdks/vue",
            "sdks/openfeature",
          ],
        },
        {
          type: "category",
          label: "Deployment & Operations",
          collapsed: true,
          items: [
            "self-hosting/onboarding-guide",
            "deployment/docker-compose",
            "deployment/self-hosting",
            "deployment/on-premises",
            "deployment/configuration",
            "operations/incident-runbook",
            "operations/disaster-recovery",
          ],
        },
        {
          type: "category",
          label: "Security & Compliance",
          collapsed: true,
          items: [
            "compliance/security-overview",
            {
              type: "category",
              label: "GDPR",
              collapsed: true,
              items: [
                "compliance/privacy-policy",
                "compliance/data-retention",
                "compliance/dpa-template",
                "compliance/subprocessors",
                "compliance/gdpr-rights",
              ],
            },
            {
              type: "category",
              label: "SOC 2",
              collapsed: true,
              items: [
                "compliance/soc2/controls-matrix",
                "compliance/soc2/evidence-collection",
                "compliance/soc2/incident-response",
              ],
            },
            "compliance/ccpa-cpra",
            "compliance/iso27701/pims-overview",
            "compliance/data-privacy-framework",
            "compliance/iso27001/isms-overview",
            "compliance/hipaa",
            "compliance/dora",
            "compliance/csa-star",
          ],
        },
        {
          type: "category",
          label: "Enterprise",
          collapsed: true,
          items: [
            "enterprise/overview",
            "enterprise/onboarding",
            "api-reference/sso",
            "api-reference/scim",
            "api-reference/mfa",
            "api-reference/ip-allowlist",
            "api-reference/custom-roles",
            "api-reference/data-export",
          ],
        },
        "GLOSSARY",
      ],
    },
  ],
};

export default sidebars;
