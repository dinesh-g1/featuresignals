/**
 * docs.ts — Shared utilities for the /docs section.
 *
 * Responsibilities:
 *   1. MDX component registry (maps component names → React components)
 *   2. Frontmatter parser (title, description, tags extraction)
 *   3. Table-of-contents generator (extracts headings from rendered HTML)
 *   4. Slug-to-filepath resolver
 *   5. getDocContent() for the Docs Content API (Phase 2)
 *
 * Every consumer of docs content — page renderer, sidebar, content API —
 * imports from this single module.
 */

/* ------------------------------------------------------------------ */
/*  1. MDX Component Registry                                          */
/* ------------------------------------------------------------------ */

/**
 * lazyPreload is a convenience that webpack/Next.js can use to
 * preload dynamic imports when a section slug is matched.
 * For static export builds, all imports are bundled regardless,
 * so we keep the registry simple and eager.
 */
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Steps, { Step } from "@/components/docs/Steps";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";
import { TryIt } from "@/components/docs/TryIt";
import RolloutSimulator from "@/components/docs/rollout-simulator";
import TargetingRuleDemo from "@/components/docs/targeting-rule-demo";
import TryItSnippet from "@/components/docs/try-it-snippet";

/** Map of component names usable inside MDX content. */
export const MDX_COMPONENTS = {
  Callout,
  CodeBlock,
  Steps,
  Step,
  ApiEndpoint,
  TryIt,
  RolloutSimulator,
  TargetingRuleDemo,
  TryItSnippet,
} as const;

export type MdxComponentName = keyof typeof MDX_COMPONENTS;

/* ------------------------------------------------------------------ */
/*  2. Frontmatter Parser                                              */
/* ------------------------------------------------------------------ */

export interface DocFrontmatter {
  title: string;
  description: string;
  tags?: string[];
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n/;

/**
 * Parse YAML-like frontmatter from raw MDX content.
 * Only extracts `title`, `description`, and `tags` — the three
 * fields every doc page is required to carry.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: DocFrontmatter;
  body: string;
} {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    // No frontmatter block — treat the whole file as body
    return {
      frontmatter: { title: "", description: "" },
      body: raw.trimStart(),
    };
  }

  const fmBlock = match[1];
  const body = raw.slice(match[0].length).trimStart();

  const frontmatter: DocFrontmatter = { title: "", description: "" };

  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    switch (key) {
      case "title":
        frontmatter.title = value.replace(/^["']|["']$/g, "");
        break;
      case "description":
        frontmatter.description = value.replace(/^["']|["']$/g, "");
        break;
      case "tags":
        // Supports both `tags: [a, b, c]` and `tags: a, b, c`
        frontmatter.tags = value
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((t) => t.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        break;
    }
  }

  return { frontmatter, body };
}

/* ------------------------------------------------------------------ */
/*  3. Table of Contents Generator                                     */
/* ------------------------------------------------------------------ */

export interface TocEntry {
  level: number; // 2 = h2, 3 = h3, 4 = h4
  text: string;
  id: string;
}

/**
 * Extract headings (h2, h3, h4) from rendered MDX HTML and
 * return a flat ToC array with auto-generated IDs.
 */
export function generateToc(html: string): TocEntry[] {
  const headingRe = /<h([2-4])\b[^>]*>(.*?)<\/h\1>/gi;
  const entries: TocEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    const level = Number(match[1]);
    const innerHtml = match[2];
    // Strip any HTML tags inside the heading (e.g., <code>)
    const text = innerHtml.replace(/<[^>]*>/g, "").trim();
    const id = headingId(text);
    entries.push({ level, text, id });
  }

  return entries;
}

/** Generate a URL-friendly ID from heading text. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  4. Slug-to-Filepath Resolver                                       */
/* ------------------------------------------------------------------ */

/** Known doc slugs that map to dynamic route handlers (non-.mdx). */
const DYNAMIC_ROUTES = new Set(["api-reference"]);

/**
 * Given a doc slug (e.g. "core-concepts/feature-flags"),
 * return the filesystem path to the page.mdx file.
 *
 * Returns `null` for slugs handled by dynamic routes
 * (e.g. `api-reference/projects` → handled by `api-reference/[category]/page.tsx`).
 */
export function resolveSlugToFilepath(slug: string): string | null {
  const segments = slug.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // Check if the first segment is a dynamic route prefix
  if (DYNAMIC_ROUTES.has(segments[0]) && segments.length > 1) {
    // Dynamic route — content comes from the api-endpoints data, not .mdx
    return null;
  }

  return `website/src/app/docs/${slug}/page.mdx`;
}

/**
 * All known documentation slugs.
 * Populated by the build process or manually maintained.
 * Extend this list when new docs pages are added.
 */
export const DOC_SLUGS: readonly string[] = [
  // Intro
  "intro",
  "GLOSSARY",

  // Core Concepts (10)
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

  // Architecture (3)
  "architecture/overview",
  "architecture/evaluation-engine",
  "architecture/real-time-updates",

  // Getting Started (3)
  "getting-started/quickstart",
  "getting-started/installation",
  "getting-started/create-your-first-flag",

  // Migration (6)
  "getting-started/migration-overview",
  "getting-started/migrate-from-launchdarkly",
  "getting-started/migrate-from-flagsmith",
  "getting-started/migrate-from-unleash",
  "getting-started/migration-iac-export",
  "getting-started/migration-troubleshooting",

  // Tutorials (4)
  "tutorials/feature-flag-checkout",
  "tutorials/ab-testing-react",
  "tutorials/progressive-rollout",
  "tutorials/kill-switch",

  // AI Janitor (7)
  "advanced/ai-janitor",
  "advanced/ai-janitor-quickstart",
  "advanced/ai-janitor-git-providers",
  "advanced/ai-janitor-configuration",
  "advanced/ai-janitor-pr-workflow",
  "advanced/ai-janitor-llm-integration",
  "advanced/ai-janitor-troubleshooting",

  // Platform (8)
  "advanced/relay-proxy",
  "advanced/scheduling",
  "advanced/kill-switch",
  "advanced/approval-workflows",
  "advanced/webhooks",
  "advanced/audit-logging",
  "advanced/rbac",
  "advanced/migration",

  // FlagEngine Guides (8)
  "dashboard/overview",
  "dashboard/managing-flags",
  "dashboard/env-comparison",
  "dashboard/target-inspector",
  "dashboard/target-comparison",
  "dashboard/evaluation-metrics",
  "dashboard/flag-health",
  "dashboard/usage-insights",

  // IaC (4)
  "iac/overview",
  "iac/terraform",
  "iac/pulumi",
  "iac/ansible",

  // Deployment (5)
  "deployment/docker-compose",
  "deployment/self-hosting",
  "deployment/on-premises",
  "deployment/configuration",
  "self-hosting/onboarding-guide",

  // SDKs (10)
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

  // Security & Compliance (15)
  "compliance/security-overview",
  "compliance/privacy-policy",
  "compliance/data-retention",
  "compliance/dpa-template",
  "compliance/subprocessors",
  "compliance/gdpr-rights",
  "compliance/soc2/controls-matrix",
  "compliance/soc2/evidence-collection",
  "compliance/soc2/incident-response",
  "compliance/ccpa-cpra",
  "compliance/hipaa",
  "compliance/dora",
  "compliance/csa-star",
  "compliance/data-privacy-framework",
  "compliance/iso27001/isms-overview",
  "compliance/iso27701/pims-overview",

  // Enterprise (2)
  "enterprise/overview",
  "enterprise/onboarding",

  // Operations (2)
  "operations/incident-runbook",
  "operations/disaster-recovery",
];

/* ------------------------------------------------------------------ */
/*  5. getDocContent (for Docs Content API — Phase 2)                  */
/* ------------------------------------------------------------------ */

export interface DocContent {
  title: string;
  description: string;
  content: string; // HTML string
  toc: TocEntry[];
  contentHash: string;
}

/**
 * Retrieve rendered documentation content for a given slug.
 *
 * In production (static export), this function reads the pre-rendered
 * HTML files from the build output. In development, it reads the MDX
 * source and compiles on-the-fly.
 *
 * At build time, all page.mdx files are compiled to static HTML by Next.js.
 * The Content API serves those pre-rendered pages as JSON — no server-side
 * MDX compilation at runtime.
 */
export async function getDocContent(
  slug: string,
  section?: string,
): Promise<DocContent> {
  // In the static export model, we fetch the pre-rendered HTML page
  // and extract the content portion. For development, we'd use the
  // Next.js dev server's MDX compilation.

  // Base URL for fetching pre-rendered content
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const response = await fetch(`${baseUrl}/docs/${slug}`, {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`Document not found: ${slug}`);
  }

  const html = await response.text();

  // Extract the <main> content area from the full page HTML
  const mainMatch = html.match(
    /<main[^>]*aria-labelledby="docs-main-heading"[^>]*>([\s\S]*?)<\/main>/i,
  );
  const contentHtml = mainMatch ? mainMatch[1].trim() : html;

  // Extract title from <h1>
  const titleMatch = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
    : slug;

  // Extract description from meta
  const descMatch = html.match(
    /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i,
  );
  const description = descMatch ? descMatch[1] : "";

  // Generate ToC from headings
  const toc = generateToc(contentHtml);

  // Simple content hash for ETag (use slug + content length as proxy)
  const contentHash = `"${Buffer.from(slug + String(contentHtml.length))
    .toString("base64")
    .slice(0, 27)}"`;

  // If a specific section is requested, extract only that section
  let finalContent = contentHtml;
  if (section) {
    const sectionId = headingId(section);
    // Find the heading with matching ID and extract everything until the next heading of same or higher level
    const sectionRe = new RegExp(
      `<h([2-4])[^>]*id="${sectionId}"[^>]*>[\\s\\S]*?(?=<h[2-4]\\b|$)`,
      "i",
    );
    const sectionMatch = finalContent.match(sectionRe);
    if (sectionMatch) {
      finalContent = sectionMatch[0];
    }
  }

  return {
    title,
    description,
    content: finalContent,
    toc,
    contentHash,
  };
}

/* ------------------------------------------------------------------ */
/*  6. Breadcrumb Builder                                              */
/* ------------------------------------------------------------------ */

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

/**
 * Build breadcrumb segments from a doc slug.
 *
 * Example: "core-concepts/targeting-and-segments"
 *   → [{ label: "Docs", href: "/docs" },
 *      { label: "Core Concepts" },
 *      { label: "Targeting & Segments" }]
 */
export function buildBreadcrumbs(slug: string): BreadcrumbSegment[] {
  const crumbs: BreadcrumbSegment[] = [{ label: "Docs", href: "/docs" }];

  const segments = slug.split("/").filter(Boolean);

  // Map known path prefixes to section labels
  const sectionLabels: Record<string, string> = {
    "core-concepts": "Core Concepts",
    architecture: "Architecture",
    "getting-started": "Getting Started",
    tutorials: "Tutorials",
    advanced: "Platform",
    dashboard: "FlagEngine Guides",
    iac: "Infrastructure as Code",
    deployment: "Deployment",
    "self-hosting": "Self-Hosting",
    sdks: "SDKs",
    compliance: "Security & Compliance",
    enterprise: "Enterprise",
    operations: "Operations",
    "api-reference": "API Reference",
  };

  if (segments.length >= 2) {
    const sectionSlug = segments.slice(0, -1).join("/");
    const sectionLabel = sectionLabels[segments[0]] ?? segments[0];
    crumbs.push({
      label: sectionLabel,
      href: `/docs/${segments[0]}`,
    });
  }

  return crumbs;
}

/* ------------------------------------------------------------------ */
/*  7. Section-to-Slug Map (for sidebar & navigation)                  */
/* ------------------------------------------------------------------ */

export interface DocSection {
  label: string;
  slug: string;
  pages: string[]; // child slugs (full path)
}

/**
 * The canonical section structure for the documentation.
 * Mirrors the 3-tier progressive disclosure sidebar.
 */
export const DOC_SECTIONS: DocSection[] = [
  {
    label: "Introduction",
    slug: "intro",
    pages: ["intro", "GLOSSARY"],
  },
  {
    label: "Core Concepts",
    slug: "core-concepts",
    pages: [
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
    label: "Architecture",
    slug: "architecture",
    pages: [
      "architecture/overview",
      "architecture/evaluation-engine",
      "architecture/real-time-updates",
    ],
  },
];
