import { test, expect } from './fixtures';

test.describe('Flag Management', () => {
  test.beforeEach(async ({ loginAsTestUser }) => {
    await loginAsTestUser();
  });

  test.describe('Create flag', () => {
    test('user can create a flag with valid data', async ({ flagsPage }) => {
      await flagsPage.goto();
      await flagsPage.openCreateFlagDialog();

      // Verify dialog is visible
      await expect(flagsPage.createFlagDialog).toBeVisible();

      // Fill in flag details
      await flagsPage.flagNameInput.fill('Dark Mode');
      await flagsPage.flagDescriptionInput.fill('Enable dark mode feature');
      await flagsPage.flagTypeSelect.selectOption('boolean');
      await flagsPage.createFlagSubmitButton.click();

      // Verify flag was created
      await flagsPage.expectFlagExists('dark-mode');
    });

    test('user sees key suggestion when typing flag name', async ({ flagsPage }) => {
      await flagsPage.goto();
      await flagsPage.openCreateFlagDialog();

      // Type flag name and verify key suggestion appears
      await flagsPage.flagNameInput.fill('Dark Mode');
      await flagsPage.expectKeySuggestionVisible('dark-mode');
    });
  });

  test.describe('Toggle flag', () => {
    test('user can toggle a flag on/off', async ({ flagsPage }) => {
      // Mock initial flags data
      await flagsPage.page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flags: [
              { id: '1', name: 'dark-mode', key: 'dark-mode', type: 'boolean', enabled: true },
            ],
          }),
        });
      });

      await flagsPage.goto();

      // Toggle the flag off
      await flagsPage.toggleFlag('dark-mode');

      // Verify toggle request was made
      const toggleRequest = flagsPage.page.waitForRequest('**/api/flags/*/toggle');
      await toggleRequest;
    });
  });

  test.describe('Search and filter', () => {
    test('user can search and filter flags', async ({ flagsPage }) => {
      // Mock flags data
      await flagsPage.page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flags: [
              { id: '1', name: 'dark-mode', key: 'dark-mode', type: 'boolean', enabled: true },
              { id: '2', name: 'beta-feature', key: 'beta-feature', type: 'boolean', enabled: false },
              { id: '3', name: 'rollout-percentage', key: 'rollout-percentage', type: 'number', enabled: true },
            ],
          }),
        });
      });

      await flagsPage.goto();

      // Search for a specific flag
      await flagsPage.searchFlags('dark');
      await flagsPage.expectFlagExists('dark-mode');
    });
  });

  test.describe('Delete flag', () => {
    test('user can delete a flag with confirmation', async ({ flagsPage }) => {
      // Mock flags data
      await flagsPage.page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flags: [
              { id: '1', name: 'dark-mode', key: 'dark-mode', type: 'boolean', enabled: true },
            ],
          }),
        });
      });

      await flagsPage.goto();

      // Delete the flag
      await flagsPage.deleteFlag('dark-mode');

      // Verify flag no longer exists
      await flagsPage.expectFlagDoesNotExist('dark-mode');
    });
  });

  test.describe('Empty state', () => {
    test('empty state shows CTA when no flags exist', async ({ flagsPage }) => {
      // Mock empty flags response
      await flagsPage.page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ flags: [] }),
        });
      });

      await flagsPage.goto();
      await flagsPage.expectEmptyStateVisible();
      await flagsPage.expectEmptyStateCtaVisible();
    });
  });

  test.describe('Filter persistence', () => {
    test('filters persist in URL and survive refresh', async ({ flagsPage }) => {
      // Mock flags data
      await flagsPage.page.route('**/api/flags**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flags: [
              { id: '1', name: 'dark-mode', key: 'dark-mode', type: 'boolean', enabled: true },
            ],
          }),
        });
      });

      await flagsPage.goto();

      // Apply a filter
      await flagsPage.filterByType('boolean');

      // Verify filter is in URL
      await flagsPage.expectFilterPersistedInUrl('boolean');

      // Refresh the page
      await flagsPage.page.reload();

      // Verify filter is still applied
      await flagsPage.expectFilterPersistedInUrl('boolean');
    });
  });
});
