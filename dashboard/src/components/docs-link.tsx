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
