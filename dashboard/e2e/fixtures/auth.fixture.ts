import { expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Test user factory — generates unique users to avoid collisions in
 * parallel test runs. Each call to `makeTestUser()` produces a new
 * unique email using a timestamp + random suffix.
 */
export interface TestUser {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

let userCounter = 0;

export function makeTestUser(seed?: string): TestUser {
  userCounter++;
  const ts = Date.now();
  const suffix = seed
    ? seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)
    : Math.random().toString(36).slice(2, 8);
  const unique = `${ts}-${userCounter}-${suffix}`;
  return {
    email: `e2e-${unique}@test.featuresignals.dev`,
    password: "E2eTestPass123!",
    name: `E2E User ${suffix}`,
    orgName: `E2E Org ${suffix}`,
  };
}

/**
 * Default static test user for tests that don't need signup isolation.
 * Use `makeTestUser()` for tests that register new accounts.
 */
export const DEFAULT_TEST_USER: TestUser = {
  email: "e2e-default@test.featuresignals.dev",
  password: "E2eTestPass123!",
  name: "E2E Default User",
  orgName: "E2E Default Org",
};

// ── Auth Helpers ────────────────────────────────────────────────────────

/**
 * Navigate to the login page.
 */
export async function goToLogin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to the register page.
 */
export async function goToRegister(page: Page): Promise<void> {
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
}

/**
 * Fill and submit the login form with email+password credentials.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await goToLogin(page);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("login-button").click();
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard|\/projects/, { timeout: 15_000 });
}

/**
 * Fill and submit the registration form (step 1: initiate signup).
 * Assumes the register page follows the multi-step flow with OTP verification.
 */
export async function registerStep1(
  page: Page,
  user: TestUser,
): Promise<void> {
  await goToRegister(page);

  // Fill the registration form
  await page.getByTestId("register-name-input").fill(user.name);
  await page.getByTestId("register-email-input").fill(user.email);
  await page.getByTestId("register-password-input").fill(user.password);
  await page.getByTestId("register-org-name-input").fill(user.orgName);

  // Submit the form (initiates signup, sends OTP)
  await page.getByTestId("register-submit-button").click();

  // Wait for OTP step to appear
  await page.waitForSelector('[data-testid="otp-input-container"]', {
    timeout: 15_000,
  });
}

/**
 * Complete OTP verification step. In E2E tests this requires either:
 * - A mocked backend that accepts any OTP, or
 * - A known test OTP from the server
 *
 * By default, uses "000000" as the test OTP (must be configured on the
 * test server to accept this code for test users).
 */
export async function verifyOTP(
  page: Page,
  otp: string = "000000",
): Promise<void> {
  // Fill each OTP digit slot
  const digits = otp.split("");
  for (let i = 0; i < digits.length; i++) {
    const slot = page.getByTestId(`otp-slot-${i}`);
    await slot.fill(digits[i]);
  }

  // Some implementations auto-submit when all digits are filled.
  // If not, click the verify button.
  const verifyButton = page.getByTestId("otp-verify-button");
  if (await verifyButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await verifyButton.click();
  }

  // Wait for redirect to onboarding or dashboard
  await page.waitForURL(
    /\/dashboard|\/projects|\/onboarding/,
    { timeout: 15_000 },
  );
}

/**
 * Complete the full signup flow: register → verify OTP → create org.
 * Returns the test user for reference.
 */
export async function fullSignup(
  page: Page,
  user?: TestUser,
): Promise<TestUser> {
  const u = user ?? makeTestUser();
  await registerStep1(page, u);
  await verifyOTP(page);
  return u;
}

/**
 * Check if the user appears to be logged in (on a dashboard page).
 */
export async function expectLoggedIn(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard|\/projects|\/onboarding/);
  // Context bar / sidebar should be visible for authenticated users
  await expect(page.getByTestId("context-bar")).toBeVisible({ timeout: 5_000 });
}

/**
 * Log out by clicking the user menu and selecting logout.
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu
  await page.getByTestId("user-menu-trigger").click();
  // Click logout
  await page.getByTestId("logout-button").click();
  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}

/**
 * Clear all auth state from the browser context to simulate session expiry.
 */
export async function clearAuthState(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  // Also clear localStorage/sessionStorage by evaluating in a page
  const page = context.pages()[0] ?? (await context.newPage());
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// ── Auth Fixture (for use with test.extend) ──────────────────────────────

/**
 * Fixture type that provides authentication helpers and an
 * already-authenticated page. Use with `test.extend()` in your
 * spec files, or import the plain functions above for direct use.
 */
export interface AuthFixture {
  /** Register a new test user and log them in. Returns the user. */
  signupAndLogin: (user?: TestUser) => Promise<TestUser>;
  /** Log in as the default test user. */
  loginAsDefaultUser: () => Promise<void>;
  /** Log out the current user. */
  logout: () => Promise<void>;
  /** Clear all auth state (simulates session expiry). */
  expireSession: () => Promise<void>;
}

/**
 * Utility to seed auth state into a page by setting localStorage
 * with a JWT token. Use when the backend provides a known test token.
 */
export async function injectToken(
  page: Page,
  token: string,
): Promise<void> {
  await page.goto("/");
  await page.evaluate((t) => {
    localStorage.setItem("fs_access_token", t);
    localStorage.setItem("fs_token_expires_at", String(Date.now() + 3600_000));
  }, token);
}
