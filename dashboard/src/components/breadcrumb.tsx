"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

// Define the breadcrumb segment structure
interface BreadcrumbSegment {
  label: string;
  href?: string;
}

// Map route patterns to breadcrumb configurations
const ROUTE_BREADCRUMBS: Array<{
  pattern: RegExp;
  build: (pathname: string, matches: RegExpMatchArray) => BreadcrumbSegment[];
}> = [
  // Project-scoped pages
  {
    pattern: /^\/projects\/([^/]+)\/dashboard$/,
    build: (_, _matches) => [{ label: "Dashboard" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/flags$/,
    build: (_, matches) => [
      { label: "Flags", href: `/projects/${matches[1]}/flags` },
    ],
  },
  {
    pattern: /^\/projects\/([^/]+)\/flags\/([^/]+)$/,
    build: (_, matches) => [
      { label: "Flags", href: `/projects/${matches[1]}/flags` },
      { label: decodeURIComponent(matches[2]) },
    ],
  },
  {
    pattern: /^\/projects\/([^/]+)\/segments$/,
    build: () => [{ label: "Segments" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/environments$/,
    build: () => [{ label: "Environment Config" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/api-keys$/,
    build: () => [{ label: "API Keys" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/team$/,
    build: () => [{ label: "Team" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/webhooks$/,
    build: () => [{ label: "Webhooks" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/janitor$/,
    build: () => [{ label: "AI Janitor" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/metrics$/,
    build: () => [{ label: "Eval Metrics" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/health$/,
    build: () => [{ label: "Flag Health" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/env-comparison$/,
    build: () => [{ label: "Env Comparison" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/target-inspector$/,
    build: () => [{ label: "Target Inspector" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/target-comparison$/,
    build: () => [{ label: "Target Compare" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/approvals$/,
    build: () => [{ label: "Approvals" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/analytics$/,
    build: () => [{ label: "Analytics" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/activity$/,
    build: () => [{ label: "Activity" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/audit$/,
    build: () => [{ label: "Audit" }],
  },
  {
    pattern: /^\/projects\/([^/]+)\/usage-insights$/,
    build: () => [{ label: "Usage Insights" }],
  },
  // Org-level pages
  {
    pattern: /^\/projects$/,
    build: () => [{ label: "Projects" }],
  },
  { pattern: /^\/usage$/, build: () => [{ label: "Usage" }] },
  { pattern: /^\/activity$/, build: () => [{ label: "Activity" }] },
  { pattern: /^\/limits$/, build: () => [{ label: "Limits" }] },
  { pattern: /^\/support$/, build: () => [{ label: "Support" }] },
  { pattern: /^\/onboarding$/, build: () => [{ label: "Onboarding" }] },
  // Settings pages
  {
    pattern: /^\/settings\/general$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "General" },
    ],
  },
  { pattern: /^\/settings\/billing$/, build: () => [{ label: "Billing" }] },
  {
    pattern: /^\/settings\/integrations$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "Integrations" },
    ],
  },
  {
    pattern: /^\/settings\/notifications$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "Notifications" },
    ],
  },
  { pattern: /^\/settings\/sso$/, build: () => [{ label: "SSO" }] },
  // Auth pages
  { pattern: /^\/login$/, build: () => [{ label: "Sign In" }] },
  { pattern: /^\/register$/, build: () => [{ label: "Sign Up" }] },
  {
    pattern: /^\/forgot-password$/,
    build: () => [{ label: "Reset Password" }],
  },
  { pattern: /^\/reset-password$/, build: () => [{ label: "Reset Password" }] },
];

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const cleanPath = pathname.replace(/\/$/, "") || "/";

  for (const { pattern, build } of ROUTE_BREADCRUMBS) {
    const matches = cleanPath.match(pattern);
    if (matches) {
      return build(cleanPath, matches);
    }
  }

  // Fallback: use path segments as labels
  const segments = cleanPath.split("/").filter(Boolean);
  return segments.map((segment) => ({
    label: segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  }));
}

export function Breadcrumb() {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = getBreadcrumbs(pathname);
  if (segments.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center">
        <ol className="flex items-center gap-1">
          {segments.map((segment, idx) => {
            const isLast = idx === segments.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1">
                {idx > 0 && (
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
                )}
                {segment.href && !isLast ? (
                  <Link
                    href={segment.href}
                    className="truncate text-sm text-[var(--signal-fg-secondary)] transition-colors hover:text-[var(--signal-fg-primary)]"
                  >
                    {segment.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate text-sm",
                      isLast
                        ? "font-semibold text-[var(--signal-fg-primary)]"
                        : "text-[var(--signal-fg-secondary)]",
                    )}
                  >
                    {segment.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
