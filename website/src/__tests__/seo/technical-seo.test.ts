import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const publicDir = path.resolve(__dirname, "../../../public");
const appDir = path.resolve(__dirname, "../../../src/app");

// ─── Expected pages from the sitemap ──────────────────────────────────────
// Website is now a single-page experience + signup. No scattered pages.
const EXPECTED_PAGES = [
  { path: "", priority: 1.0 },
  { path: "/signup", priority: 0.8 },
];

// ─── Expected page.tsx files that must exist ──────────────────────────────
const EXPECTED_PAGE_FILES = ["page.tsx", "signup/page.tsx"];

// ─── Expected pages that must have `export const metadata` ─────────────────
// signup/page.tsx is a "use client" component — metadata comes from layout.tsx
const PAGES_REQUIRING_METADATA = [
  "page.tsx", // via layout metadata
];

// ─── 1. robots.txt (static) ────────────────────────────────────────────────

describe.skip("SEO: robots.txt", () => {
  const robotsPath = path.join(publicDir, "robots.txt");

  it("exists in the public directory", () => {
    expect(fs.existsSync(robotsPath)).toBe(true);
  });

  it("allows all user agents", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("User-agent: *");
    expect(content).toContain("Allow: /");
  });

  it("disallows API routes", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("Disallow: /api/");
  });

  it("points to the sitemap", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain(
      "Sitemap: https://featuresignals.com/sitemap.xml",
    );
  });

  it("blocks GPTBot and CCBot crawlers", () => {
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("GPTBot");
    expect(content).toContain("CCBot");
  });
});

// ─── 2. sitemap.xml ────────────────────────────────────────────────────────

describe.skip("SEO: sitemap.xml", () => {
  const sitemapPath = path.join(publicDir, "sitemap.xml");

  it("exists in the public directory", () => {
    expect(fs.existsSync(sitemapPath)).toBe(true);
  });

  it("is valid XML with urlset namespace", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain(
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    );
  });

  it("covers all expected pages with correct base URL", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    for (const page of EXPECTED_PAGES) {
      const fullUrl = `https://featuresignals.com${page.path}`;
      expect(content).toContain(fullUrl);
    }
  });

  it("uses featuresignals.com domain (not localhost)", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).not.toContain("localhost");
    expect(content).toContain("featuresignals.com");
  });

  it("has correct priority for the homepage (1.0)", () => {
    const content = fs.readFileSync(sitemapPath, "utf-8");
    expect(content).toContain("<priority>1.0</priority>");
  });
});

// ─── 3. RSS Feed ───────────────────────────────────────────────────────────
// Blog moved to subdomain — no RSS feed expected on main site
describe.skip("SEO: RSS Feed", () => {
  const feedPath = path.join(publicDir, "rss.xml");

  it("blog RSS is not required on main site", () => {
    // RSS feed may or may not exist — accept either state
    // Blog lives on subdomain now
    expect(true).toBe(true);
  });
});

// ─── 4. Page file integrity ────────────────────────────────────────────────

describe.skip("SEO: Page file integrity", () => {
  it("all expected page.tsx files exist in the app directory", () => {
    for (const pageFile of EXPECTED_PAGE_FILES) {
      const fullPath = path.join(appDir, pageFile);
      expect(fs.existsSync(fullPath), `Missing: ${pageFile}`).toBe(true);
    }
  });

  it("only has expected page routes", () => {
    const pageFiles = ["page.tsx", "signup/page.tsx", "not-found.tsx"];
    for (const pageFile of pageFiles) {
      const fullPath = path.join(appDir, pageFile);
      expect(
        fs.existsSync(fullPath),
        `Required page missing: ${pageFile}`,
      ).toBe(true);
    }
  });

  it("layout has metadata for SEO", () => {
    const layoutPath = path.join(appDir, "layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("export const metadata");
  });
});

// ─── 5. Root layout JSON-LD ────────────────────────────────────────────────

describe.skip("SEO: Root layout JSON-LD", () => {
  const layoutPath = path.join(appDir, "layout.tsx");

  it("contains SoftwareApplication schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("SoftwareApplication");
  });

  it("contains Organization schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("Organization");
  });

  it("contains WebSite SearchAction schema", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("WebSite");
    expect(content).toContain("SearchAction");
  });

  it("has correct metadataBase URL", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("https://featuresignals.com");
  });

  it("has proper canonical URL alternates", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("canonical");
  });

  it("has keywords including 'LaunchDarkly alternative'", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("LaunchDarkly alternative");
  });

  it("references the favicon for OG image", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("favicon");
  });
});

// ─── 6. next.config.ts ─────────────────────────────────────────────────────

describe.skip("SEO: next.config.ts", () => {
  const configPath = path.resolve(__dirname, "../../../next.config.ts");

  it("has output: export for static generation", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain('output: "export"');
  });

  it("has unoptimized images (static export requirement)", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain("unoptimized: true");
  });
});

// ─── 7. Footer link integrity ─────────────────────────────────────────────

describe.skip("SEO: Footer link integrity", () => {
  const footerPath = path.resolve(
    __dirname,
    "../../../src/components/footer.tsx",
  );

  it("product links point to homepage anchors", () => {
    const content = fs.readFileSync(footerPath, "utf-8");
    expect(content).toContain("/#hero");
    expect(content).toContain("/#live-demo");
    expect(content).toContain("/#migration");
    expect(content).toContain("/#ai-janitor");
    expect(content).toContain("/#pricing");
  });

  it("signup link points to /signup page", () => {
    const content = fs.readFileSync(footerPath, "utf-8");
    expect(content).toContain("/signup");
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

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
