// flows/tuumbackoffice/TuumAuthFlow.ts
import { Page, expect } from '@playwright/test';
import { TuumLoginPage } from '../../pages/tuumbackoffice/TuumLoginPage';
import { TuumHomePage } from '../../pages/tuumbackoffice/TuumHomePage';
import { TUUM_USERS } from '../../data/tuumUsers';

export class TuumAuthFlow {
  private readonly loginPage: TuumLoginPage;
  private readonly homePage: TuumHomePage;

  constructor(private readonly page: Page) {
    this.loginPage = new TuumLoginPage(page);
    this.homePage = new TuumHomePage(page);
  }

  // ─── Login journeys ───────────────────────────────────────

  async loginWith(credentials: { username: string; password: string }): Promise<void> {
    await this.loginPage.navigateTo('/login');
    await this.loginPage.fillUsername(credentials.username);
    await this.loginPage.fillPassword(credentials.password);
    await this.loginPage.clickSignIn();
    await this.page.waitForURL('/');
    await this.homePage.dismissOnboardingBannerIfVisible();
  }

  async loginAsValidUser(): Promise<void> {
    await this.loginWith(TUUM_USERS.VALID);
    await expect(this.homePage.personsMenuItem).toBeVisible();
  }

  async attemptLoginWithInvalidCredentials(): Promise<void> {
    await this.loginPage.navigateTo('/login');
    await this.loginPage.fillUsername(TUUM_USERS.INVALID.username);
    await this.loginPage.fillPassword(TUUM_USERS.INVALID.password);
    await this.loginPage.clickSignIn();
    await this.loginPage.errorMessage.waitFor({ state: 'visible' });
  }

  // ─── Assertion helpers ────────────────────────────────────

  async assertLoginError(expectedText: string): Promise<void> {
    await expect(this.loginPage.errorMessage).toBeVisible();
    const errorText = await this.loginPage.getErrorMessage();
    expect(errorText).toContain(expectedText);
  }

  async assertRemainsOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
  }

  async assertMainNavVisible(): Promise<void> {
    await expect(this.homePage.personsMenuItem).toBeVisible();
  }

  async assertOnHomePage(): Promise<void> {
    await expect(this.page).toHaveURL('/');
  }
}
