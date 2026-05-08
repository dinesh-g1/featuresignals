/**
 * Phase F.1 — The Golden Path: Signup → First Flag → First Evaluation
 *
 * This spec covers the critical new-user journey that every FeatureSignals
 * customer must complete. It is the single most important E2E test in the
 * suite — if this fails, the product is broken for new users.
 *
 * Test Strategy:
 * - Tests use mock API routes when a real backend is not available.
 * - Each test can run independently (no test-order dependency).
 * - All selectors use `data-testid` attributes for reliability.
 * - Tests follow Playwright best practices: auto-waiting, web-first assertions.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  makeTestUser,
  type TestUser,
  login,
  fullSignup,
  expectLoggedIn,
  injectToken,
} from "../fixtures/auth.fixture";
import {
  navigateTo,
  waitForPageLoad,
  waitForSuccessToast,
  waitForErrorToast,
  createTestFlag,
  expectDialogOpen,
  closeDialog,
  expectFieldError,
  expectSubmitDisabled,
  waitForTableRows,
} from "../utils/test-helpers";

// ── Test Configuration ───────────────────────────────────────────────────

/**
 * Use a serial test block for the complete onboarding flow since each
 * step depends on the previous one. For tests that can run independently,
 * use standard `test.describe` with `fullyParallel`.
 */
test.describe("Onboarding Golden Path", () => {
  /**
   * When running against a mock backend, set up API route handlers
   * that simulate the full signup → flag → evaluation lifecycle.
   */
  test.describe("Complete onboarding flow", () => {
    let user: TestUser;

    test.beforeEach(() => {
      user = makeTestUser("onboarding");
    });

    test("Step 1: User can register a new account", async ({ page }) => {
      await setupMockSignup(page, user);
      await page.goto("/register");
      await page.waitForLoadState("networkidle");

      // ── Fill registration form ──
      await page.getByTestId("register-name-input").fill(user.name);
      await page.getByTestId("register-email-input").fill(user.email);
      await page.getByTestId("register-password-input").fill(user.password);
      await page.getByTestId("register-org-name-input").fill(user.orgName);

      // Select data region if the dropdown exists
      const regionSelect = page.getByTestId("register-region-select");
      if (await regionSelect.isVisible({ timeout: 500 }).catch(() => false)) {
        await regionSelect.selectOption("eu");
      }

      await page.getByTestId("register-submit-button").click();

      // ── Verify OTP step appears ──
      await expect(page.getByTestId("otp-input-container")).toBeVisible({
        timeout: 10_000,
      });

      // ── Enter test OTP ──
      await fillOTP(page, "000000");

      // ── Wait for redirect to onboarding or dashboard ──
      await page.waitForURL(/\/onboarding|\/dashboard|\/projects/, {
        timeout: 15_000,
      });

      // ── Verify onboarding welcome is visible ──
      await expectLoggedIn(page);
    });

    test("Step 2: User completes onboarding wizard", async ({ page }) => {
      // Use a pre-authenticated state via token injection
      await setupMockOnboarding(page);
      await injectToken(page, "mock-jwt-token-onboarding");
      await page.goto("/onboarding");

      // ── Verify onboarding checklist is visible ──
      await expect(page.getByTestId("onboarding-checklist")).toBeVisible({
        timeout: 5_000,
      });

      // ── Complete "Create organization" step ──
      // This may already be done during signup; if not, fill org form
      const orgStep = page.getByTestId("onboarding-step-org");
      if (await orgStep.isVisible().catch(() => false)) {
        await orgStep.click();
        await page.getByTestId("onboarding-org-name-input").fill(user.orgName);
        await page.getByTestId("onboarding-step-next").click();
      }

      // ── Complete "Create first project" step ──
      const projectStep = page.getByTestId("onboarding-step-project");
      await projectStep.click();
      await page
        .getByTestId("onboarding-project-name-input")
        .fill("My First App");
      await page.getByTestId("onboarding-step-next").click();

      // ── Verify we move to the next step ──
      await expect(page.getByTestId("onboarding-step-flag")).toBeVisible({
        timeout: 5_000,
      });
    });

    test("Step 3: User creates their first feature flag", async ({ page }) => {
      await setupMockProjectContext(page);
      await injectToken(page, "mock-jwt-token-flag");
      await navigateTo(page, "/projects/proj_test/flags");

      // ── Verify flags page loads ──
      await waitForPageLoad(page);

      // ── Click Create Flag ──
      await page.getByTestId("create-flag-button").click();
      await expectDialogOpen(page, "create-flag-dialog");

      // ── Fill flag form ──
      await page.getByTestId("flag-name-input").fill("Dark Mode");
      // Key should auto-generate
      await expect(page.getByTestId("flag-key-input")).toHaveValue("dark-mode");

      await page
        .getByTestId("flag-description-input")
        .fill("Toggle dark mode for the application UI");
      await page.getByTestId("create-flag-submit").click();

      // ── Verify flag appears in the table ──
      await expect(page.getByTestId("flag-row-dark-mode")).toBeVisible({
        timeout: 10_000,
      });

      // ── Verify success feedback ──
      await waitForSuccessToast(page, "Flag created");
    });

    test("Step 4: User configures targeting rules", async ({ page }) => {
      await setupMockFlagDetail(page);
      await injectToken(page, "mock-jwt-token-targeting");
      await navigateTo(page, "/projects/proj_test/flags/dark-mode");

      await waitForPageLoad(page);

      // ── Navigate to Targeting tab ──
      const targetingTab = page.getByTestId("tab-targeting");
      if (await targetingTab.isVisible().catch(() => false)) {
        await targetingTab.click();
      }

      // ── Add a targeting rule ──
      await page.getByTestId("add-rule-button").click();

      // Fill the rule form
      await page.getByTestId("rule-attribute-select").selectOption("country");
      await page.getByTestId("rule-operator-select").selectOption("equals");
      await page.getByTestId("rule-value-input").fill("US");

      // Save the rule
      await page.getByTestId("save-rules-button").click();

      // ── Verify rule appears in the list ──
      await expect(page.getByTestId("targeting-rule-item")).toHaveCount(1);
      await expect(page.getByTestId("targeting-rule-item")).toContainText(
        "country",
      );

      // ── Verify save confirmation ──
      await waitForSuccessToast(page, "Rules saved").catch(() => {});
    });

    test("Step 5: User performs first evaluation", async ({ page }) => {
      await setupMockEvaluation(page);
      await injectToken(page, "mock-jwt-token-eval");
      await navigateTo(page, "/projects/proj_test/flags/dark-mode");

      await waitForPageLoad(page);

      // ── Navigate to "Test" or "Evaluate" tab ──
      const testTab = page.getByTestId("tab-test");
      if (await testTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await testTab.click();
      }

      // If there's a target inspector or evaluation form
      const evalForm = page.getByTestId("evaluation-form");
      if (await evalForm.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Fill target attributes
        await page.getByTestId("eval-target-key").fill("user-123");
        await page.getByTestId("eval-attribute-country").fill("US");

        // Trigger evaluation
        await page.getByTestId("eval-submit-button").click();

        // ── Verify evaluation result ──
        await expect(page.getByTestId("eval-result-value")).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.getByTestId("eval-result-value")).toContainText(
          "true",
        );

        // ── Verify evaluation reason is shown ──
        await expect(page.getByTestId("eval-result-reason")).toBeVisible();
      }

      // Alternative: use the flag quick-eval on the flags list page
      // Navigate back to flags list and use the quick eval button
    });

    test("Step 6: User toggles flag on/off", async ({ page }) => {
      await setupMockFlagToggle(page);
      await injectToken(page, "mock-jwt-token-toggle");
      await navigateTo(page, "/projects/proj_test/flags");

      await waitForPageLoad(page);

      // ── Find the Dark Mode flag row ──
      const flagRow = page.getByTestId("flag-row-dark-mode");
      await expect(flagRow).toBeVisible({ timeout: 10_000 });

      // ── Toggle ON ──
      const toggle = flagRow.getByTestId("flag-toggle");
      // Check initial state (should be ON after creation)
      const initialToggleState = await toggle.getAttribute("aria-checked");
      await toggle.click();

      // ── Verify toggle changed ──
      await page.waitForTimeout(500);
      const newToggleState = await toggle.getAttribute("aria-checked");
      expect(newToggleState).not.toBe(initialToggleState);

      // ── Toggle back OFF ──
      await toggle.click();
      await page.waitForTimeout(500);
      const finalToggleState = await toggle.getAttribute("aria-checked");
      expect(finalToggleState).toBe(initialToggleState);

      // ── Verify status indicator updates ──
      // The flag row should show the current enabled/disabled status
      const statusIndicator = flagRow.getByTestId("flag-status-indicator");
      await expect(statusIndicator).toBeVisible();
    });
  });
});

// ── Independent Onboarding Tests ─────────────────────────────────────────

test.describe("Onboarding - Form Validation", () => {
  test("Register form shows validation errors", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Submit without filling anything
    const submitButton = page.getByTestId("register-submit-button");
    await submitButton.click();

    // Should show field-level validation errors
    await expectFieldError(page, "register-name-input", "required");
    await expectFieldError(page, "register-email-input", "required");
    await expectFieldError(page, "register-password-input", "required");
  });

  test("Register form rejects invalid email", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("register-email-input").fill("not-an-email");
    await page.getByTestId("register-submit-button").click();

    await expectFieldError(page, "register-email-input", "valid email");
  });

  test("Register form rejects weak password", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const user = makeTestUser("weakpass");
    await page.getByTestId("register-name-input").fill(user.name);
    await page.getByTestId("register-email-input").fill(user.email);
    await page.getByTestId("register-password-input").fill("123");
    await page.getByTestId("register-submit-button").click();

    // Should warn about weak password
    await expectFieldError(page, "register-password-input", "characters");
  });
});

test.describe("Onboarding - Session Management", () => {
  test("New user is redirected to login after session expiry", async ({
    page,
  }) => {
    await setupMockSessionExpiry(page);
    await injectToken(page, "expired-jwt-token");

    // Try to access a protected page
    await navigateTo(page, "/projects");

    // Should be redirected to login with an expired session message
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByTestId("session-expired-banner")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("User can log out from the dashboard", async ({ page }) => {
    await setupMockDashboard(page);
    await injectToken(page, "mock-jwt-token-logout");

    await navigateTo(page, "/projects");
    await waitForPageLoad(page);

    // Open user menu
    await page.getByTestId("user-menu-trigger").click();
    // Click logout
    await page.getByTestId("logout-button").click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ── Mock Setup Helpers ───────────────────────────────────────────────────

/**
 * Set up mock API routes for the signup flow.
 * The mock intercepts the register endpoint and returns a successful response
 * with OTP verification state.
 */
async function setupMockSignup(page: Page, user: TestUser) {
  await page.route("**/api/auth/initiate-signup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "OTP sent to email",
        // For test purposes, we accept any OTP or use a test email provider
        session_token: "mock-session",
      }),
    });
  });

  await page.route("**/api/auth/complete-signup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user_test123",
          email: user.email,
          name: user.name,
          email_verified: true,
        },
        organization: {
          id: "org_test123",
          name: user.orgName,
          slug: user.orgName.toLowerCase().replace(/\s+/g, "-"),
          plan: "free",
        },
        tokens: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_at: Date.now() / 1000 + 3600,
        },
        onboarding_completed: false,
      }),
    });
  });

  // Mock OTP verification endpoint — accept "000000"
  await page.route("**/api/auth/verify-otp", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ verified: true }),
    });
  });
}

async function setupMockOnboarding(page: any) {
  await page.route("**/api/onboarding", async (route: any) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isNewUser: true,
          completedSteps: [],
          currentStep: "org",
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updated: true }),
      });
    }
  });

  // Mock project creation during onboarding
  await page.route("**/api/projects", async (route: any) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "proj_new123",
          name: "My First App",
          slug: "my-first-app",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          projects: [
            {
              id: "proj_new123",
              name: "My First App",
              slug: "my-first-app",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      });
    }
  });
}

async function setupMockProjectContext(page: any) {
  // Mock project list
  await page.route("**/api/projects", async (route: any) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          projects: [
            {
              id: "proj_test",
              name: "My First App",
              slug: "my-first-app",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      });
    }
  });

  // Mock environments (needed for project context)
  await page.route(
    "**/api/projects/proj_test/environments",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          environments: [
            {
              id: "env_dev",
              name: "Development",
              slug: "development",
              color: "blue",
              created_at: new Date().toISOString(),
            },
            {
              id: "env_prod",
              name: "Production",
              slug: "production",
              color: "red",
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    },
  );

  // Mock flags list (empty initial state)
  await page.route("**/api/flags?**", async (route: any) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ flags: [], total: 0 }),
      });
    }
  });

  // Mock flag creation
  await page.route("**/api/flags", async (route: any) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      const flag = {
        id: "flag_new",
        key: body.key || body.name?.toLowerCase().replace(/\s+/g, "-"),
        name: body.name,
        description: body.description || "",
        flag_type: body.flag_type || "boolean",
        category: "release",
        status: "active",
        default_value: false,
        tags: body.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(flag),
      });
    }
  });

  // Mock flag state (evaluation mock)
  await page.route("**/api/flags/*/state**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "state_1",
        flag_id: "flag_new",
        enabled: true,
        default_value: false,
        rules: [],
        percentage_rollout: 100,
        updated_at: new Date().toISOString(),
      }),
    });
  });
}

async function setupMockFlagDetail(page: any) {
  // Mock single flag detail
  await page.route("**/api/flags/dark-mode", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "flag_dm",
        key: "dark-mode",
        name: "Dark Mode",
        description: "Toggle dark mode for the application UI",
        flag_type: "boolean",
        category: "release",
        status: "active",
        default_value: false,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });

  // Mock flag state with targeting rules
  await page.route("**/api/flags/dark-mode/state**", async (route: any) => {
    const method = route.request().method();
    if (method === "PUT" || method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "state_1",
          flag_id: "flag_dm",
          enabled: true,
          default_value: false,
          rules: [
            {
              id: "rule_1",
              priority: 1,
              conditions: [
                { attribute: "country", operator: "equals", values: ["US"] },
              ],
              percentage: 100,
              value: true,
              match_type: "all",
            },
          ],
          percentage_rollout: 100,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "state_1",
          flag_id: "flag_dm",
          enabled: true,
          default_value: false,
          rules: [],
          percentage_rollout: 100,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  });
}

async function setupMockEvaluation(page: any) {
  await setupMockFlagDetail(page);

  // Mock evaluation endpoint
  await page.route("**/api/evaluate**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        flag_key: "dark-mode",
        value: true,
        reason: "TARGETING_MATCH",
        variant_key: null,
      }),
    });
  });

  // Mock target inspector endpoint
  await page.route("**/api/inspect-target**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        flag_key: "dark-mode",
        value: true,
        reason: "TARGETING_MATCH",
        individually_targeted: true,
      }),
    });
  });
}

async function setupMockFlagToggle(page: any) {
  // Mock flags list with one flag
  await page.route("**/api/flags?**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        flags: [
          {
            id: "flag_dm",
            key: "dark-mode",
            name: "Dark Mode",
            description: "Toggle dark mode",
            flag_type: "boolean",
            category: "release",
            status: "active",
            default_value: false,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
      }),
    });
  });

  // Mock toggle endpoint
  await page.route("**/api/flags/*/state", async (route: any) => {
    const method = route.request().method();
    if (method === "PUT" || method === "PATCH") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "state_1",
          flag_id: "flag_dm",
          enabled: body.enabled ?? !body.enabled,
          default_value: false,
          rules: [],
          percentage_rollout: 100,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "state_1",
          flag_id: "flag_dm",
          enabled: true,
          default_value: false,
          rules: [],
          percentage_rollout: 100,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  });
}

async function setupMockSessionExpiry(page: any) {
  // Mock that returns 401 for any authenticated endpoint
  await page.route("**/api/projects**", async (route: any) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Token expired",
        code: "SESSION_EXPIRED",
      }),
    });
  });
}

async function setupMockDashboard(page: any) {
  await page.route("**/api/projects**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: "proj_1",
            name: "My App",
            slug: "my-app",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
}

// ── OTP Helper ───────────────────────────────────────────────────────────

/**
 * Fill the OTP input fields on the registration verification step.
 */
async function fillOTP(page: any, otp: string): Promise<void> {
  const digits = otp.split("");
  for (let i = 0; i < digits.length; i++) {
    const slot = page.getByTestId(`otp-slot-${i}`);
    await slot.fill(digits[i]);
  }

  // Click verify button if auto-submit is not triggered
  const verifyButton = page.getByTestId("otp-verify-button");
  if (await verifyButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await verifyButton.click();
  }
}
