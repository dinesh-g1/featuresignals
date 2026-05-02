import { type Page, type Locator, expect } from "@playwright/test";

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;
  readonly errorMessage: Locator;
  readonly logoutButton: Locator;
  readonly sessionExpiredBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    this.forgotPasswordLink = page.getByTestId("forgot-password-link");
    this.signupLink = page.getByTestId("signup-link");
    this.errorMessage = page.getByTestId("login-error-message");
    this.logoutButton = page.getByTestId("logout-button");
    this.sessionExpiredBanner = page.getByTestId("session-expired-banner");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async navigateToForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectOnDashboard() {
    await expect(this.page).toHaveURL(/.*\/dashboard/);
  }

  async expectSessionExpiredMessage() {
    await expect(this.sessionExpiredBanner).toBeVisible();
  }
}
