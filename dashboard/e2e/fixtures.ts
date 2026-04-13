import { test as base } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { DashboardPage } from './pages/dashboard.page';
import { FlagsPage } from './pages/flags.page';
import { SegmentsPage } from './pages/segments.page';

// Test user credentials for E2E tests
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

type Fixtures = {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  flagsPage: FlagsPage;
  segmentsPage: SegmentsPage;
  // Helper to login as a test user
  loginAsTestUser: () => Promise<void>;
  // Helper to mock API responses
  mockFlagsApi: (response: object, status?: number) => Promise<void>;
  mockSegmentsApi: (response: object, status?: number) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  flagsPage: async ({ page }, use) => {
    await use(new FlagsPage(page));
  },

  segmentsPage: async ({ page }, use) => {
    await use(new SegmentsPage(page));
  },

  loginAsTestUser: async ({ authPage, page }, use) => {
    await use(async () => {
      await authPage.goto();
      await authPage.login(TEST_USER.email, TEST_USER.password);
      await authPage.expectOnDashboard();
    });
  },

  mockFlagsApi: async ({ page }, use) => {
    await use(async (response: object, status = 200) => {
      await page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });
    });
  },

  mockSegmentsApi: async ({ page }, use) => {
    await use(async (response: object, status = 200) => {
      await page.route('**/api/segments**', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });
    });
  },
});

export { expect } from '@playwright/test';
export { TEST_USER };
