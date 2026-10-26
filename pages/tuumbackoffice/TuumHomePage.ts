// pages/tuumbackoffice/TuumHomePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class TuumHomePage extends BasePage {
  // ─── HeaderToolbar ────────────────────────────────────────
  readonly homeLink: Locator;
  readonly sidePanelToggle: Locator;
  readonly accountSettingsButton: Locator;

  // ─── MainNavigationMenu ───────────────────────────────────
  readonly mainMenuState: Locator;
  readonly scoutButton: Locator;
  readonly personsMenuItem: Locator;
  readonly accountsMenuItem: Locator;
  readonly paymentsMenuItem: Locator;
  readonly financeMenuItem: Locator;
  readonly reportsMenuItem: Locator;
  readonly nostroMenuItem: Locator;
  readonly administrationMenuItem: Locator;

  // ─── OnboardingBanner ─────────────────────────────────────
  readonly onboardingNoThanksButton: Locator;
  readonly onboardingYesButton: Locator;

  // Onboarding close (X) button excluded — low stability xpath locator,
  // flagged in plan.json (P02 OnboardingBanner actions).

  // ─── QuickActionsPanel ────────────────────────────────────
  readonly accountsTrigger: Locator;
  readonly camundaTrigger: Locator;
  readonly commonSettingsTrigger: Locator;
  readonly financeTrigger: Locator;
  readonly notificationsTrigger: Locator;
  readonly paymentsTrigger: Locator;

  // ─── Welcome Message ──────────────────────────────────────
  readonly welcomeMessage: Locator;

  // ─── Notifications Panel ──────────────────────────────────
  readonly failedNotificationsLink: Locator;

  // ─── Sign Out ─────────────────────────────────────────────
  readonly logoutButton: Locator;

  // ─── Product Tour (medium stability — no data-testid observed in plan.json) ──
  readonly productTourDialog: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.homeLink = page.locator("[aria-label='Home']");
    this.sidePanelToggle = page.locator("[data-testid='button-sidePanel-toggle']");
    this.accountSettingsButton = page.locator("[data-testid='button-account-settings']");

    // Navigation
    this.mainMenuState = page.locator('#main-menu-state');
    this.scoutButton = page.locator("[data-testid='menuItem-command-trigger']");
    this.personsMenuItem = page.locator("[data-testid='menuItem-persons']");
    this.accountsMenuItem = page.locator("[data-testid='menuItem-accounts']");
    this.paymentsMenuItem = page.locator("[data-testid='menuItem-payments']");
    this.financeMenuItem = page.locator("[data-testid='menuItem-finance']");
    this.reportsMenuItem = page.locator("[data-testid='menuItem-reports']");
    this.nostroMenuItem = page.locator("[data-testid='menuItem-nostro']");
    this.administrationMenuItem = page.locator("[data-testid='menuItem-administration']");

    // Onboarding banner
    this.onboardingNoThanksButton = page.locator("[data-testid='button-noThanks']");
    this.onboardingYesButton = page.locator("[data-testid='button-yes']");

    // Quick actions
    this.accountsTrigger = page.locator("[data-testid='trigger-accounts']");
    this.camundaTrigger = page.locator("[data-testid='trigger-camunda']");
    this.commonSettingsTrigger = page.locator("[data-testid='trigger-commonSettings']");
    this.financeTrigger = page.locator("[data-testid='trigger-finance']");
    this.notificationsTrigger = page.locator("[data-testid='trigger-notifications']");
    this.paymentsTrigger = page.locator("[data-testid='trigger-payments']");

    // Welcome message / notifications / sign out / product tour
    this.welcomeMessage = page.locator("[data-testid='page-title']");
    this.failedNotificationsLink = page.locator("[data-testid='link-failedNotifications']");
    this.logoutButton = page.locator("[data-testid='button-logout']");
    this.productTourDialog = page.locator('text=Minimise or maximise').first();
  }

  // ─── Actions ──────────────────────────────────────────────

  async isMainNavigationVisible(): Promise<boolean> {
    return await this.personsMenuItem.isVisible();
  }

  async dismissOnboardingBannerIfVisible(): Promise<void> {
    try {
      await this.onboardingNoThanksButton.waitFor({ state: 'visible', timeout: 3000 });
      await this.onboardingNoThanksButton.click();
    } catch {
      // banner absent — continue
    }
  }

  async isHomePage(): Promise<boolean> {
    return await this.personsMenuItem.isVisible();
  }

  async getWelcomeMessageText(): Promise<string> {
    return await this.welcomeMessage.innerText();
  }

  async assertWelcomeMessage(expectedText: string): Promise<void> {
    await expect(this.welcomeMessage).toHaveText(expectedText);
  }

  async clickNotifications(): Promise<void> {
    await this.notificationsTrigger.click();
    await this.failedNotificationsLink.waitFor({ state: 'visible' });
  }

  async clickFailedNotifications(): Promise<void> {
    await this.failedNotificationsLink.click();
    await this.page.waitForURL('**/notifications-failed');
  }

  async signOut(): Promise<void> {
    await this.accountSettingsButton.click();
    await this.logoutButton.waitFor({ state: 'visible' });
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }

  async dismissProductTourIfVisible(): Promise<void> {
    try {
      await this.productTourDialog.waitFor({ state: 'visible', timeout: 3000 });
      const closeButton = this.page.locator("[data-testid='product-tour'] button").first();
      await closeButton.click();
    } catch {
      // dialog not present — continue silently
    }
  }
}
