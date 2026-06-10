import { expect, Page } from '@playwright/test';
import { InternetNetworkInterceptionPage } from '../../pages/internet/InternetNetworkInterceptionPage';

export class InternetNetworkInterceptionFlow {
  private readonly networkPage: InternetNetworkInterceptionPage;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.networkPage = new InternetNetworkInterceptionPage(page);
  }

  async fulfillWithMockedResponse(): Promise<void> {
    // intercept the CSS and inject a custom background colour
    await this.page.route('**/*.css', async route => {
      const response = await route.fetch();
      const originalCSS = await response.text();
      const modifiedCSS = originalCSS + '\n body { background-color: red !important; }';
      await route.fulfill({ response, body: modifiedCSS });
    });

    await this.networkPage.goToDynamicLoadingPage();
    await this.networkPage.startButton.click();
    await expect(this.networkPage.finishText).toHaveText('Hello World!', { timeout: 10000 });
  }

  async abortRequest(): Promise<void> {
    // abort all CSS requests — page loads without styles
    await this.page.route('**/*.css', route => route.abort());

    await this.networkPage.goToDynamicLoadingPage();
    await this.networkPage.startButton.click();
    await expect(this.networkPage.finishText).toHaveText('Hello World!', { timeout: 10000 });
  }

  async continueRequest(): Promise<void> {
    let intercepted = false;

    // observe the request but let it pass through unchanged
    await this.page.route('**/*.css', route => {
      intercepted = true;
      route.continue();
    });

    await this.networkPage.goToDynamicLoadingPage();
    await this.networkPage.startButton.click();
    await expect(this.networkPage.finishText).toHaveText('Hello World!', { timeout: 10000 });

    // confirm the route handler was actually triggered
    expect(intercepted).toBe(true);
  }
}