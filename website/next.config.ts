import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  async redirects() {
    return [
      // ── Top-level entry points ──────────────────────────────────────
      { source: "/intro", destination: "/docs/intro", permanent: true },
      { source: "/GLOSSARY", destination: "/docs/GLOSSARY", permanent: true },

      // ── Getting Started ─────────────────────────────────────────────
      {
        source: "/getting-started/quickstart",
        destination: "/docs/getting-started/quickstart",
        permanent: true,
      },
      {
        source: "/getting-started/installation",
        destination: "/docs/getting-started/installation",
        permanent: true,
      },
      {
        source: "/getting-started/create-your-first-flag",
        destination: "/docs/getting-started/create-your-first-flag",
        permanent: true,
      },
      {
        source: "/getting-started/migration-overview",
        destination: "/docs/getting-started/migration-overview",
        permanent: true,
      },
      {
        source: "/getting-started/migrate-from-launchdarkly",
        destination: "/docs/getting-started/migrate-from-launchdarkly",
        permanent: true,
      },
      {
        source: "/getting-started/migrate-from-flagsmith",
        destination: "/docs/getting-started/migrate-from-flagsmith",
        permanent: true,
      },
      {
        source: "/getting-started/migrate-from-unleash",
        destination: "/docs/getting-started/migrate-from-unleash",
        permanent: true,
      },
      {
        source: "/getting-started/migration-iac-export",
        destination: "/docs/getting-started/migration-iac-export",
        permanent: true,
      },
      {
        source: "/getting-started/migration-troubleshooting",
        destination: "/docs/getting-started/migration-troubleshooting",
        permanent: true,
      },
      {
        source: "/getting-started/:path*",
        destination: "/docs/getting-started/:path*",
        permanent: true,
      },

      // ── Core Concepts ───────────────────────────────────────────────
      {
        source: "/core-concepts/feature-flags",
        destination: "/docs/core-concepts/feature-flags",
        permanent: true,
      },
      {
        source: "/core-concepts/toggle-categories",
        destination: "/docs/core-concepts/toggle-categories",
        permanent: true,
      },
      {
        source: "/core-concepts/projects-and-environments",
        destination: "/docs/core-concepts/projects-and-environments",
        permanent: true,
      },
      {
        source: "/core-concepts/targeting-and-segments",
        destination: "/docs/core-concepts/targeting-and-segments",
        permanent: true,
      },
      {
        source: "/core-concepts/implementation-patterns",
        destination: "/docs/core-concepts/implementation-patterns",
        permanent: true,
      },
      {
        source: "/core-concepts/percentage-rollouts",
        destination: "/docs/core-concepts/percentage-rollouts",
        permanent: true,
      },
      {
        source: "/core-concepts/ab-experimentation",
        destination: "/docs/core-concepts/ab-experimentation",
        permanent: true,
      },
      {
        source: "/core-concepts/mutual-exclusion",
        destination: "/docs/core-concepts/mutual-exclusion",
        permanent: true,
      },
      {
        source: "/core-concepts/prerequisites",
        destination: "/docs/core-concepts/prerequisites",
        permanent: true,
      },
      {
        source: "/core-concepts/flag-lifecycle",
        destination: "/docs/core-concepts/flag-lifecycle",
        permanent: true,
      },
      {
        source: "/core-concepts/:path*",
        destination: "/docs/core-concepts/:path*",
        permanent: true,
      },

      // ── Architecture ────────────────────────────────────────────────
      {
        source: "/architecture/overview",
        destination: "/docs/architecture/overview",
        permanent: true,
      },
      {
        source: "/architecture/evaluation-engine",
        destination: "/docs/architecture/evaluation-engine",
        permanent: true,
      },
      {
        source: "/architecture/real-time-updates",
        destination: "/docs/architecture/real-time-updates",
        permanent: true,
      },
      {
        source: "/architecture/:path*",
        destination: "/docs/architecture/:path*",
        permanent: true,
      },

      // ── Tutorials ───────────────────────────────────────────────────
      {
        source: "/tutorials/feature-flag-checkout",
        destination: "/docs/tutorials/feature-flag-checkout",
        permanent: true,
      },
      {
        source: "/tutorials/ab-testing-react",
        destination: "/docs/tutorials/ab-testing-react",
        permanent: true,
      },
      {
        source: "/tutorials/progressive-rollout",
        destination: "/docs/tutorials/progressive-rollout",
        permanent: true,
      },
      {
        source: "/tutorials/kill-switch",
        destination: "/docs/tutorials/kill-switch",
        permanent: true,
      },
      {
        source: "/tutorials/:path*",
        destination: "/docs/tutorials/:path*",
        permanent: true,
      },

      // ── Dashboard ───────────────────────────────────────────────────
      {
        source: "/dashboard/overview",
        destination: "/docs/dashboard/overview",
        permanent: true,
      },
      {
        source: "/dashboard/managing-flags",
        destination: "/docs/dashboard/managing-flags",
        permanent: true,
      },
      {
        source: "/dashboard/env-comparison",
        destination: "/docs/dashboard/env-comparison",
        permanent: true,
      },
      {
        source: "/dashboard/target-inspector",
        destination: "/docs/dashboard/target-inspector",
        permanent: true,
      },
      {
        source: "/dashboard/target-comparison",
        destination: "/docs/dashboard/target-comparison",
        permanent: true,
      },
      {
        source: "/dashboard/evaluation-metrics",
        destination: "/docs/dashboard/evaluation-metrics",
        permanent: true,
      },
      {
        source: "/dashboard/flag-health",
        destination: "/docs/dashboard/flag-health",
        permanent: true,
      },
      {
        source: "/dashboard/usage-insights",
        destination: "/docs/dashboard/usage-insights",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/docs/dashboard/:path*",
        permanent: true,
      },

      // ── Advanced ────────────────────────────────────────────────────
      {
        source: "/advanced/relay-proxy",
        destination: "/docs/advanced/relay-proxy",
        permanent: true,
      },
      {
        source: "/advanced/scheduling",
        destination: "/docs/advanced/scheduling",
        permanent: true,
      },
      {
        source: "/advanced/kill-switch",
        destination: "/docs/advanced/kill-switch",
        permanent: true,
      },
      {
        source: "/advanced/approval-workflows",
        destination: "/docs/advanced/approval-workflows",
        permanent: true,
      },
      {
        source: "/advanced/webhooks",
        destination: "/docs/advanced/webhooks",
        permanent: true,
      },
      {
        source: "/advanced/audit-logging",
        destination: "/docs/advanced/audit-logging",
        permanent: true,
      },
      {
        source: "/advanced/rbac",
        destination: "/docs/advanced/rbac",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor",
        destination: "/docs/advanced/ai-janitor",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-quickstart",
        destination: "/docs/advanced/ai-janitor-quickstart",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-git-providers",
        destination: "/docs/advanced/ai-janitor-git-providers",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-configuration",
        destination: "/docs/advanced/ai-janitor-configuration",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-pr-workflow",
        destination: "/docs/advanced/ai-janitor-pr-workflow",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-llm-integration",
        destination: "/docs/advanced/ai-janitor-llm-integration",
        permanent: true,
      },
      {
        source: "/advanced/ai-janitor-troubleshooting",
        destination: "/docs/advanced/ai-janitor-troubleshooting",
        permanent: true,
      },
      {
        source: "/advanced/:path*",
        destination: "/docs/advanced/:path*",
        permanent: true,
      },

      // ── API Reference ───────────────────────────────────────────────
      {
        source: "/api-reference/overview",
        destination: "/docs/api-reference/overview",
        permanent: true,
      },
      {
        source: "/api-reference/authentication",
        destination: "/docs/api-reference/authentication",
        permanent: true,
      },
      {
        source: "/api-reference/projects",
        destination: "/docs/api-reference/projects",
        permanent: true,
      },
      {
        source: "/api-reference/environments",
        destination: "/docs/api-reference/environments",
        permanent: true,
      },
      {
        source: "/api-reference/flags",
        destination: "/docs/api-reference/flags",
        permanent: true,
      },
      {
        source: "/api-reference/flag-state",
        destination: "/docs/api-reference/flag-state",
        permanent: true,
      },
      {
        source: "/api-reference/evaluation",
        destination: "/docs/api-reference/evaluation",
        permanent: true,
      },
      {
        source: "/api-reference/segments",
        destination: "/docs/api-reference/segments",
        permanent: true,
      },
      {
        source: "/api-reference/api-keys",
        destination: "/docs/api-reference/api-keys",
        permanent: true,
      },
      {
        source: "/api-reference/team-management",
        destination: "/docs/api-reference/team-management",
        permanent: true,
      },
      {
        source: "/api-reference/approvals",
        destination: "/docs/api-reference/approvals",
        permanent: true,
      },
      {
        source: "/api-reference/webhooks",
        destination: "/docs/api-reference/webhooks",
        permanent: true,
      },
      {
        source: "/api-reference/audit-log",
        destination: "/docs/api-reference/audit-log",
        permanent: true,
      },
      {
        source: "/api-reference/metrics",
        destination: "/docs/api-reference/metrics",
        permanent: true,
      },
      {
        source: "/api-reference/billing",
        destination: "/docs/api-reference/billing",
        permanent: true,
      },
      {
        source: "/api-reference/demo",
        destination: "/docs/api-reference/demo",
        permanent: true,
      },
      {
        source: "/api-reference/onboarding",
        destination: "/docs/api-reference/onboarding",
        permanent: true,
      },
      {
        source: "/api-reference/sso",
        destination: "/docs/api-reference/sso",
        permanent: true,
      },
      {
        source: "/api-reference/scim",
        destination: "/docs/api-reference/scim",
        permanent: true,
      },
      {
        source: "/api-reference/mfa",
        destination: "/docs/api-reference/mfa",
        permanent: true,
      },
      {
        source: "/api-reference/ip-allowlist",
        destination: "/docs/api-reference/ip-allowlist",
        permanent: true,
      },
      {
        source: "/api-reference/custom-roles",
        destination: "/docs/api-reference/custom-roles",
        permanent: true,
      },
      {
        source: "/api-reference/data-export",
        destination: "/docs/api-reference/data-export",
        permanent: true,
      },
      {
        source: "/api-reference/:path*",
        destination: "/docs/api-reference/:path*",
        permanent: true,
      },

      // ── SDKs ────────────────────────────────────────────────────────
      {
        source: "/sdks/overview",
        destination: "/docs/sdks/overview",
        permanent: true,
      },
      { source: "/sdks/go", destination: "/docs/sdks/go", permanent: true },
      {
        source: "/sdks/nodejs",
        destination: "/docs/sdks/nodejs",
        permanent: true,
      },
      {
        source: "/sdks/python",
        destination: "/docs/sdks/python",
        permanent: true,
      },
      { source: "/sdks/java", destination: "/docs/sdks/java", permanent: true },
      {
        source: "/sdks/dotnet",
        destination: "/docs/sdks/dotnet",
        permanent: true,
      },
      { source: "/sdks/ruby", destination: "/docs/sdks/ruby", permanent: true },
      {
        source: "/sdks/react",
        destination: "/docs/sdks/react",
        permanent: true,
      },
      { source: "/sdks/vue", destination: "/docs/sdks/vue", permanent: true },
      {
        source: "/sdks/openfeature",
        destination: "/docs/sdks/openfeature",
        permanent: true,
      },
      {
        source: "/sdks/:path*",
        destination: "/docs/sdks/:path*",
        permanent: true,
      },

      // ── Deployment ──────────────────────────────────────────────────
      {
        source: "/deployment/docker-compose",
        destination: "/docs/deployment/docker-compose",
        permanent: true,
      },
      {
        source: "/deployment/self-hosting",
        destination: "/docs/deployment/self-hosting",
        permanent: true,
      },
      {
        source: "/deployment/on-premises",
        destination: "/docs/deployment/on-premises",
        permanent: true,
      },
      {
        source: "/deployment/configuration",
        destination: "/docs/deployment/configuration",
        permanent: true,
      },
      {
        source: "/deployment/:path*",
        destination: "/docs/deployment/:path*",
        permanent: true,
      },

      // ── Self-Hosting ────────────────────────────────────────────────
      {
        source: "/self-hosting/onboarding-guide",
        destination: "/docs/self-hosting/onboarding-guide",
        permanent: true,
      },
      {
        source: "/self-hosting/:path*",
        destination: "/docs/self-hosting/:path*",
        permanent: true,
      },

      // ── Operations ──────────────────────────────────────────────────
      {
        source: "/operations/incident-runbook",
        destination: "/docs/operations/incident-runbook",
        permanent: true,
      },
      {
        source: "/operations/disaster-recovery",
        destination: "/docs/operations/disaster-recovery",
        permanent: true,
      },
      {
        source: "/operations/:path*",
        destination: "/docs/operations/:path*",
        permanent: true,
      },

      // ── Compliance ──────────────────────────────────────────────────
      {
        source: "/compliance/security-overview",
        destination: "/docs/compliance/security-overview",
        permanent: true,
      },
      {
        source: "/compliance/privacy-policy",
        destination: "/docs/compliance/privacy-policy",
        permanent: true,
      },
      {
        source: "/compliance/data-retention",
        destination: "/docs/compliance/data-retention",
        permanent: true,
      },
      {
        source: "/compliance/dpa-template",
        destination: "/docs/compliance/dpa-template",
        permanent: true,
      },
      {
        source: "/compliance/subprocessors",
        destination: "/docs/compliance/subprocessors",
        permanent: true,
      },
      {
        source: "/compliance/gdpr-rights",
        destination: "/docs/compliance/gdpr-rights",
        permanent: true,
      },
      {
        source: "/compliance/soc2/controls-matrix",
        destination: "/docs/compliance/soc2/controls-matrix",
        permanent: true,
      },
      {
        source: "/compliance/soc2/evidence-collection",
        destination: "/docs/compliance/soc2/evidence-collection",
        permanent: true,
      },
      {
        source: "/compliance/soc2/incident-response",
        destination: "/docs/compliance/soc2/incident-response",
        permanent: true,
      },
      {
        source: "/compliance/ccpa-cpra",
        destination: "/docs/compliance/ccpa-cpra",
        permanent: true,
      },
      {
        source: "/compliance/iso27701/pims-overview",
        destination: "/docs/compliance/iso27701/pims-overview",
        permanent: true,
      },
      {
        source: "/compliance/data-privacy-framework",
        destination: "/docs/compliance/data-privacy-framework",
        permanent: true,
      },
      {
        source: "/compliance/iso27001/isms-overview",
        destination: "/docs/compliance/iso27001/isms-overview",
        permanent: true,
      },
      {
        source: "/compliance/hipaa",
        destination: "/docs/compliance/hipaa",
        permanent: true,
      },
      {
        source: "/compliance/dora",
        destination: "/docs/compliance/dora",
        permanent: true,
      },
      {
        source: "/compliance/csa-star",
        destination: "/docs/compliance/csa-star",
        permanent: true,
      },
      {
        source: "/compliance/:path*",
        destination: "/docs/compliance/:path*",
        permanent: true,
      },

      // ── Enterprise ──────────────────────────────────────────────────
      {
        source: "/enterprise/overview",
        destination: "/docs/enterprise/overview",
        permanent: true,
      },
      {
        source: "/enterprise/onboarding",
        destination: "/docs/enterprise/onboarding",
        permanent: true,
      },
      {
        source: "/enterprise/:path*",
        destination: "/docs/enterprise/:path*",
        permanent: true,
      },

      // ── IAC ─────────────────────────────────────────────────────────
      {
        source: "/iac/overview",
        destination: "/docs/iac/overview",
        permanent: true,
      },
      {
        source: "/iac/terraform",
        destination: "/docs/iac/terraform",
        permanent: true,
      },
      {
        source: "/iac/pulumi",
        destination: "/docs/iac/pulumi",
        permanent: true,
      },
      {
        source: "/iac/ansible",
        destination: "/docs/iac/ansible",
        permanent: true,
      },
      {
        source: "/iac/:path*",
        destination: "/docs/iac/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
