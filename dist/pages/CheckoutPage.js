"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutPage = void 0;
const BasePage_1 = require("./BasePage");
class CheckoutPage extends BasePage_1.BasePage {
    constructor(page) {
        super(page);
        // Cart
        this.cartList = page.locator('.cart_list');
        this.checkoutButton = page.locator('[data-test="checkout"]');
        this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
        // Your information
        this.firstNameInput = page.locator('[data-test="firstName"]');
        this.lastNameInput = page.locator('[data-test="lastName"]');
        this.postCodeInput = page.locator('[data-test="postalCode"]');
        this.continueButton = page.locator('[data-test="continue"]');
        this.cancelButton = page.locator('[data-test="cancel"]');
        this.checkoutError = page.locator('[data-test="error"]');
        // Overview + confirmation
        this.finishButton = page.locator('[data-test="finish"]');
        this.confirmationHeader = page.locator('.complete-header');
        this.confirmationText = page.locator('.complete-text');
    }
    // ─── Cart actions ──────────────────────────────────────────
    async proceedToCheckout() {
        await this.checkoutButton.click();
    }
    async getCartItemNames() {
        return this.page.locator('.inventory_item_name').allInnerTexts();
    }
    // ─── Your information actions ──────────────────────────────
    async fillCheckoutDetails(details) {
        await this.firstNameInput.fill(details.firstName);
        await this.lastNameInput.fill(details.lastName);
        await this.postCodeInput.fill(details.postCode);
    }
    async clickContinue() {
        await this.continueButton.click();
    }
    async getCheckoutError() {
        return this.checkoutError.innerText();
    }
    // ─── Overview + finish actions ─────────────────────────────
    async finishCheckout() {
        await this.finishButton.click();
    }
    async getConfirmationHeader() {
        return this.confirmationHeader.innerText();
    }
}
exports.CheckoutPage = CheckoutPage;
