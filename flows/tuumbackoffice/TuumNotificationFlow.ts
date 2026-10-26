// flows/tuumbackoffice/TuumNotificationFlow.ts
import { Page, expect } from '@playwright/test';
import { TuumHomePage } from '../../pages/tuumbackoffice/TuumHomePage';
import { TuumFailedNotificationsPage } from '../../pages/tuumbackoffice/TuumFailedNotificationsPage';

export class TuumNotificationFlow {
  private readonly homePage: TuumHomePage;
  private readonly failedNotificationsPage: TuumFailedNotificationsPage;

  constructor(private readonly page: Page) {
    this.homePage = new TuumHomePage(page);
    this.failedNotificationsPage = new TuumFailedNotificationsPage(page);
  }

  // ─── Navigation journeys ──────────────────────────────────

  async openNotificationsPanel(): Promise<void> {
    await this.homePage.dismissProductTourIfVisible();
    await this.homePage.clickNotifications();
  }

  async navigateToFailedNotifications(): Promise<void> {
    await this.homePage.dismissProductTourIfVisible();
    await this.homePage.clickNotifications();
    await this.homePage.clickFailedNotifications();

    // Use page object methods — never access .page directly from flow
    await this.failedNotificationsPage.waitForTableToLoad();
    await this.failedNotificationsPage.dismissProductTourIfVisible();
  }

  // ─── Assertion helpers ────────────────────────────────────

  async assertFailedNotificationsLinkVisible(): Promise<void> {
    await expect(this.homePage.failedNotificationsLink).toBeVisible();
  }

  async assertWelcomeMessage(): Promise<void> {
    await this.homePage.assertWelcomeMessage('Welcome, Gaurav Shukla');
  }

  async assertFailedNotificationsPageLoaded(): Promise<void> {
    await this.failedNotificationsPage.assertPageHeadingVisible();
    await this.failedNotificationsPage.assertTableVisible();
  }

  async assertNotificationRecord(notificationId: string, expectedChannel: string): Promise<void> {
    await this.failedNotificationsPage.assertRowExists(notificationId);
    await this.failedNotificationsPage.assertNotificationId(notificationId);
    await this.failedNotificationsPage.assertChannel(expectedChannel);
  }

  async signOut(): Promise<void> {
    await this.homePage.signOut();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
