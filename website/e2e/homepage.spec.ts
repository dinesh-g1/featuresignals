import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays the headline 'Mission-critical flags'", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Mission-critical flags");
  });

  test("displays the secondary headline 'Zero vendor lock-in' in accent color", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Zero vendor lock-in");
  });

  test("shows the Flag Rot Calculator heading", async ({ page }) => {
    await expect(
      page.getByText("Calculate Your Flag Rot Liability")
    ).toBeVisible();
  });

  test("Flag Rot Calculator slider exists and can be adjusted", async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Verify the initial value is displayed
    await expect(page.getByText("50")).toBeVisible();
    await expect(page.getByText("292,500")).toBeVisible();

    // Move the slider to 100
    await slider.fill("100");
    await expect(page.getByText("100")).toBeVisible();
    await expect(page.getByText("585,000")).toBeVisible();

    // Move the slider to 500
    await slider.fill("500");
    await expect(page.getByText("500")).toBeVisible();
    await expect(page.getByText("2,925,000")).toBeVisible();
  });

  test("displays 'Migrate from LaunchDarkly' CTA", async ({ page }) => {
    const cta = page.getByText("Migrate from LaunchDarkly");
    await expect(cta).toBeVisible();
  });

  test("displays 'Deploy in 3 Minutes' CTA in hero", async ({ page }) => {
    const hero = page.locator("section").first();
    const deployCta = hero.getByText("Deploy in 3 Minutes");
    await expect(deployCta).toBeVisible();
  });

  test("displays navigation bar with brand name", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("FeatureSignals")).toBeVisible();
  });

  test("displays the pricing section", async ({ page }) => {
    await expect(
      page.getByText("Pay for infrastructure. Not your success.")
    ).toBeVisible();
  });

  test("displays the migration section", async ({ page }) => {
    const migrationSection = page.locator("#migration");
    await expect(migrationSection).toBeVisible();
    await expect(
      migrationSection.getByText("Migrate from any provider in under an hour")
    ).toBeVisible();
  });

  test("displays the 'How it works' section with 3 steps", async ({ page }) => {
    await expect(page.getByText("Up and running in 3 minutes")).toBeVisible();
    await expect(page.getByText("Step 1")).toBeVisible();
    await expect(page.getByText("Step 2")).toBeVisible();
    await expect(page.getByText("Step 3")).toBeVisible();
  });

  test("footer shows 'All Edge Nodes Operational' status", async ({ page }) => {
    await expect(
      page.getByText("All Edge Nodes Operational")
    ).toBeVisible();
  });

  test("displays trust metrics and trusted-by logos", async ({ page }) => {
    await expect(
      page.getByText("Trusted by engineering teams at")
    ).toBeVisible();
  });

  test("final CTA is visible at the bottom", async ({ page }) => {
    await expect(
      page.getByText("Ready to ship faster?")
    ).toBeVisible();
    await expect(
      page.getByText("Start Free — No Credit Card")
    ).toBeVisible();
    await expect(
      page.getByText("Self-Host in 3 Minutes")
    ).toBeVisible();
  });

  test("navigation links are accessible", async ({ page }) => {
    // Desktop navigation should have key links (visible in the header)
    const header = page.locator("header");
    await expect(header.getByText("Pricing")).toBeVisible();
    await expect(header.getByText("Sign In")).toBeVisible();
    await expect(header.getByText("Start Free")).toBeVisible();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    // Narrow the viewport to trigger mobile layout
    await page.setViewportSize({ width: 375, height: 812 });

    const openButton = page.getByLabel("Open menu");
    await expect(openButton).toBeVisible();
    await openButton.click();

    // The mobile menu should now be visible with key content
    await expect(page.getByText("FeatureSignals")).toBeVisible();
    await expect(page.getByText("Sign In")).toBeVisible();
    await expect(page.getByText("Start Free")).toBeVisible();

    // Close the menu
    const closeButton = page.getByLabel("Close menu");
    await expect(closeButton).toBeVisible();
    await closeButton.click();
  });

  test("terminal command is visible in hero", async ({ page }) => {
    await expect(
      page.getByText(/fs migrate --from=launchdarkly/)
    ).toBeVisible();
  });
});
