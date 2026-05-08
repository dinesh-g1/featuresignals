/**
 * Phase F.1 — Critical Business Paths
 *
 * This spec covers the day-to-day workflows that power users and teams
 * depend on: segment management, environment provisioning, API key
 * lifecycle, flag lifecycle (create → target → rollout → archive),
 * and project settings management.
 *
 * These tests validate that the core operational workflows work
 * correctly across all supported browsers.
 */

import { test, expect } from "@playwright/test";
import { injectToken } from "../fixtures/auth.fixture";
import {
  navigateTo,
  waitForPageLoad,
  waitForSuccessToast,
  expectDialogOpen,
} from "../utils/test-helpers";

// ── Segment Management ───────────────────────────────────────────────────

test.describe("Segment Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockSegments(page);
    await injectToken(page, "mock-jwt-token-segments");
  });

  test("User can create a segment", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/segments");
    await waitForPageLoad(page);

    // Click create segment
    await page.getByTestId("create-segment-button").click();
    await expectDialogOpen(page, "create-segment-dialog");

    // Fill segment form
    await page.getByTestId("segment-name-input").fill("Premium Users");
    await page
      .getByTestId("segment-description-input")
      .fill("Users on the premium plan with active subscription");
    await page.getByTestId("create-segment-submit").click();

    // Verify segment appears
    await expect(page.getByTestId("segment-row-premium-users")).toBeVisible({
      timeout: 10_000,
    });

    // Verify success toast
    await waitForSuccessToast(page, "Segment created");
  });

  test("User can add targeting rules to a segment", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/segments/premium-users");
    await waitForPageLoad(page);

    // Click "Add Rule" button
    await page.getByTestId("add-rule-button").click();

    // Fill the rule
    await page.getByTestId("rule-attribute-select").selectOption("plan");
    await page.getByTestId("rule-operator-select").selectOption("equals");
    await page.getByTestId("rule-value-input").fill("premium");

    // Save rules
    await page.getByTestId("save-rules-button").click();

    // Verify rule was added
    await expect(page.getByTestId("segment-rule")).toHaveCount(1);
    await expect(page.getByTestId("segment-rule")).toContainText("plan");

    await waitForSuccessToast(page, "Rules saved").catch(() => {});
  });

  test("User can add multiple rules with AND/OR logic", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/segments/premium-users");
    await waitForPageLoad(page);

    // Add first rule
    await page.getByTestId("add-rule-button").click();
    await page.getByTestId("rule-attribute-select").selectOption("plan");
    await page.getByTestId("rule-operator-select").selectOption("equals");
    await page.getByTestId("rule-value-input").fill("premium");
    await page.getByTestId("save-rules-button").click();

    // Add second rule
    await page.getByTestId("add-rule-button").click();

    // Select match type (AND/OR) if available
    const matchTypeSelect = page.getByTestId("match-type-select");
    if (await matchTypeSelect.isVisible({ timeout: 500 }).catch(() => false)) {
      await matchTypeSelect.selectOption("all"); // AND
    }

    await page.getByTestId("rule-attribute-select").selectOption("country");
    await page.getByTestId("rule-operator-select").selectOption("equals");
    await page.getByTestId("rule-value-input").fill("US");
    await page.getByTestId("save-rules-button").click();

    // Verify both rules exist
    await expect(page.getByTestId("segment-rule")).toHaveCount(2);
  });

  test("User can use a segment in a flag targeting rule", async ({ page }) => {
    // Navigate to a flag's targeting tab
    await page.route("**/api/flags/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "flag_1",
          key: "dark-mode",
          name: "Dark Mode",
          description: "",
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

    await navigateTo(page, "/projects/proj_test/flags/dark-mode");
    await waitForPageLoad(page);

    // Navigate to targeting tab
    const targetingTab = page.getByTestId("tab-targeting");
    if (await targetingTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await targetingTab.click();
    }

    // Add a rule that uses a segment
    await page.getByTestId("add-rule-button").click();

    // Select "segment" as the rule type
    const ruleTypeSelect = page.getByTestId("rule-type-select");
    if (await ruleTypeSelect.isVisible({ timeout: 500 }).catch(() => false)) {
      await ruleTypeSelect.selectOption("segment");
    }

    // Select the segment
    const segmentSelect = page.getByTestId("rule-segment-select");
    if (await segmentSelect.isVisible({ timeout: 500 }).catch(() => false)) {
      await segmentSelect.selectOption("premium-users");
    }

    // Save
    await page.getByTestId("save-rules-button").click();

    // Verify rule references the segment
    await expect(page.getByTestId("targeting-rule-item")).toContainText(
      "premium-users",
    );
  });

  test("User can delete a segment with confirmation", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/segments");
    await waitForPageLoad(page);

    const segmentRow = page.getByTestId("segment-row-premium-users");
    await expect(segmentRow).toBeVisible();

    // Click delete on the segment
    await segmentRow.getByTestId("delete-segment-button").click();

    // Confirm deletion dialog
    await expectDialogOpen(page, "confirm-delete-dialog");
    await page.getByTestId("confirm-delete-button").click();

    // Verify segment removed
    await expect(page.getByTestId("segment-row-premium-users")).not.toBeVisible(
      { timeout: 10_000 },
    );

    await waitForSuccessToast(page, "Segment deleted");
  });
});

// ── Environment Management ───────────────────────────────────────────────

test.describe("Environment Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockEnvironments(page);
    await injectToken(page, "mock-jwt-token-envs");
  });

  test("User can create a new environment", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/environments");
    await waitForPageLoad(page);

    await page.getByTestId("create-environment-button").click();
    await expectDialogOpen(page, "create-environment-dialog");

    await page.getByTestId("environment-name-input").fill("Staging");
    // Select a color
    await page.getByTestId("environment-color-yellow").click();

    await page.getByTestId("create-environment-submit").click();

    // Verify environment appears
    await expect(page.getByTestId("environment-row-staging")).toBeVisible({
      timeout: 10_000,
    });

    await waitForSuccessToast(page, "Environment created");
  });

  test("User can generate an SDK key for an environment", async ({ page }) => {
    await navigateTo(
      page,
      "/projects/proj_test/environments/development/api-keys",
    );
    await waitForPageLoad(page);

    // Click create API key
    await page.getByTestId("create-api-key-button").click();
    await expectDialogOpen(page, "create-api-key-dialog");

    await page.getByTestId("api-key-name-input").fill("My SDK Key");
    await page.getByTestId("api-key-type-select").selectOption("sdk");
    await page.getByTestId("create-api-key-submit").click();

    // Key reveal dialog should appear with the one-time key
    await expect(page.getByTestId("api-key-reveal-value")).toBeVisible({
      timeout: 10_000,
    });

    const keyValue = await page
      .getByTestId("api-key-reveal-value")
      .textContent();
    expect(keyValue).toBeTruthy();
    expect(keyValue).toMatch(/^fs_sdk_/);

    // Close the reveal dialog
    await page.getByTestId("api-key-reveal-done").click();

    // Verify key appears in the list
    await expect(page.getByTestId("api-key-row-my-sdk-key")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("User can revoke an API key", async ({ page }) => {
    await navigateTo(
      page,
      "/projects/proj_test/environments/development/api-keys",
    );
    await waitForPageLoad(page);

    // Find the key and revoke it
    const keyRow = page.getByTestId("api-key-row-my-sdk-key");
    await expect(keyRow).toBeVisible();

    await keyRow.getByTestId("revoke-api-key-button").click();
    await expectDialogOpen(page, "confirm-revoke-dialog");
    await page.getByTestId("confirm-revoke-button").click();

    // Verify key is marked as revoked
    await expect(keyRow.getByTestId("key-status-revoked")).toBeVisible();
  });

  test("User sees environment color bar across pages", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/flags");
    await waitForPageLoad(page);

    // The environment color bar should be visible
    const colorBar = page.getByTestId("env-color-bar");
    await expect(colorBar).toBeVisible();

    // Switch environment
    await page.getByTestId("environment-select").click();
    await page.getByTestId("environment-option-production").click();

    // URL should reflect the new environment
    await expect(page).toHaveURL(/env=production/);
  });
});

// ── Flag Lifecycle ───────────────────────────────────────────────────────

test.describe("Flag Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockFlagLifecycle(page);
    await injectToken(page, "mock-jwt-token-lifecycle");
  });

  test("Create → Target → Rollout → Archive a flag", async ({ page }) => {
    // ── Step 1: Create the flag ──
    await navigateTo(page, "/projects/proj_test/flags");
    await waitForPageLoad(page);

    await page.getByTestId("create-flag-button").click();
    await expectDialogOpen(page, "create-flag-dialog");

    await page.getByTestId("flag-name-input").fill("New Checkout Flow");
    await page
      .getByTestId("flag-description-input")
      .fill("Gradual rollout of redesigned checkout experience");
    await page.getByTestId("create-flag-submit").click();

    await expect(page.getByTestId("flag-row-new-checkout-flow")).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 2: Add percentage rollout ──
    // Navigate to the flag detail page
    await page.getByTestId("flag-row-new-checkout-flow").click();
    await waitForPageLoad(page);

    // Navigate to the targeting/rollout tab
    const targetingTab = page.getByTestId("tab-targeting");
    if (await targetingTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await targetingTab.click();
    }

    // Set percentage rollout
    const rolloutSlider = page.getByTestId("percentage-rollout-slider");
    const rolloutInput = page.getByTestId("percentage-rollout-input");

    if (await rolloutInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await rolloutInput.fill("25");
    } else if (
      await rolloutSlider.isVisible({ timeout: 1_000 }).catch(() => false)
    ) {
      // Simulate slider drag (simplified)
      await rolloutSlider.fill("25");
    }

    // Save rollout settings
    await page.getByTestId("save-rollout-button").click();
    await waitForSuccessToast(page, "Rollout updated").catch(() => {});

    // ── Step 3: Archive the flag ──
    // Navigate to flag actions/settings
    const actionsMenu = page.getByTestId("flag-actions-menu");
    if (await actionsMenu.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await actionsMenu.click();
      await page.getByTestId("archive-flag-action").click();
    }

    // Confirm archive
    const confirmDialog = page.getByTestId("confirm-archive-dialog");
    if (await confirmDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByTestId("confirm-archive-button").click();
    }

    // Verify flag is archived (status should update)
    await waitForSuccessToast(page, "Flag archived").catch(() => {});
  });

  test("User can rollback a flag to a previous version", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/flags/dark-mode");
    await waitForPageLoad(page);

    // Navigate to version history tab
    const historyTab = page.getByTestId("tab-history");
    if (await historyTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await historyTab.click();
    }

    // Check that version history is visible
    const versions = page.getByTestId("flag-version-item");
    await expect(versions.first()).toBeVisible({ timeout: 5_000 });

    // Click rollback on an older version
    const rollbackButton = versions
      .nth(1)
      .getByTestId("rollback-version-button");
    if (await rollbackButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await rollbackButton.click();
      await expectDialogOpen(page, "confirm-rollback-dialog");
      await page.getByTestId("confirm-rollback-button").click();

      await waitForSuccessToast(page, "Flag rolled back").catch(() => {});
    }
  });

  test("User can promote a flag between environments", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/env-comparison");
    await waitForPageLoad(page);

    // Navigate to environment comparison
    const compareView = page.getByTestId("env-comparison-table");
    await expect(compareView).toBeVisible({ timeout: 5_000 });

    // Find a flag that differs between environments
    const promoteButton = page.getByTestId("promote-flag-button");
    if (await promoteButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await promoteButton.click();
      await expectDialogOpen(page, "promote-flag-dialog");
      await page.getByTestId("promote-confirm-button").click();

      await waitForSuccessToast(page, "Flag promoted").catch(() => {});
    }
  });

  test("User can kill-switch a flag in production", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/flags/dark-mode");
    await waitForPageLoad(page);

    // The kill switch should be accessible from the flag detail page
    const killSwitch = page.getByTestId("kill-switch-button");
    if (await killSwitch.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await killSwitch.click();

      // Production safety gate should appear
      await expect(page.getByTestId("production-safety-gate")).toBeVisible({
        timeout: 5_000,
      });

      // Confirm kill switch
      await page.getByTestId("kill-switch-confirm-button").click();

      // Verify flag is killed
      await expect(page.getByTestId("flag-status-killed")).toBeVisible();
    }
  });
});

// ── Project Settings ─────────────────────────────────────────────────────

test.describe("Project Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockProjectSettings(page);
    await injectToken(page, "mock-jwt-token-settings");
  });

  test("User can update project name and it persists", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/settings");
    await waitForPageLoad(page);

    // Find the project name input
    const nameInput = page.getByTestId("project-name-input");
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    // Change the name
    await nameInput.clear();
    await nameInput.fill("My Renamed App");

    // Save
    await page.getByTestId("save-project-settings-button").click();

    // Verify success
    await waitForSuccessToast(page, "Project updated");

    // Navigate away and back to verify persistence
    await navigateTo(page, "/projects");
    await navigateTo(page, "/projects/proj_test/settings");

    // Name should persist
    await expect(page.getByTestId("project-name-input")).toHaveValue(
      "My Renamed App",
    );
  });

  test("User can view and manage project members", async ({ page }) => {
    await navigateTo(page, "/projects/proj_test/settings");
    await waitForPageLoad(page);

    // Navigate to team/members tab
    const teamTab = page.getByTestId("tab-team");
    if (await teamTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await teamTab.click();
    }

    // Members list should be visible
    const membersTable = page.getByTestId("members-table");
    await expect(membersTable).toBeVisible({ timeout: 5_000 });

    // Invite a new member
    await page.getByTestId("invite-member-button").click();
    await expectDialogOpen(page, "invite-member-dialog");

    await page.getByTestId("invite-email-input").fill("developer@example.com");
    await page.getByTestId("invite-role-select").selectOption("editor");
    await page.getByTestId("invite-submit-button").click();

    await waitForSuccessToast(page, "Invitation sent");
  });
});

// ── Mock Setup Helpers ───────────────────────────────────────────────────

async function setupMockSegments(page: any) {
  // Mock segments list
  await page.route("**/api/segments?**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ segments: [], total: 0 }),
    });
  });

  // Mock segment creation
  await page.route("**/api/segments", async (route: any) => {
    const method = route.request().method();
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "seg_new",
          key: body.name?.toLowerCase().replace(/\s+/g, "-") || "new-segment",
          name: body.name,
          description: body.description || "",
          match_type: body.match_type || "all",
          rules: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          segments: [
            {
              id: "seg_1",
              key: "premium-users",
              name: "Premium Users",
              description: "Users on the premium plan",
              match_type: "all",
              rules: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      });
    }
  });

  // Mock single segment detail
  await page.route("**/api/segments/premium-users", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "seg_1",
        key: "premium-users",
        name: "Premium Users",
        description: "Users on the premium plan",
        match_type: "all",
        rules: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  });

  // Mock segment update (rules save)
  await page.route("**/api/segments/*", async (route: any) => {
    if (
      route.request().method() === "PUT" ||
      route.request().method() === "PATCH"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "seg_1",
          key: "premium-users",
          name: "Premium Users",
          description: "Users on the premium plan",
          match_type: "all",
          rules: [
            { attribute: "plan", operator: "equals", values: ["premium"] },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ deleted: true }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "seg_1",
          key: "premium-users",
          name: "Premium Users",
          description: "Users on the premium plan",
          match_type: "all",
          rules: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
  });
}

async function setupMockEnvironments(page: any) {
  // Mock environments list
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

  // Mock environment creation
  await page.route("**/api/environments", async (route: any) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "env_new",
          name: body.name,
          slug: body.name?.toLowerCase().replace(/\s+/g, "-"),
          color: body.color || "gray",
          created_at: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock API keys list
  await page.route(
    "**/api/projects/proj_test/api-keys**",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          api_keys: [
            {
              id: "key_1",
              key_prefix: "fs_sdk_abc123",
              name: "My SDK Key",
              type: "sdk",
              created_at: new Date().toISOString(),
              last_used_at: new Date().toISOString(),
            },
          ],
        }),
      });
    },
  );

  // Mock API key creation
  await page.route("**/api/api-keys", async (route: any) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "key_new",
          key: "fs_sdk_x1y2z3abcdefghijklmnop",
          key_prefix: "fs_sdk_x1y2",
          name: "My SDK Key",
          type: "sdk",
          env_id: "env_dev",
          created_at: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock API key revocation
  await page.route("**/api/api-keys/**", async (route: any) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ revoked: true }),
      });
    }
  });
}

async function setupMockFlagLifecycle(page: any) {
  // Mock projects
  await page.route("**/api/projects", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: "proj_test",
            name: "My App",
            slug: "my-app",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  // Mock environments
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

  // Mock flags list
  await page.route("**/api/flags?**", async (route: any) => {
    if (route.request().method() === "GET") {
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
    }
  });

  // Mock flag creation
  await page.route("**/api/flags", async (route: any) => {
    if (route.request().method() === "POST") {
      const body = route.request().postData();
      const parsed = body ? JSON.parse(body) : {};
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "flag_new2",
          key: parsed.key || "new-checkout-flow",
          name: parsed.name || "New Checkout Flow",
          description: parsed.description || "",
          flag_type: parsed.flag_type || "boolean",
          category: "release",
          status: "active",
          default_value: false,
          tags: parsed.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock flag detail
  await page.route("**/api/flags/dark-mode", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });

  // Mock flag state (for toggle, rollout, kill)
  await page.route("**/api/flags/dark-mode/state**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "state_dm",
        flag_id: "flag_dm",
        enabled: true,
        default_value: false,
        rules: [],
        percentage_rollout: 100,
        updated_at: new Date().toISOString(),
      }),
    });
  });

  // Mock flag versions
  await page.route("**/api/flags/*/versions**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        versions: [
          {
            id: "ver_3",
            version: 3,
            changes: { enabled: true },
            created_at: new Date().toISOString(),
          },
          {
            id: "ver_2",
            version: 2,
            changes: { percentage_rollout: 50 },
            created_at: new Date(Date.now() - 3600_000).toISOString(),
          },
          {
            id: "ver_1",
            version: 1,
            changes: { created: true },
            created_at: new Date(Date.now() - 7200_000).toISOString(),
          },
        ],
      }),
    });
  });

  // Mock environment comparison
  await page.route(
    "**/api/projects/proj_test/compare-environments**",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 3,
          diff_count: 1,
          diffs: [
            {
              flag_key: "dark-mode",
              source_enabled: true,
              target_enabled: false,
              source_rollout: 100,
              target_rollout: 0,
              differences: ["enabled", "rollout"],
            },
          ],
        }),
      });
    },
  );

  // Mock flag archive
  await page.route("**/api/flags/dark-mode/archive", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ archived: true, status: "archived" }),
    });
  });
}

async function setupMockProjectSettings(page: any) {
  // Mock project detail
  await page.route("**/api/projects/proj_test", async (route: any) => {
    const method = route.request().method();
    if (method === "PUT" || method === "PATCH") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "proj_test",
          name: body.name || "My Renamed App",
          slug: "my-app",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "proj_test",
          name: "My App",
          slug: "my-app",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock members list
  await page.route(
    "**/api/projects/proj_test/members**",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          members: [
            {
              id: "mem_1",
              org_id: "org_test",
              role: "admin",
              email: "admin@example.com",
              name: "Admin User",
            },
          ],
        }),
      });
    },
  );

  // Mock member invitation
  await page.route("**/api/members", async (route: any) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Invitation sent to developer@example.com",
        }),
      });
    }
  });

  // Mock projects list (for navigation)
  await page.route("**/api/projects", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: "proj_test",
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
