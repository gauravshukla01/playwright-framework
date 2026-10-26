// pages/tuumbackoffice/TuumFailedNotificationsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class TuumFailedNotificationsPage extends BasePage {
  // ─── Page Header ──────────────────────────────────────────
  readonly pageHeading: Locator;

  // ─── Notifications Table ──────────────────────────────────
  readonly notificationsTable: Locator;

  // ─── Row scoped to Notification ID-1008 ──────────────────
  readonly rowID1008: Locator;

  // ─── Cells scoped within row ID-1008 ─────────────────────
  readonly notificationIdCell: Locator;
  readonly channelCell: Locator;

  constructor(page: Page) {
    super(page);

    // Page header — data-testid from plan.json P03 PageHeading (high stability)
    this.pageHeading = page.locator("[data-testid='page-title']");

    // Table — data-testid from plan.json P03 NotificationsTable (high stability)
    this.notificationsTable = page.locator("[data-testid='table-notifications-failed-table']");

    // Row for ID-1008
    this.rowID1008 = page.locator("[data-testid='row-ID-1008']");

    // Cells scoped within row — CSS descendant per plan.json P03
    this.notificationIdCell = page
      .locator("[data-testid='row-ID-1008']")
      .locator("[data-testid='value-notificationID']");

    this.channelCell = page
      .locator("[data-testid='row-ID-1008']")
      .locator("[data-testid='value-channel']");
  }

  // ─── Actions ──────────────────────────────────────────────

  async assertPageHeadingVisible(): Promise<void> {
    await expect(this.pageHeading).toBeVisible();
  }

  async assertPageHeading(expectedText: string): Promise<void> {
    await expect(this.pageHeading).toContainText(expectedText);
  }

  async assertTableVisible(): Promise<void> {
    await expect(this.notificationsTable).toBeVisible({
      timeout: 15000, // increase from default 5000ms
    });
  }

  async getNotificationId(): Promise<string> {
    return await this.notificationIdCell.innerText();
  }

  async getChannel(): Promise<string> {
    return await this.channelCell.innerText();
  }

  async assertRowExists(notificationId: string): Promise<void> {
    await expect(this.page.locator(`[data-testid='row-${notificationId}']`)).toBeVisible();
  }

  async assertNotificationId(expectedId: string): Promise<void> {
    const actualId = await this.getNotificationId();
    expect(actualId).toContain(expectedId);
  }

  async assertChannel(expectedChannel: string): Promise<void> {
    const actualChannel = await this.getChannel();
    expect(actualChannel).toContain(expectedChannel);
  }

  async dismissProductTourIfVisible(): Promise<void> {
    try {
      const tourDialog = this.page.locator('text=Minimise or maximise').first();
      await tourDialog.waitFor({ state: 'visible', timeout: 3000 });
      await this.page.keyboard.press('Escape');
    } catch {
      // not present — continue
    }
  }

  async waitForTableToLoad(): Promise<void> {
    // Existing — waits for table container
    await this.notificationsTable.waitFor({
      state: 'visible',
      timeout: 15000,
    });

    // ADD THIS — waits for actual data rows to populate
    await this.page
      .locator("[data-testid='table-notifications-failed-table'] tbody tr")
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
  }
}
