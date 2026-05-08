import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Visual regression testing configuration.
 * Extends the base Playwright config with visual-specific settings:
 * - Single browser (chromium) for consistency
 * - Screenshot on failure disabled (every test takes screenshots)
 * - Higher timeout for visual comparisons
 * - Snapshot directory configured
 */
export default defineConfig({
  testDir: "./e2e/visual",
  /* Run tests sequentially for deterministic screenshots */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter */
  reporter: [["html", { open: "never" }], ["list"]],
  /* Global timeout for visual tests */
  timeout: 60000,
  expect: {
    /* Timeout for toHaveScreenshot() assertions */
    timeout: 15000,
    /* Configure snapshot comparison */
    toHaveScreenshot: {
      /* Allowable pixel difference ratio (0 = exact match) */
      maxDiffPixelRatio: 0.02,
      /* Threshold for pixel comparison (0-1). Higher = more tolerance */
      threshold: 0.1,
    },
  },
  /* Snapshot directory configuration */
  snapshotDir: "./e2e/visual/__snapshots__",
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL,
    /* Use data-testid for reliable selectors */
    testIdAttribute: "data-testid",
    /* Disable animations for stable screenshots */
    actionTimeout: 10000,
    /* Consistent viewport for all visual tests */
    viewport: { width: 1440, height: 900 },
    /* Disable CSS animations and transitions for deterministic screenshots */
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* Override viewport to ensure consistency */
        viewport: { width: 1440, height: 900 },
        /* Stable device scale factor */
        deviceScaleFactor: 1,
        /* Ensure consistent color profile */
        colorScheme: "light",
      },
    },
  ],
  /* Run local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
