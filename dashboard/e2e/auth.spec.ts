import { test, expect } from './fixtures';
import { TEST_USER } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ authPage }) => {
    await authPage.goto();
  });

  test('user can login with valid credentials', async ({ authPage }) => {
    await authPage.login(TEST_USER.email, TEST_USER.password);
    await authPage.expectOnDashboard();
  });

  test('user sees error on invalid credentials', async ({ authPage }) => {
    await authPage.login('invalid@example.com', 'wrongpassword');
    await authPage.expectErrorMessage('Invalid email or password');
  });

  test('user can navigate to forgot password', async ({ authPage, page }) => {
    await authPage.navigateToForgotPassword();
    await expect(page).toHaveURL(/.*\/forgot-password/);
  });

  test('user is redirected to dashboard after login', async ({ authPage }) => {
    await authPage.login(TEST_USER.email, TEST_USER.password);
    await authPage.expectOnDashboard();
    // Verify the URL contains /dashboard
    await expect(authPage.page).toHaveURL(/\/dashboard/);
  });

  test.describe('Session management', () => {
    test('session expiry redirects to login with message', async ({ authPage, page }) => {
      // Simulate session expiry by clearing auth cookies/storage
      await page.context().clearCookies();

      // Navigate to a protected page
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);

      // Should show session expired message
      await authPage.expectSessionExpiredMessage();
    });
  });
});
