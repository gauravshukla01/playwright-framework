"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutFlow = void 0;
// flows/CheckoutFlow.ts
const test_1 = require("@playwright/test");
const InventoryPage_1 = require("../pages/InventoryPage");
const CheckoutPage_1 = require("../pages/CheckoutPage");
const users_1 = require("../data/users");
class CheckoutFlow {
    constructor(page) {
        this.page = page;
        this.inventoryPage = new InventoryPage_1.InventoryPage(page);
        this.checkoutPage = new CheckoutPage_1.CheckoutPage(page);
    }
    // ─── Cart journeys ────────────────────────────────────────
    /**
     * Adds a single item to cart by product name.
     */
    async addItemToCart(productName) {
        await this.inventoryPage.addItemToCartByName(productName);
    }
    /**
     * Adds multiple items to cart by product name.
     */
    async addMultipleItemsToCart(productNames) {
        for (const name of productNames) {
            await this.inventoryPage.addItemToCartByName(name);
        }
    }
    /**
     * Asserts cart badge shows expected item count.
     */
    async assertCartCount(expectedCount) {
        const count = await this.inventoryPage.getCartCount();
        (0, test_1.expect)(count).toBe(expectedCount);
    }
    // ─── Checkout journeys ────────────────────────────────────
    /**
     * Navigates from inventory to cart then to checkout step one.
     */
    async proceedToCheckout() {
        await this.inventoryPage.goToCart();
        await this.checkoutPage.proceedToCheckout();
    }
    /**
     * Fills checkout details form and continues to overview.
     * Uses CHECKOUT.VALID data by default.
     */
    async fillCheckoutDetails(details = users_1.CHECKOUT.VALID) {
        await this.checkoutPage.fillCheckoutDetails(details);
        await this.checkoutPage.clickContinue();
    }
    /**
     * Clicks finish and asserts confirmation is shown.
     */
    async completePurchase() {
        await this.checkoutPage.finishCheckout();
        await (0, test_1.expect)(this.checkoutPage.confirmationHeader).toBeVisible();
    }
    /**
     * Full end to end purchase flow in one call.
     * Adds item, proceeds through checkout, completes purchase.
     */
    async completePurchaseForItem(productName, details = users_1.CHECKOUT.VALID) {
        await this.addItemToCart(productName);
        await this.proceedToCheckout();
        await this.fillCheckoutDetails(details);
        await this.completePurchase();
    }
    // ─── Assertion helpers ────────────────────────────────────
    /**
     * Asserts confirmation header text matches expected.
     */
    async assertConfirmationMessage(expectedText) {
        const header = await this.checkoutPage.getConfirmationHeader();
        (0, test_1.expect)(header).toContain(expectedText);
    }
    /**
     * Asserts checkout error message contains expected text.
     */
    async assertCheckoutError(expectedText) {
        const error = await this.checkoutPage.getCheckoutError();
        (0, test_1.expect)(error).toContain(expectedText);
    }
}
exports.CheckoutFlow = CheckoutFlow;
