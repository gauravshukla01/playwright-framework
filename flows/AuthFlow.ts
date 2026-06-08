// flows/AuthFlow.ts
import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { USERS } from '../data/users';
import { UserCredentials } from '../types';

export class AuthFlow {
  private readonly loginPage:     LoginPage;
  private readonly inventoryPage: InventoryPage;

  constructor(private readonly page: Page) {
    this.loginPage     = new LoginPage(page);
    this.inventoryPage = new InventoryPage(page);
  }

  // ─── Login journeys ───────────────────────────────────────

  /**
   * Navigates to base URL and logs in with provided credentials.
   * Use this for parameterised login tests.
   */
  async loginWith(credentials: UserCredentials): Promise<void> {
    await this.loginPage.navigateTo('/');
    await this.loginPage.fillUsername(credentials.username);
    await this.loginPage.fillPassword(credentials.password);
    await this.loginPage.clickLoginButton();
  }

  /**
   * Logs in as standard user and asserts inventory page is visible.
   * Use this as a precondition in other flows.
   */
  async loginAsStandardUser(): Promise<void> {
    await this.loginWith(USERS.STANDARD);
    await expect(this.inventoryPage.productList).toBeVisible();
  }

  /**
   * Attempts login as locked out user.
   * Does NOT assert — caller decides what to assert.
   */
  async loginAsLockedUser(): Promise<void> {
    await this.loginWith(USERS.LOCKED);
  }

  /**
   * Attempts login with invalid credentials.
   * Does NOT assert — caller decides what to assert.
   */
  async loginWithInvalidCredentials(): Promise<void> {
    await this.loginWith(USERS.INVALID);
  }

  // ─── Logout journey ───────────────────────────────────────

  /**
   * Logs out from inventory page and asserts login page is visible.
   */
  async logout(): Promise<void> {
    await this.inventoryPage.logout();
    await expect(this.loginPage.loginButton).toBeVisible();
  }

  // ─── Assertion helpers ────────────────────────────────────

  /**
   * Asserts the login error message contains expected text.
   */
  async assertLoginError(expectedText: string): Promise<void> {
    const errorMessage = await this.loginPage.getErrorMessage();
    expect(errorMessage).toContain(expectedText);
  }

  /**
   * Asserts user is on inventory page after successful login.
   */
  async assertLoginSuccess(): Promise<void> {
    await expect(this.inventoryPage.productList).toBeVisible();
    await this.inventoryPage.assertUrl(/inventory/);
  }
}