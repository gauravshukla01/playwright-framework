import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export class InternetNetworkInterceptionPage extends BasePage {

  readonly startButton: Locator;
  readonly finishText: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.startButton      = page.locator('#start button');
    this.finishText       = page.locator('#finish h4');
    this.loadingIndicator = page.locator('#loading');
  }

  async goToDynamicLoadingPage(): Promise<void> {
    await this.navigateTo('/dynamic_loading/2');
  }
}