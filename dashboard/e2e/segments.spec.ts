import { test, expect } from './fixtures';

test.describe('Segment Management', () => {
  test.beforeEach(async ({ loginAsTestUser }) => {
    await loginAsTestUser();
  });

  test.describe('Create segment', () => {
    test('user can create a segment', async ({ segmentsPage }) => {
      await segmentsPage.goto();
      await segmentsPage.openCreateSegmentDialog();

      // Verify dialog is visible
      await expect(segmentsPage.createSegmentDialog).toBeVisible();

      // Fill in segment details
      await segmentsPage.segmentNameInput.fill('Premium Users');
      await segmentsPage.segmentDescriptionInput.fill('Users with premium subscription');
      await segmentsPage.createSegmentSubmitButton.click();

      // Verify segment was created
      await segmentsPage.expectSegmentExists('premium-users');
    });
  });

  test.describe('Add rules', () => {
    test('user can add rules to a segment', async ({ segmentsPage }) => {
      // Mock existing segments
      await segmentsPage.page.route('**/api/segments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            segments: [
              {
                id: '1',
                name: 'Premium Users',
                key: 'premium-users',
                description: 'Users with premium subscription',
                rules: [],
              },
            ],
          }),
        });
      });

      await segmentsPage.goto();

      // Navigate to segment detail and add rules
      const row = await segmentsPage.getSegmentRowByName('premium-users');
      await row.click();

      // Add a rule
      await segmentsPage.addRule('country', 'equals', 'US');
      await segmentsPage.expectRulesExist(1);
    });
  });

  test.describe('Delete segment', () => {
    test('user can delete a segment', async ({ segmentsPage }) => {
      // Mock segments data
      await segmentsPage.page.route('**/api/segments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            segments: [
              {
                id: '1',
                name: 'Premium Users',
                key: 'premium-users',
                description: 'Users with premium subscription',
                rules: [],
              },
            ],
          }),
        });
      });

      await segmentsPage.goto();

      // Delete the segment
      await segmentsPage.deleteSegment('premium-users');

      // Verify segment no longer exists
      await segmentsPage.expectSegmentDoesNotExist('premium-users');
    });
  });

  test.describe('Empty state', () => {
    test('empty state shows CTA', async ({ segmentsPage }) => {
      // Mock empty segments response
      await segmentsPage.page.route('**/api/segments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ segments: [] }),
        });
      });

      await segmentsPage.goto();
      await segmentsPage.expectEmptyStateVisible();
      await segmentsPage.expectEmptyStateCtaVisible();
    });
  });
});
