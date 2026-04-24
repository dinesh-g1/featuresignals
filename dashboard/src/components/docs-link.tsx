import { ExternalLink } from "lucide-react";
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
  iac: `${DOCS_BASE}/iac/overview`,
  iacTerraform: `${DOCS_BASE}/iac/terraform`,
  iacPulumi: `${DOCS_BASE}/iac/pulumi`,
  iacAnsible: `${DOCS_BASE}/iac/ansible`,
  iacCrossplane: `${DOCS_BASE}/iac/crossplane`,
  iacCdktf: `${DOCS_BASE}/iac/cdk`,
  iacExport: `${DOCS_BASE}/iac/migration-export`,
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
        "inline-flex items-center gap-1 text-xs text-stone-400 transition-colors hover:text-accent",
        className,
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
