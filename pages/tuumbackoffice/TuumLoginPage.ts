// pages/tuumbackoffice/TuumLoginPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export class TuumLoginPage extends BasePage {
  // ─── Locators ─────────────────────────────────────────────
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly signingInLink: Locator;

  // Password visibility toggle (label: 'label:has(#password) button') is
  // excluded — flagged as low stability in plan.json (P01 LoginForm actions).

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.signInButton = page.locator("[data-testid='button-signIn']");
    this.errorMessage = page.locator("div.text-center:has-text('Invalid credentials')");
    this.signingInLink = page.getByRole('link', { name: 'signing in' });
  }

  // ─── Actions ──────────────────────────────────────────────

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickSignIn(): Promise<void> {
    await this.signInButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.innerText();
  }

  async isErrorMessageVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}
