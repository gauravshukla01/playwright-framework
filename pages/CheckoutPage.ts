// pages/CheckoutPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CheckoutDetails } from '../data/users';

export class CheckoutPage extends BasePage {

  // ─── Step 1: Cart locators ────────────────────────────────
  readonly cartList:          Locator;
  readonly checkoutButton:    Locator;
  readonly continueShoppingButton: Locator;

  // ─── Step 2: Your information locators ───────────────────
  readonly firstNameInput:    Locator;
  readonly lastNameInput:     Locator;
  readonly postCodeInput:     Locator;
  readonly continueButton:    Locator;
  readonly cancelButton:      Locator;
  readonly checkoutError:     Locator;

  // ─── Step 3: Overview + confirmation locators ─────────────
  readonly finishButton:      Locator;
  readonly confirmationHeader:Locator;
  readonly confirmationText:  Locator;

  constructor(page: Page) {
    super(page);

    // Cart
    this.cartList               = page.locator('.cart_list');
    this.checkoutButton         = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');

    // Your information
    this.firstNameInput  = page.locator('[data-test="firstName"]');
    this.lastNameInput   = page.locator('[data-test="lastName"]');
    this.postCodeInput   = page.locator('[data-test="postalCode"]');
    this.continueButton  = page.locator('[data-test="continue"]');
    this.cancelButton    = page.locator('[data-test="cancel"]');
    this.checkoutError   = page.locator('[data-test="error"]');

    // Overview + confirmation
    this.finishButton       = page.locator('[data-test="finish"]');
    this.confirmationHeader = page.locator('.complete-header');
    this.confirmationText   = page.locator('.complete-text');
  }

  // ─── Cart actions ──────────────────────────────────────────

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async getCartItemNames(): Promise<string[]> {
    return this.page.locator('.inventory_item_name').allInnerTexts();
  }

  // ─── Your information actions ──────────────────────────────

  async fillCheckoutDetails(details: CheckoutDetails): Promise<void> {
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.postCodeInput.fill(details.postCode);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  async getCheckoutError(): Promise<string> {
    return this.checkoutError.innerText();
  }

  // ─── Overview + finish actions ─────────────────────────────

  async finishCheckout(): Promise<void> {
    await this.finishButton.click();
  }

  async getConfirmationHeader(): Promise<string> {
    return this.confirmationHeader.innerText();
  }
}