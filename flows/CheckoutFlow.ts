// flows/CheckoutFlow.ts
import { Page, expect } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CHECKOUT, CheckoutDetails } from '../data/users';

export class CheckoutFlow {
  private readonly inventoryPage: InventoryPage;
  private readonly checkoutPage:  CheckoutPage;

  constructor(private readonly page: Page) {
    this.inventoryPage = new InventoryPage(page);
    this.checkoutPage  = new CheckoutPage(page);
  }

  // ─── Cart journeys ────────────────────────────────────────

  /**
   * Adds a single item to cart by product name.
   */
  async addItemToCart(productName: string): Promise<void> {
    await this.inventoryPage.addItemToCartByName(productName);
  }

  /**
   * Adds multiple items to cart by product name.
   */
  async addMultipleItemsToCart(productNames: string[]): Promise<void> {
    for (const name of productNames) {
      await this.inventoryPage.addItemToCartByName(name);
    }
  }

  /**
   * Asserts cart badge shows expected item count.
   */
  async assertCartCount(expectedCount: number): Promise<void> {
    const count = await this.inventoryPage.getCartCount();
    expect(count).toBe(expectedCount);
  }

  // ─── Checkout journeys ────────────────────────────────────

  /**
   * Navigates from inventory to cart then to checkout step one.
   */
  async proceedToCheckout(): Promise<void> {
    await this.inventoryPage.goToCart();
    await this.checkoutPage.proceedToCheckout();
  }

  /**
   * Fills checkout details form and continues to overview.
   * Uses CHECKOUT.VALID data by default.
   */
  async fillCheckoutDetails(
    details: CheckoutDetails = CHECKOUT.VALID,
  ): Promise<void> {
    await this.checkoutPage.fillCheckoutDetails(details);
    await this.checkoutPage.clickContinue();
  }

  /**
   * Clicks finish and asserts confirmation is shown.
   */
  async completePurchase(): Promise<void> {
    await this.checkoutPage.finishCheckout();
    await expect(this.checkoutPage.confirmationHeader).toBeVisible();
  }

  /**
   * Full end to end purchase flow in one call.
   * Adds item, proceeds through checkout, completes purchase.
   */
  async completePurchaseForItem(
    productName: string,
    details: CheckoutDetails = CHECKOUT.VALID,
  ): Promise<void> {
    await this.addItemToCart(productName);
    await this.proceedToCheckout();
    await this.fillCheckoutDetails(details);
    await this.completePurchase();
  }

  // ─── Assertion helpers ────────────────────────────────────

  /**
   * Asserts confirmation header text matches expected.
   */
  async assertConfirmationMessage(expectedText: string): Promise<void> {
    const header = await this.checkoutPage.getConfirmationHeader();
    expect(header).toContain(expectedText);
  }

  /**
   * Asserts checkout error message contains expected text.
   */
  async assertCheckoutError(expectedText: string): Promise<void> {
    const error = await this.checkoutPage.getCheckoutError();
    expect(error).toContain(expectedText);
  }
}