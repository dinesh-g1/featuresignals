import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const publicDir = path.resolve(__dirname, "../../../public");
const appDir = path.resolve(__dirname, "../../../src/app");

// ─── Expected pages from the sitemap ──────────────────────────────────────
const EXPECTED_PAGES = [
  { path: "", priority: 1.0 },
  { path: "/features", priority: 0.9 },
  { path: "/features/ai", priority: 0.9 },
  { path: "/features/integrations", priority: 0.8 },
  { path: "/features/security", priority: 0.8 },
  { path: "/pricing", priority: 0.9 },
  { path: "/use-cases", priority: 0.8 },
  { path: "/blog", priority: 0.8 },
  { path: "/blog/introducing-ai-janitor", priority: 0.7 },
  { path: "/blog/migrating-from-launchdarkly-guide", priority: 0.7 },
  { path: "/blog/sub-millisecond-flag-evaluation", priority: 0.7 },
  { path: "/blog/multi-iac-provider-support", priority: 0.7 },
  { path: "/blog/openfeature-interoperability", priority: 0.7 },
  { path: "/blog/soc2-compliant-feature-flags", priority: 0.7 },
  { path: "/blog/cost-of-flag-rot", priority: 0.7 },
  { path: "/blog/progressive-delivery-beyond-flags", priority: 0.7 },
  { path: "/changelog", priority: 0.6 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.5 },
  { path: "/status", priority: 0.5 },
  { path: "/privacy-policy", priority: 0.3 },
  { path: "/terms-and-conditions", priority: 0.3 },
  { path: "/refund-policy", priority: 0.3 },
  { path: "/cancellation-policy", priority: 0.3 },
];

// ─── Expected page.tsx files that must exist ──────────────────────────────
const EXPECTED_PAGE_FILES = [
  "page.tsx",
  "features/page.tsx",
  "features/ai/page.tsx",
  "features/integrations/page.tsx",
  "features/security/page.tsx",
  "pricing/page.tsx",
  "use-cases/page.tsx",
  "blog/page.tsx",
  "blog/[slug]/page.tsx",
  "changelog/page.tsx",
  "about/page.tsx",
  "contact/page.tsx",
  "status/page.tsx",
  "privacy-policy/page.tsx",
  "terms-and-conditions/page.tsx",
  "refund-policy/page.tsx",
  "cancellation-policy/page.tsx",
];

// ─── Expected pages that must have BreadcrumbList JSON-LD ─────────────────
const PAGES_REQUIRING_BREADCRUMB = [
  "features/page.tsx",
  "features/ai/page.tsx",
  "features/integrations/page.tsx",
  "features/security/page.tsx",
  "pricing/page.tsx",
  "use-cases/page.tsx",
  "blog/page.tsx",
  "changelog/page.tsx",
  "about/page.tsx",
  "contact/page.tsx",
  "status/page.tsx",
];

// ─── Expected pages that must have `export const metadata` ─────────────────
const PAGES_REQUIRING_METADATA = [
  "page.tsx", // via layout
  "features/page.tsx",
  "features/ai/page.tsx",
  "features/integrations/page.tsx",
  "features/security/page.tsx",
  "pricing/page.tsx",
  "use-cases/page.tsx",
  "blog/page.tsx",
  "blog/[slug]/page.tsx",
  "changelog/page.tsx",
  "about/page.tsx",
  "contact/page.tsx",
  "status/page.tsx",
  "privacy-policy/page.tsx",
  "terms-and-conditions/page.tsx",
  "refund-policy/page.tsx",
  "cancellation-policy/page.tsx",
];

// ─── 1. robots.txt ─────────────────────────────────────────────────────────

describe("SEO: robots.txt", () => {
  const robotsPath = path.join(publicDir, "robots.txt");

  it("exists in the public directory", () => {
    expect(fs.existsSync(robotsPath)).toBe(true);
  });

  it("allows all user agents", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("User-agent: *");
    expect(content).toContain("Allow: /");
  });

  it("points to the sitemap", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain(
      "Sitemap: https://featuresignals.com/sitemap.xml",
    );
  });
});

// ─── 2. sitemap.xml ────────────────────────────────────────────────────────

describe("SEO: sitemap.xml", () => {
  const sitemapPath = path.join(publicDir, "sitemap.xml");

  it("exists in the public directory", () => {
    expect(fs.existsSync(sitemapPath)).toBe(true);
  });

  it("is valid XML with urlset namespace", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
    expect(content).toContain("<urlset");
    expect(content).toContain("</urlset>");
  });

  it("covers all expected pages", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    for (const page of EXPECTED_PAGES) {
      const fullUrl = `https://featuresignals.com${page.path}`;
      expect(content).toContain(`<loc>${fullUrl}</loc>`);
    }
  });

  it("has correct priority for the homepage", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    const homeEntry = content.match(
      /<url>[\s\S]*?<loc>https:\/\/featuresignals\.com<\/loc>[\s\S]*?<priority>(.*?)<\/priority>/,
    );
    expect(homeEntry).not.toBeNull();
    expect(homeEntry![1]).toBe("1.0");
  });

  it("uses featuresignals.com domain (not localhost)", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    const locs = content.match(/<loc>(.*?)<\/loc>/g) || [];
    for (const loc of locs) {
      expect(loc).toContain("https://featuresignals.com");
      expect(loc).not.toContain("localhost");
    }
  });
});

// ─── 3. RSS Feed ───────────────────────────────────────────────────────────

describe("SEO: RSS Feed", () => {
  const feedPath = path.join(publicDir, "feed.xml");

  it("exists in the public directory", () => {
    expect(fs.existsSync(feedPath)).toBe(true);
  });

  it("is valid RSS 2.0 XML", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain("<channel>");
    expect(content).toContain("</channel>");
    expect(content).toContain("</rss>");
  });

  it("has a channel title matching the blog", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    expect(content).toContain("<title>FeatureSignals Blog</title>");
  });

  it("links to the blog", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    expect(content).toContain("<link>https://featuresignals.com/blog</link>");
  });

  it("contains all 8 blog posts as items", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    const items = content.match(/<item>[\s\S]*?<\/item>/g) || [];
    expect(items.length).toBe(8);
  });

  it("has correct permaLink GUID for each post", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    const slugs = [
      "introducing-ai-janitor",
      "migrating-from-launchdarkly-guide",
      "sub-millisecond-flag-evaluation",
      "multi-iac-provider-support",
      "openfeature-interoperability",
      "soc2-compliant-feature-flags",
      "cost-of-flag-rot",
      "progressive-delivery-beyond-flags",
    ];
    for (const slug of slugs) {
      expect(content).toContain(
        `<guid isPermaLink="true">https://featuresignals.com/blog/${slug}</guid>`,
      );
    }
  });

  it("has a valid lastBuildDate", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    expect(content).toContain("<lastBuildDate>");
  });

  it("has atom:self link for feed readers", () => {
    const content = fs.readFileSync(feedPath, "utf-8");
    expect(content).toContain(
      'href="https://featuresignals.com/feed.xml" rel="self"',
    );
  });
});

// ─── 4. Page file integrity ────────────────────────────────────────────────

describe("SEO: Page file integrity", () => {
  it("all expected page.tsx files exist in the app directory", () => {
    for (const file of EXPECTED_PAGE_FILES) {
      const fullPath = path.join(appDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it("no extra page.tsx files exist (unexpected pages)", () => {
    const pageCount = countPageFiles(appDir);
    expect(pageCount).toBe(EXPECTED_PAGE_FILES.length);
  });

  it("all pages have export const metadata for SEO", () => {
    for (const file of PAGES_REQUIRING_METADATA) {
      const fullPath = path.join(appDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      // page.tsx gets its metadata from the layout - skip it
      if (file === "page.tsx") continue;
      // blog/[slug]/page.tsx uses generateMetadata function
      if (file === "blog/[slug]/page.tsx") {
        expect(content).toContain("generateMetadata");
        continue;
      }
      expect(content).toContain("export const metadata");
    }
  });
});

// ─── 5. BreadcrumbList JSON-LD ─────────────────────────────────────────────

describe("SEO: BreadcrumbList JSON-LD", () => {
  it("all inner pages have BreadcrumbList structured data", () => {
    for (const file of PAGES_REQUIRING_BREADCRUMB) {
      const fullPath = path.join(appDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content, `${file} is missing BreadcrumbList JSON-LD`).toContain(
        '"@type": "BreadcrumbList"',
      );
    }
  });

  it("each BreadcrumbList has Home as position 1", () => {
    for (const file of PAGES_REQUIRING_BREADCRUMB) {
      const fullPath = path.join(appDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toContain("position: 1");
      expect(content).toContain('name: "Home"');
      expect(content).toContain('item: "https://featuresignals.com"');
    }
  });
});

// ─── 6. Layout: JSON-LD structured data ────────────────────────────────────

describe("SEO: Root layout JSON-LD", () => {
  const layoutPath = path.join(appDir, "layout.tsx");

  it("contains SoftwareApplication schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain('"SoftwareApplication"');
  });

  it("contains Organization schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain('"Organization"');
  });

  it("contains WebSite SearchAction schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain('"WebSite"');
    expect(content).toContain('"SearchAction"');
  });

  it("has correct metadataBase URL", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain('"https://featuresignals.com"');
  });

  it("has proper canonical URL alternates", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("canonical");
  });

  it("has keywords including 'LaunchDarkly alternative'", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("LaunchDarkly alternative");
  });

  it("references the favicon for OG image (not a broken PNG)", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("/favicon.svg");
  });
});

// ─── 7. Blog [slug] page ───────────────────────────────────────────────────

describe("SEO: Blog [slug] page", () => {
  const slugPagePath = path.join(appDir, "blog/[slug]/page.tsx");

  it("has generateStaticParams for all posts", () => {
    const content = fs.readFileSync(slugPagePath, "utf-8");
    expect(content).toContain("generateStaticParams");
  });

  it("has Article JSON-LD schema", () => {
    const content = fs.readFileSync(slugPagePath, "utf-8");
    expect(content).toContain('"@type": "Article"');
  });

  it("has per-post OpenGraph metadata via generateMetadata", () => {
    const content = fs.readFileSync(slugPagePath, "utf-8");
    expect(content).toContain("generateMetadata");
    expect(content).toContain("openGraph");
  });

  it("has Breadcrumb navigation", () => {
    const content = fs.readFileSync(slugPagePath, "utf-8");
    expect(content).toContain('aria-label="Breadcrumb"');
  });

  it("has related posts section", () => {
    const content = fs.readFileSync(slugPagePath, "utf-8");
    expect(content).toContain("Continue reading");
  });
});

// ─── 8. Pricing page: special schemas ──────────────────────────────────────

describe("SEO: Pricing page schemas", () => {
  const pricingPath = path.join(appDir, "pricing/page.tsx");

  it("has FAQPage JSON-LD with questions", () => {
    const content = fs.readFileSync(pricingPath, "utf-8");
    expect(content).toContain('"@type": "FAQPage"');
    expect(content).toContain('"@type": "Question"');
    expect(content).toContain('"@type": "Answer"');
  });

  it("has Product JSON-LD schema", () => {
    const content = fs.readFileSync(pricingPath, "utf-8");
    expect(content).toContain('"@type": "Product"');
  });

  it("has Offer pricing in Product schema", () => {
    const content = fs.readFileSync(pricingPath, "utf-8");
    expect(content).toContain('"@type": "Offer"');
    expect(content).toContain("price");
    expect(content).toContain("99");
  });

  it("has BreadcrumbList JSON-LD", () => {
    const content = fs.readFileSync(pricingPath, "utf-8");
    expect(content).toContain('"@type": "BreadcrumbList"');
  });
});

// ─── 9. next.config.ts integrity ───────────────────────────────────────────

describe("SEO: next.config.ts", () => {
  const configPath = path.resolve(__dirname, "../../../next.config.ts");

  it("has output: export for static generation", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain("output:");
    expect(content).toContain("export");
  });

  it("has unoptimized images (static export requirement)", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain("unoptimized");
    expect(content).toContain("true");
  });
});

// ─── Helper: count all page.tsx files ──────────────────────────────────────

function countPageFiles(dir: string): number {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countPageFiles(fullPath);
    } else if (entry.name === "page.tsx") {
      count++;
    }
  }
  return count;
}
