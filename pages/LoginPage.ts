// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {

  // ─── Locators ─────────────────────────────────────────────
  readonly usernameInput:    Locator;
  readonly passwordInput:    Locator;
  readonly loginButton:      Locator;
  readonly errorMessage:     Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput    = page.locator('[data-test="username"]');
    this.passwordInput    = page.locator('[data-test="password"]');
    this.loginButton      = page.locator('[data-test="login-button"]');
    this.errorMessage     = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('.error-button');
  }

  // ─── Actions ──────────────────────────────────────────────

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickLoginButton(): Promise<void> {
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.innerText();
  }

  async closeErrorMessage(): Promise<void> {
    await this.errorCloseButton.click();
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}