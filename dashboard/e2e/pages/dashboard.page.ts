import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly getStartedChecklist: Locator;
  readonly statCards: Locator;
  readonly recentActivitySection: Locator;
  readonly quickActionButtons: Locator;
  readonly newProjectButton: Locator;
  readonly newFlagButton: Locator;
  readonly newSegmentButton: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedChecklist = page.getByTestId('get-started-checklist');
    this.statCards = page.getByTestId('stat-cards');
    this.recentActivitySection = page.getByTestId('recent-activity');
    this.quickActionButtons = page.getByTestId('quick-actions');
    this.newProjectButton = page.getByTestId('new-project-button');
    this.newFlagButton = page.getByTestId('new-flag-button');
    this.newSegmentButton = page.getByTestId('new-segment-button');
    this.emptyStateMessage = page.getByTestId('empty-state-message');
    this.emptyStateCta = page.getByTestId('empty-state-cta');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateToFlags() {
    await this.newFlagButton.click();
  }

  async navigateToSegments() {
    await this.newSegmentButton.click();
  }

  async navigateToNewProject() {
    await this.newProjectButton.click();
  }

  async expectGetStartedChecklistVisible() {
    await expect(this.getStartedChecklist).toBeVisible();
  }

  async expectStatCardsVisible() {
    await expect(this.statCards).toBeVisible();
  }

  async expectRecentActivityVisible() {
    await expect(this.recentActivitySection).toBeVisible();
  }

  async expectQuickActionsVisible() {
    await expect(this.quickActionButtons).toBeVisible();
  }

  async expectEmptyStateVisible() {
    await expect(this.emptyStateMessage).toBeVisible();
  }

  async expectEmptyStateCtaVisible() {
    await expect(this.emptyStateCta).toBeVisible();
  }
}
