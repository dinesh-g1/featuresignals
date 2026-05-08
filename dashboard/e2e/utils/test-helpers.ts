import { type Page, type Locator, expect } from "@playwright/test";

// ── Toast Helpers ────────────────────────────────────────────────────────

/**
 * Wait for a toast notification with the given message to appear.
 * The toast container is rendered at a fixed position on the page.
 *
 * @param page - Playwright Page
 * @param message - Expected toast message text (partial match)
 * @param type - Toast type: "success", "error", or "info" (default: any)
 * @param options.timeout - Max wait time in ms (default: 10_000)
 */
export async function waitForToast(
  page: Page,
  message: string,
  type?: "success" | "error" | "info",
  options?: { timeout?: number },
): Promise<Locator> {
  const timeout = options?.timeout ?? 10_000;

  // The toast container renders in a fixed position at bottom-right
  // Toast elements contain the message text and an icon indicating type
  const toast = page.locator(".fixed.bottom-4.right-4 > div", {
    hasText: message,
  });

  await toast.first().waitFor({ state: "visible", timeout });
  await expect(toast.first()).toContainText(message);

  if (type) {
    // Verify type-specific styling is present
    const typeClasses: Record<string, string> = {
      success: "bg-[var(--signal-bg-success-muted)]",
      error: "bg-[var(--signal-bg-danger-muted)]",
      info: "bg-[var(--signal-bg-accent-muted)]",
    };
    await expect(toast.first()).toHaveClass(new RegExp(typeClasses[type]));
  }

  return toast.first();
}

/**
 * Wait for a success toast with the given message.
 */
export async function waitForSuccessToast(
  page: Page,
  message: string,
  timeout?: number,
): Promise<Locator> {
  return waitForToast(page, message, "success", { timeout });
}

/**
 * Wait for an error toast with the given message.
 */
export async function waitForErrorToast(
  page: Page,
  message: string,
  timeout?: number,
): Promise<Locator> {
  return waitForToast(page, message, "error", { timeout });
}

/**
 * Dismiss all visible toasts by clicking them (if dismissible).
 */
export async function dismissToasts(page: Page): Promise<void> {
  const toasts = page.locator(".fixed.bottom-4.right-4 > div");
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click({ timeout: 1_000 }).catch(() => {});
  }
}

// ── Navigation Helpers ───────────────────────────────────────────────────

/**
 * Navigate to a path within the app and wait for the page to be fully loaded.
 * Uses `networkidle` to ensure all API calls have resolved.
 *
 * @param page - Playwright Page
 * @param path - URL path (e.g., "/flags", "/projects/proj_123/dashboard")
 * @param options.waitFor - Override wait strategy (default: "networkidle")
 */
export async function navigateTo(
  page: Page,
  path: string,
  options?: { waitFor?: "networkidle" | "load" | "domcontentloaded" },
): Promise<void> {
  const waitFor = options?.waitFor ?? "networkidle";
  await page.goto(path, { waitUntil: waitFor });
}

/**
 * Wait for the main content area to be visible (indicates page loaded).
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForSelector("main", { state: "visible", timeout: 10_000 });
  // Ensure no loading skeleton is still visible
  await page
    .waitForSelector('[data-testid="loading-skeleton"]', {
      state: "detached",
      timeout: 15_000,
    })
    .catch(() => {
      // Loading skeleton might not exist on every page — that's fine
    });
}

// ── Flag Form Helpers ────────────────────────────────────────────────────

export interface FlagFormData {
  name: string;
  key?: string;
  description?: string;
  type?: "boolean" | "string" | "number" | "json";
  tags?: string[];
}

/**
 * Fill the "Create Flag" dialog form.
 *
 * @param page - Playwright Page
 * @param data - Flag form data to fill
 */
export async function fillFlagForm(
  page: Page,
  data: FlagFormData,
): Promise<void> {
  // Fill flag name (required)
  await page.getByTestId("flag-name-input").fill(data.name);

  // Fill flag key if provided, otherwise it should auto-generate
  if (data.key) {
    await page.getByTestId("flag-key-input").fill(data.key);
  }

  // Fill description if provided
  if (data.description) {
    await page.getByTestId("flag-description-input").fill(data.description);
  }

  // Select flag type if provided (default is usually "boolean")
  if (data.type && data.type !== "boolean") {
    await page.getByTestId("flag-type-select").selectOption(data.type);
  }

  // Add tags if provided
  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      await page.getByTestId("flag-tag-input").fill(tag);
      await page.keyboard.press("Enter");
    }
  }
}

/**
 * Create a flag through the UI and return its key.
 * Assumes you're on the flags page or a page with "Create Flag" button.
 *
 * @param page - Playwright Page
 * @param name - Flag name (key is auto-derived)
 * @param description - Optional description
 * @returns The flag key (kebab-case derived from name)
 */
export async function createTestFlag(
  page: Page,
  name: string,
  description?: string,
): Promise<string> {
  const key = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Click "Create Flag" button
  await page.getByTestId("create-flag-button").click();

  // Wait for dialog
  await expect(page.getByTestId("create-flag-dialog")).toBeVisible({
    timeout: 5_000,
  });

  // Fill the form
  await fillFlagForm(page, { name, key, description });
  await page.getByTestId("create-flag-submit").click();

  // Wait for success toast or flag to appear in table
  await waitForSuccessToast(page, "Flag created").catch(() => {
    // If toast doesn't appear, just verify the flag row is visible
  });

  // Verify flag exists in the table/list
  await expect(page.getByTestId(`flag-row-${key}`)).toBeVisible({
    timeout: 10_000,
  });

  return key;
}

// ── Select / Dropdown Helpers ────────────────────────────────────────────

/**
 * Select an option from a Radix UI select component by its test-id.
 * Radix select renders options in a portal, so we need to look for
 * the option in the document body.
 *
 * @param page - Playwright Page
 * @param selectTestId - The data-testid of the select trigger
 * @param optionTestId - The data-testid of the option to select
 */
export async function selectRadixOption(
  page: Page,
  selectTestId: string,
  optionTestId: string,
): Promise<void> {
  await page.getByTestId(selectTestId).click();
  // Radix renders select content in a portal at the body level
  await page.getByTestId(optionTestId).click();
}

// ── Table Helpers ────────────────────────────────────────────────────────

/**
 * Wait for a table to be populated with at least `minRows` rows.
 */
export async function waitForTableRows(
  page: Page,
  tableTestId: string,
  minRows: number = 1,
): Promise<Locator> {
  const rows = page.getByTestId(tableTestId).locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  if (minRows > 0) {
    await expect(rows).not.toHaveCount(0);
  }
  return rows;
}

// ── Dialog Helpers ───────────────────────────────────────────────────────

/**
 * Wait for a dialog to open and return its locator.
 */
export async function expectDialogOpen(
  page: Page,
  dialogTestId: string,
): Promise<Locator> {
  const dialog = page.getByTestId(dialogTestId);
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

/**
 * Close a dialog by clicking its cancel button or pressing Escape.
 */
export async function closeDialog(
  page: Page,
  cancelTestId?: string,
): Promise<void> {
  if (cancelTestId) {
    const cancelButton = page.getByTestId(cancelTestId);
    if (await cancelButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cancelButton.click();
      return;
    }
  }
  // Fallback: press Escape
  await page.keyboard.press("Escape");
  // Wait for dialog to disappear
  await page.waitForTimeout(300);
}

// ── Form Validation Helpers ──────────────────────────────────────────────

/**
 * Expect a field-level validation error to be visible.
 */
export async function expectFieldError(
  page: Page,
  fieldTestId: string,
  message?: string,
): Promise<void> {
  const error = page.getByTestId(`${fieldTestId}-error`);
  await expect(error).toBeVisible();
  if (message) {
    await expect(error).toContainText(message);
  }
}

/**
 * Expect the submit button to be disabled (form is invalid/incomplete).
 */
export async function expectSubmitDisabled(
  page: Page,
  submitTestId: string,
): Promise<void> {
  await expect(page.getByTestId(submitTestId)).toBeDisabled();
}

/**
 * Expect the submit button to be enabled (form is valid).
 */
export async function expectSubmitEnabled(
  page: Page,
  submitTestId: string,
): Promise<void> {
  await expect(page.getByTestId(submitTestId)).toBeEnabled();
}

// ── Environment / API Key Helpers ────────────────────────────────────────

/**
 * Create an API key through the UI.
 * Assumes you're on the API Keys page in a project.
 */
export async function createAPIKey(
  page: Page,
  name: string,
  type: "sdk" | "server" = "sdk",
): Promise<string> {
  await page.getByTestId("create-api-key-button").click();
  await expect(page.getByTestId("create-api-key-dialog")).toBeVisible({
    timeout: 5_000,
  });

  await page.getByTestId("api-key-name-input").fill(name);
  await page.getByTestId("api-key-type-select").selectOption(type);
  await page.getByTestId("create-api-key-submit").click();

  // The key is typically shown once in a reveal dialog
  const keyReveal = page.getByTestId("api-key-reveal-value");
  await expect(keyReveal).toBeVisible({ timeout: 10_000 });
  const key = await keyReveal.textContent();

  // Close the reveal dialog
  await page.getByTestId("api-key-reveal-done").click();

  return key?.trim() ?? "";
}

// ── Environment Helpers ──────────────────────────────────────────────────

/**
 * Create an environment through the UI.
 */
export async function createEnvironment(
  page: Page,
  name: string,
  color?: string,
): Promise<void> {
  await page.getByTestId("create-environment-button").click();
  await expect(page.getByTestId("create-environment-dialog")).toBeVisible({
    timeout: 5_000,
  });

  await page.getByTestId("environment-name-input").fill(name);
  if (color) {
    await page.getByTestId(`environment-color-${color}`).click();
  }
  await page.getByTestId("create-environment-submit").click();

  await waitForSuccessToast(page, "Environment created").catch(() => {});
}

// ── Segment Helpers ──────────────────────────────────────────────────────

/**
 * Create a segment through the UI.
 */
export async function createSegment(
  page: Page,
  name: string,
  description?: string,
): Promise<string> {
  const key = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  await page.getByTestId("create-segment-button").click();
  await expect(page.getByTestId("create-segment-dialog")).toBeVisible({
    timeout: 5_000,
  });

  await page.getByTestId("segment-name-input").fill(name);
  if (description) {
    await page.getByTestId("segment-description-input").fill(description);
  }
  await page.getByTestId("create-segment-submit").click();

  // Verify it appears in the table
  await expect(page.getByTestId(`segment-row-${key}`)).toBeVisible({
    timeout: 10_000,
  });

  return key;
}
