import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCS_BASE = "https://docs.featuresignals.com";

export const DOCS_LINKS = {
  flags: `${DOCS_BASE}/concepts/feature-flags`,
  segments: `${DOCS_BASE}/concepts/segments`,
  targeting: `${DOCS_BASE}/concepts/targeting-rules`,
  environments: `${DOCS_BASE}/concepts/environments`,
  apiKeys: `${DOCS_BASE}/getting-started/api-keys`,
  webhooks: `${DOCS_BASE}/concepts/webhooks`,
  approvals: `${DOCS_BASE}/concepts/approval-workflows`,
  audit: `${DOCS_BASE}/concepts/audit-log`,
  rbac: `${DOCS_BASE}/concepts/rbac`,
  sdks: `${DOCS_BASE}/sdks`,
  quickstart: `${DOCS_BASE}/getting-started/quickstart`,
  apiReference: `${DOCS_BASE}/api`,
  abExperiments: `${DOCS_BASE}/concepts/ab-experimentation`,
  relayProxy: `${DOCS_BASE}/concepts/relay-proxy`,
  evalEngine: `${DOCS_BASE}/concepts/evaluation-engine`,
  openFeature: `${DOCS_BASE}/concepts/openfeature`,
  sso: `${DOCS_BASE}/concepts/sso`,
  deployment: `${DOCS_BASE}/deployment`,
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
        "inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-indigo-600",
        className,
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
