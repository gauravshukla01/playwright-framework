import { Page, FrameLocator, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export class InternetFramesPage extends BasePage {

  // iFrame page — TinyMCE editor
  readonly iframeEditorFrame: FrameLocator;
  readonly iframeEditorBody : Locator;

  // Nested frames page
  readonly topFrame: FrameLocator;
  readonly middleFrame: FrameLocator;
  readonly bottomFrame: FrameLocator;

  constructor(page: Page) {
    super(page);
    this.iframeEditorFrame  = page.frameLocator('iframe[id="mce_0_ifr"]');
    this.iframeEditorBody   = this.iframeEditorFrame.locator('body');

    this.topFrame           = page.frameLocator('frame[name="frame-top"]');
    this.middleFrame        = this.topFrame.frameLocator('frame[name="frame-middle"]');
    this.bottomFrame        = page.frameLocator('frame[name="frame-bottom"]');
  }

  async goToIframePage() {
    await this.navigateTo('/iframe');
  }

  async goToNestedFramesPage() {
    await this.navigateTo('/nested_frames');
  }
}