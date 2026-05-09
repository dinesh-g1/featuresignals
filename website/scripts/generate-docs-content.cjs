/**
 * generate-docs-content.cjs
 *
 * Post-build script: reads each pre-rendered doc HTML file from out/docs/
 * and writes a corresponding JSON file at out/docs/api/content/{slug}.json.
 *
 * Used by FlagEngine's DocsPanel for contextual documentation.
 * Runs as part of `npm run build` after Next.js static export.
 *
 * Usage: node scripts/generate-docs-content.cjs [outdir]
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUTDIR = process.argv[2] || "out";
const CONTENT_DIR = path.join(OUTDIR, "docs", "api", "content");

// All known doc slugs (mirrors DOC_SLUGS in website/src/lib/docs.ts)
const SLUGS = [
  "intro",
  "GLOSSARY",
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
  "architecture/overview",
  "architecture/evaluation-engine",
  "architecture/real-time-updates",
  "getting-started/quickstart",
  "getting-started/installation",
  "getting-started/create-your-first-flag",
  "getting-started/migration-overview",
  "getting-started/migrate-from-launchdarkly",
  "getting-started/migrate-from-flagsmith",
  "getting-started/migrate-from-unleash",
  "getting-started/migration-iac-export",
  "getting-started/migration-troubleshooting",
  "tutorials/feature-flag-checkout",
  "tutorials/ab-testing-react",
  "tutorials/progressive-rollout",
  "tutorials/kill-switch",
  "advanced/ai-janitor",
  "advanced/ai-janitor-quickstart",
  "advanced/ai-janitor-git-providers",
  "advanced/ai-janitor-configuration",
  "advanced/ai-janitor-pr-workflow",
  "advanced/ai-janitor-llm-integration",
  "advanced/ai-janitor-troubleshooting",
  "advanced/relay-proxy",
  "advanced/scheduling",
  "advanced/kill-switch",
  "advanced/approval-workflows",
  "advanced/webhooks",
  "advanced/audit-logging",
  "advanced/rbac",
  "advanced/migration",
  "dashboard/overview",
  "dashboard/managing-flags",
  "dashboard/env-comparison",
  "dashboard/target-inspector",
  "dashboard/target-comparison",
  "dashboard/evaluation-metrics",
  "dashboard/flag-health",
  "dashboard/usage-insights",
  "iac/overview",
  "iac/terraform",
  "iac/pulumi",
  "iac/ansible",
  "deployment/docker-compose",
  "deployment/self-hosting",
  "deployment/on-premises",
  "deployment/configuration",
  "self-hosting/onboarding-guide",
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
  "enterprise/overview",
  "enterprise/onboarding",
  "operations/incident-runbook",
  "operations/disaster-recovery",
];

function extractTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  if (!match) return "";
  return match[1]
    .replace(/\s*\|\s*Documentation\s*/g, "")
    .replace(/\s*\|\s*FeatureSignals\s*/g, "")
    .trim();
}

function extractDescription(html) {
  const match = html.match(
    /<meta[^>]*name="description"[^>]*content="([^"]*)"/i,
  );
  return match ? match[1] : "";
}

function extractContent(html) {
  // Try to find <main> with docs-main-heading aria
  let match = html.match(
    /<main[^>]*aria-labelledby="docs-main-heading"[^>]*>([\s\S]*?)<\/main>/i,
  );
  if (match) return match[1].trim();

  // Fallback: any <main> tag
  match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (match) return match[1].trim();

  // Last resort: return empty
  return "";
}

let generated = 0;
let skipped = 0;

for (const slug of SLUGS) {
  const htmlPath = path.join(OUTDIR, "docs", `${slug}.html`);
  const jsonPath = path.join(CONTENT_DIR, `${slug}.json`);

  if (!fs.existsSync(htmlPath)) {
    skipped++;
    console.log(`  ⚠️  Skipped: ${htmlPath} not found`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  const title = extractTitle(html);
  const description = extractDescription(html);
  const content = extractContent(html);
  const contentHash = crypto
    .createHash("md5")
    .update(slug + content)
    .digest("hex");

  const doc = {
    title,
    description,
    content,
    toc: [],
    contentHash,
  };

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));

  generated++;
  console.log(`  ✅ ${slug} → ${jsonPath}`);
}

console.log("");
console.log(`📄 Docs Content API: ${generated} generated, ${skipped} skipped`);
console.log(`📍 Output: ${CONTENT_DIR}/`);
