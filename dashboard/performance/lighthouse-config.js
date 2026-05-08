/**
 * Lighthouse CI Configuration
 *
 * Used by @lhci/cli for automated performance testing in CI pipelines.
 *
 * Usage:
 *   npx lhci autorun --config=./performance/lighthouse-config.js
 *
 * Requires:
 *   npm install --save-dev @lhci/cli
 */

const baseURL = process.env.BASE_URL || "http://localhost:3000";

/** @type {import('@lhci/utils').LHCI.Configuration} */
module.exports = {
  ci: {
    collect: {
      url: [
        `${baseURL}/login`,
        `${baseURL}/register`,
        `${baseURL}/dashboard`,
        `${baseURL}/projects`,
        `${baseURL}/settings`,
        `${baseURL}/api-keys`,
        `${baseURL}/team`,
        `${baseURL}/activity`,
      ],
      /* Number of runs per URL for consistent results */
      numberOfRuns: 3,
      /* Start the server before collecting */
      startServerCommand: "npm run start",
      startServerReadyPattern: "ready",
      startServerReadyTimeout: 30000,
      /* Use headless Chrome */
      settings: {
        chromeFlags: "--no-sandbox --headless --disable-gpu",
      },
    },
    assert: {
      /* Budget presets for all pages */
      preset: "lighthouse:recommended",
      assertions: {
        /* --- Performance --- */
        "categories:performance": ["error", { minScore: 0.95 }],

        /* Core Web Vitals */
        "first-contentful-paint": [
          "error",
          { maxNumericValue: 1800 }, // < 1.8s
        ],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500 }, // < 2.5s
        ],
        "total-blocking-time": [
          "error",
          { maxNumericValue: 200 }, // < 200ms
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0.1 }, // < 0.1
        ],
        "speed-index": [
          "warn",
          { maxNumericValue: 2500 }, // < 2.5s
        ],
        interactive: [
          "warn",
          { maxNumericValue: 3500 }, // < 3.5s
        ],

        /* --- Accessibility --- */
        "categories:accessibility": ["error", { minScore: 0.95 }],

        /* --- Best Practices --- */
        "categories:best-practices": ["error", { minScore: 0.95 }],

        /* --- SEO --- */
        "categories:seo": ["error", { minScore: 0.95 }],

        /* --- Resource budgets --- */
        "resource-summary:script:size": [
          "warn",
          { maxNumericValue: 350000 }, // < 350 KB
        ],
        "resource-summary:stylesheet:size": [
          "warn",
          { maxNumericValue: 50000 }, // < 50 KB
        ],
        "resource-summary:font:size": [
          "warn",
          { maxNumericValue: 100000 }, // < 100 KB
        ],
        "resource-summary:image:size": [
          "warn",
          { maxNumericValue: 500000 }, // < 500 KB
        ],
        "resource-summary:total:size": [
          "warn",
          { maxNumericValue: 1500000 }, // < 1.5 MB
        ],
        "resource-summary:total:count": [
          "warn",
          { maxNumericValue: 30 }, // < 30 requests
        ],

        /* --- Specific audits --- */
        "unminified-javascript": "error",
        "unminified-css": "error",
        "unused-javascript": "warn",
        "unused-css-rules": "warn",
        "uses-optimized-images": "error",
        "uses-responsive-images": "warn",
        "uses-webp-images": "warn",
        "offscreen-images": "error",
        "uses-text-compression": "error",
        "uses-rel-preconnect": "warn",
        "font-display": "error",
        "no-document-write": "error",
        "uses-long-cache-ttl": "warn",
        "dom-size": "warn",
        "csp-xss": "warn",
      },
    },
    upload: {
      /* Upload results to LHCI server or temporary public storage */
      target: "temporary-public-storage",
    },
  },
};
