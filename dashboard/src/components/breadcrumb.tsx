"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  {
    pattern: /^\/dashboard$/,
    build: () => [{ label: "Overview" }],
  },
  {
    pattern: /^\/flags$/,
    build: () => [{ label: "Flags" }],
  },
  {
    pattern: /^\/flags\/([^/]+)$/,
    build: (_, matches) => [
      { label: "Flags", href: "/flags" },
      { label: decodeURIComponent(matches[1]) },
    ],
  },
  {
    pattern: /^\/segments$/,
    build: () => [{ label: "Segments" }],
  },
  {
    pattern: /^\/environments$/,
    build: () => [{ label: "Environments" }],
  },
  {
    pattern: /^\/usage-insights$/,
    build: () => [{ label: "Usage Insights" }],
  },
  {
    pattern: /^\/metrics$/,
    build: () => [{ label: "Eval Metrics" }],
  },
  {
    pattern: /^\/health$/,
    build: () => [{ label: "Flag Health" }],
  },
  {
    pattern: /^\/env-comparison$/,
    build: () => [{ label: "Env Comparison" }],
  },
  {
    pattern: /^\/target-inspector$/,
    build: () => [{ label: "Target Inspector" }],
  },
  {
    pattern: /^\/target-comparison$/,
    build: () => [{ label: "Target Compare" }],
  },
  {
    pattern: /^\/approvals$/,
    build: () => [{ label: "Approvals" }],
  },
  {
    pattern: /^\/audit$/,
    build: () => [{ label: "Audit Log" }],
  },
  {
    pattern: /^\/onboarding$/,
    build: () => [{ label: "Onboarding" }],
  },
  // Settings pages
  {
    pattern: /^\/settings\/general$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "General" },
    ],
  },
  {
    pattern: /^\/settings\/billing$/,
    build: () => [{ label: "Billing" }],
  },
  {
    pattern: /^\/settings\/api-keys$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "API Keys" },
    ],
  },
  {
    pattern: /^\/settings\/team$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "Team" },
    ],
  },
  {
    pattern: /^\/settings\/webhooks$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "Webhooks" },
    ],
  },
  {
    pattern: /^\/settings\/notifications$/,
    build: () => [
      { label: "Settings", href: "/settings/general" },
      { label: "Notifications" },
    ],
  },
  {
    pattern: /^\/settings\/sso$/,
    build: () => [{ label: "SSO" }],
  },
  // Auth pages
  {
    pattern: /^\/login$/,
    build: () => [{ label: "Sign In" }],
  },
  {
    pattern: /^\/signup$/,
    build: () => [{ label: "Sign Up" }],
  },
  {
    pattern: /^\/forgot-password$/,
    build: () => [{ label: "Reset Password" }],
  },
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
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                {segment.href && !isLast ? (
                  <Link
                    href={segment.href}
                    className="truncate text-sm text-slate-500 transition-colors hover:text-slate-700"
                  >
                    {segment.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate text-sm",
                      isLast
                        ? "font-semibold text-slate-900"
                        : "text-slate-500",
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
