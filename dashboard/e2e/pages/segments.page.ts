import { type Page, type Locator, expect } from '@playwright/test';

export class SegmentsPage {
  readonly page: Page;
  readonly createSegmentButton: Locator;
  readonly segmentNameInput: Locator;
  readonly segmentDescriptionInput: Locator;
  readonly createSegmentSubmitButton: Locator;
  readonly cancelCreateSegmentButton: Locator;
  readonly createSegmentDialog: Locator;
  readonly addRuleButton: Locator;
  readonly ruleTypeSelect: Locator;
  readonly ruleValueInput: Locator;
  readonly ruleOperatorSelect: Locator;
  readonly removeRuleButton: Locator;
  readonly saveRulesButton: Locator;
  readonly segmentRow: Locator;
  readonly deleteSegmentButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly confirmDeleteDialog: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateCta: Locator;
  readonly segmentsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createSegmentButton = page.getByTestId('create-segment-button');
    this.segmentNameInput = page.getByTestId('segment-name-input');
    this.segmentDescriptionInput = page.getByTestId('segment-description-input');
    this.createSegmentSubmitButton = page.getByTestId('create-segment-submit');
    this.cancelCreateSegmentButton = page.getByTestId('create-segment-cancel');
    this.createSegmentDialog = page.getByTestId('create-segment-dialog');
    this.addRuleButton = page.getByTestId('add-rule-button');
    this.ruleTypeSelect = page.getByTestId('rule-type-select');
    this.ruleValueInput = page.getByTestId('rule-value-input');
    this.ruleOperatorSelect = page.getByTestId('rule-operator-select');
    this.removeRuleButton = page.getByTestId('remove-rule-button');
    this.saveRulesButton = page.getByTestId('save-rules-button');
    this.segmentRow = page.getByTestId('segment-row');
    this.deleteSegmentButton = page.getByTestId('delete-segment-button');
    this.confirmDeleteButton = page.getByTestId('confirm-delete-button');
    this.confirmDeleteDialog = page.getByTestId('confirm-delete-dialog');
    this.emptyStateMessage = page.getByTestId('empty-state-message');
    this.emptyStateCta = page.getByTestId('empty-state-cta');
    this.segmentsTable = page.getByTestId('segments-table');
  }

  async goto() {
    await this.page.goto('/segments');
  }

  async openCreateSegmentDialog() {
    await this.createSegmentButton.click();
  }

  async createSegment(name: string, description?: string) {
    await this.createSegmentButton.click();
    await this.segmentNameInput.fill(name);
    if (description) {
      await this.segmentDescriptionInput.fill(description);
    }
    await this.createSegmentSubmitButton.click();
  }

  async addRule(ruleType: string, operator: string, value: string) {
    await this.addRuleButton.click();
    await this.ruleTypeSelect.selectOption(ruleType);
    await this.ruleOperatorSelect.selectOption(operator);
    await this.ruleValueInput.fill(value);
    await this.saveRulesButton.click();
  }

  async getSegmentRowByName(name: string): Promise<Locator> {
    return this.page.getByTestId(`segment-row-${name}`);
  }

  async deleteSegment(name: string) {
    const row = await this.getSegmentRowByName(name);
    await row.getByTestId('delete-segment-button').click();
    await this.confirmDeleteButton.click();
  }

  async expectSegmentExists(name: string) {
    const row = await this.getSegmentRowByName(name);
    await expect(row).toBeVisible();
  }

  async expectSegmentDoesNotExist(name: string) {
    const row = this.page.getByTestId(`segment-row-${name}`);
    await expect(row).not.toBeVisible();
  }

  async expectEmptyStateVisible() {
    await expect(this.emptyStateMessage).toBeVisible();
  }

  async expectEmptyStateCtaVisible() {
    await expect(this.emptyStateCta).toBeVisible();
  }

  async expectRulesExist(count: number) {
    const rules = this.page.getByTestId('segment-rule');
    await expect(rules).toHaveCount(count);
  }
}
