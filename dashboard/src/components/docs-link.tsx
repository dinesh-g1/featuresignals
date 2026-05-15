import { ExternalLinkIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { DOCS_URL } from "@/lib/external-urls";

const DOCS_BASE = DOCS_URL;

export const DOCS_LINKS = {
  flags: `${DOCS_BASE}/core-concepts/feature-flags`,
  segments: `${DOCS_BASE}/core-concepts/targeting-and-segments`,
  targeting: `${DOCS_BASE}/core-concepts/targeting-and-segments`,
  environments: `${DOCS_BASE}/core-concepts/projects-and-environments`,
  apiKeys: `${DOCS_BASE}/api-reference/api-keys`,
  webhooks: `${DOCS_BASE}/advanced/webhooks`,
  approvals: `${DOCS_BASE}/advanced/approval-workflows`,
  audit: `${DOCS_BASE}/advanced/audit-logging`,
  rbac: `${DOCS_BASE}/advanced/rbac`,
  sdks: `${DOCS_BASE}/sdks/overview`,
  quickstart: `${DOCS_BASE}/getting-started/quickstart`,
  apiReference: `${DOCS_BASE}/api-playground`,
  abExperiments: `${DOCS_BASE}/core-concepts/ab-experimentation`,
  relayProxy: `${DOCS_BASE}/advanced/relay-proxy`,
  evalEngine: `${DOCS_BASE}/architecture/evaluation-engine`,
  openFeature: `${DOCS_BASE}/sdks/openfeature`,
  sso: `${DOCS_BASE}/api-reference/sso`,
  deployment: `${DOCS_BASE}/deployment/self-hosting`,
  migration: `${DOCS_BASE}/getting-started/migration-overview`,
  migrationLaunchDarkly: `${DOCS_BASE}/getting-started/migrate-from-launchdarkly`,
  migrationUnleash: `${DOCS_BASE}/getting-started/migrate-from-unleash`,
  migrationFlagsmith: `${DOCS_BASE}/getting-started/migrate-from-flagsmith`,
  migrationTroubleshooting: `${DOCS_BASE}/getting-started/migration-troubleshooting`,
  migrationIacExport: `${DOCS_BASE}/getting-started/migration-iac-export`,
  janitor: `${DOCS_BASE}/advanced/ai-janitor`,
  janitorQuickstart: `${DOCS_BASE}/advanced/ai-janitor-quickstart`,
  janitorGitProviders: `${DOCS_BASE}/advanced/ai-janitor-git-providers`,
  janitorConfiguration: `${DOCS_BASE}/advanced/ai-janitor-configuration`,
  janitorPRWorkflow: `${DOCS_BASE}/advanced/ai-janitor-pr-workflow`,
  janitorTroubleshooting: `${DOCS_BASE}/advanced/ai-janitor-troubleshooting`,
  abm: `${DOCS_BASE}/advanced/agent-behavior-mesh`,
  agents: `${DOCS_BASE}/advanced/agent-registry`,
  policies: `${DOCS_BASE}/advanced/governance-policies`,
  evalEvents: `${DOCS_BASE}/advanced/eval-events`,
  iac: `${DOCS_BASE}/iac/overview`,
  iacTerraform: `${DOCS_BASE}/iac/terraform`,
  iacPulumi: `${DOCS_BASE}/iac/pulumi`,
  iacAnsible: `${DOCS_BASE}/iac/ansible`,
  iacCrossplane: `${DOCS_BASE}/iac/crossplane`,
  iacCdktf: `${DOCS_BASE}/iac/cdk`,
  iacExport: `${DOCS_BASE}/iac/migration-export`,
  // New direct-slug keys for FieldHelp docSlug prop
  flagTypes: `${DOCS_BASE}/core-concepts/toggle-categories`,
  flagKeys: `${DOCS_BASE}/core-concepts/feature-flags`,
  matchTypes: `${DOCS_BASE}/core-concepts/targeting-and-segments`,
  operators: `${DOCS_BASE}/core-concepts/targeting-and-segments`,
  customAttributes: `${DOCS_BASE}/core-concepts/targeting-and-segments`,
  percentageRollouts: `${DOCS_BASE}/core-concepts/percentage-rollouts`,
  experiments: `${DOCS_BASE}/core-concepts/ab-experimentation`,
  environmentTypes: `${DOCS_BASE}/core-concepts/projects-and-environments`,
  scanConfig: `${DOCS_BASE}/advanced/ai-janitor-configuration`,
  builtInRoles: `${DOCS_BASE}/advanced/rbac`,
  eventTypes: `${DOCS_BASE}/api-reference/webhooks`,
  // Additional in-app docs links for pages missing coverage
  dashboard: `${DOCS_BASE}/getting-started/dashboard-overview`,
  projects: `${DOCS_BASE}/core-concepts/projects-and-environments`,
  usage: `${DOCS_BASE}/billing/usage-and-metering`,
  limits: `${DOCS_BASE}/advanced/rate-limits`,
  settings: `${DOCS_BASE}/getting-started/organization-settings`,
  support: `${DOCS_BASE}/getting-started/support`,
  metrics: `${DOCS_BASE}/advanced/eval-metrics`,
  health: `${DOCS_BASE}/advanced/flag-health`,
  usageInsights: `${DOCS_BASE}/advanced/usage-insights`,
  envComparison: `${DOCS_BASE}/advanced/environment-comparison`,
  targetInspector: `${DOCS_BASE}/advanced/target-inspector`,
} as const;

interface DocsLinkProps {
  href: string;
  label?: string;
  className?: string;
}

export function DocsLink({ href, label = "Docs", className }: DocsLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-accent)]",
        className,
      )}
    >
      {label}
      <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}
