import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ loginAsTestUser }) => {
    await loginAsTestUser();
  });

  test.describe('New user experience', () => {
    test('new user sees Get Started checklist', async ({ dashboardPage }) => {
      // Simulate new user by mocking empty state API response
      await dashboardPage.page.route('**/api/user/onboarding**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isNewUser: true, completedSteps: [] }),
        });
      });

      await dashboardPage.goto();
      await dashboardPage.expectGetStartedChecklistVisible();
    });
  });

  test.describe('Existing user experience', () => {
    test('existing user sees stat cards and recent activity', async ({ dashboardPage }) => {
      // Mock existing user data
      await dashboardPage.page.route('**/api/user/onboarding**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isNewUser: false, completedSteps: ['all'] }),
        });
      });

      await dashboardPage.page.route('**/api/stats**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFlags: 5,
            activeFlags: 3,
            totalSegments: 2,
            totalRequests: 1000,
          }),
        });
      });

      await dashboardPage.page.route('**/api/activity**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activities: [
              { id: 1, action: 'flag_created', timestamp: '2024-01-01' },
              { id: 2, action: 'segment_updated', timestamp: '2024-01-02' },
            ],
          }),
        });
      });

      await dashboardPage.goto();
      await dashboardPage.expectStatCardsVisible();
      await dashboardPage.expectRecentActivityVisible();
    });
  });

  test.describe('Quick actions', () => {
    test('quick action buttons navigate correctly', async ({ dashboardPage }) => {
      await dashboardPage.expectQuickActionsVisible();

      // Navigate to flags via quick action
      await dashboardPage.navigateToFlags();
      await expect(dashboardPage.page).toHaveURL(/.*\/flags/);

      // Go back to dashboard
      await dashboardPage.goto();

      // Navigate to segments via quick action
      await dashboardPage.navigateToSegments();
      await expect(dashboardPage.page).toHaveURL(/.*\/segments/);
    });
  });

  test.describe('Empty state', () => {
    test('empty state shows when no projects exist', async ({ dashboardPage }) => {
      // Mock empty projects
      await dashboardPage.page.route('**/api/projects**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ projects: [] }),
        });
      });

      await dashboardPage.goto();
      await dashboardPage.expectEmptyStateVisible();
      await dashboardPage.expectEmptyStateCtaVisible();
    });
  });
});
