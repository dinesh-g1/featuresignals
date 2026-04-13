import { type Page, type Locator, expect } from '@playwright/test';

export class FlagsPage {
  readonly page: Page;
  readonly createFlagButton: Locator;
  readonly flagNameInput: Locator;
  readonly flagKeyInput: Locator;
  readonly flagDescriptionInput: Locator;
  readonly flagTypeSelect: Locator;
  readonly createFlagSubmitButton: Locator;
  readonly cancelCreateFlagButton: Locator;
  readonly createFlagDialog: Locator;
  readonly flagSearchInput: Locator;
  readonly flagFilterDropdown: Locator;
  readonly flagRow: Locator;
  readonly flagToggle: Locator;
  readonly deleteFlagButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly confirmDeleteDialog: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateCta: Locator;
  readonly keySuggestion: Locator;
  readonly flagsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createFlagButton = page.getByTestId('create-flag-button');
    this.flagNameInput = page.getByTestId('flag-name-input');
    this.flagKeyInput = page.getByTestId('flag-key-input');
    this.flagDescriptionInput = page.getByTestId('flag-description-input');
    this.flagTypeSelect = page.getByTestId('flag-type-select');
    this.createFlagSubmitButton = page.getByTestId('create-flag-submit');
    this.cancelCreateFlagButton = page.getByTestId('create-flag-cancel');
    this.createFlagDialog = page.getByTestId('create-flag-dialog');
    this.flagSearchInput = page.getByTestId('flag-search-input');
    this.flagFilterDropdown = page.getByTestId('flag-filter-dropdown');
    this.flagRow = page.getByTestId('flag-row');
    this.flagToggle = page.getByTestId('flag-toggle');
    this.deleteFlagButton = page.getByTestId('delete-flag-button');
    this.confirmDeleteButton = page.getByTestId('confirm-delete-button');
    this.confirmDeleteDialog = page.getByTestId('confirm-delete-dialog');
    this.emptyStateMessage = page.getByTestId('empty-state-message');
    this.emptyStateCta = page.getByTestId('empty-state-cta');
    this.keySuggestion = page.getByTestId('key-suggestion');
    this.flagsTable = page.getByTestId('flags-table');
  }

  async goto() {
    await this.page.goto('/flags');
  }

  async openCreateFlagDialog() {
    await this.createFlagButton.click();
  }

  async createFlag(name: string, description?: string, type: string = 'boolean') {
    await this.createFlagButton.click();
    await this.flagNameInput.fill(name);
    if (description) {
      await this.flagDescriptionInput.fill(description);
    }
    await this.flagTypeSelect.selectOption(type);
    await this.createFlagSubmitButton.click();
  }

  async searchFlags(query: string) {
    await this.flagSearchInput.fill(query);
  }

  async filterByType(type: string) {
    await this.flagFilterDropdown.click();
    await this.page.getByTestId(`filter-option-${type}`).click();
  }

  async getFlagRowByName(name: string): Promise<Locator> {
    return this.page.getByTestId(`flag-row-${name}`);
  }

  async toggleFlag(name: string) {
    const row = await this.getFlagRowByName(name);
    await row.getByTestId('flag-toggle').click();
  }

  async deleteFlag(name: string) {
    const row = await this.getFlagRowByName(name);
    await row.getByTestId('delete-flag-button').click();
    await this.confirmDeleteButton.click();
  }

  async expectFlagExists(name: string) {
    const row = await this.getFlagRowByName(name);
    await expect(row).toBeVisible();
  }

  async expectFlagDoesNotExist(name: string) {
    const row = this.page.getByTestId(`flag-row-${name}`);
    await expect(row).not.toBeVisible();
  }

  async expectKeySuggestionVisible(suggestion: string) {
    await expect(this.keySuggestion).toContainText(suggestion);
  }

  async expectEmptyStateVisible() {
    await expect(this.emptyStateMessage).toBeVisible();
  }

  async expectEmptyStateCtaVisible() {
    await expect(this.emptyStateCta).toBeVisible();
  }

  async expectFilterPersistedInUrl(filterValue: string) {
    await expect(this.page).toHaveURL(new RegExp(`[?&]filter=${filterValue}`));
  }
}
