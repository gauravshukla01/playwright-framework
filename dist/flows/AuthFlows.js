"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthFlow = void 0;
// flows/AuthFlow.ts
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../pages/LoginPage");
const InventoryPage_1 = require("../pages/InventoryPage");
const users_1 = require("../data/users");
class AuthFlow {
    constructor(page) {
        this.page = page;
        this.loginPage = new LoginPage_1.LoginPage(page);
        this.inventoryPage = new InventoryPage_1.InventoryPage(page);
    }
    // ─── Login journeys ───────────────────────────────────────
    /**
     * Navigates to base URL and logs in with provided credentials.
     * Use this for parameterised login tests.
     */
    async loginWith(credentials) {
        await this.loginPage.navigateTo('/');
        await this.loginPage.fillUsername(credentials.username);
        await this.loginPage.fillPassword(credentials.password);
        await this.loginPage.clickLoginButton();
    }
    /**
     * Logs in as standard user and asserts inventory page is visible.
     * Use this as a precondition in other flows.
     */
    async loginAsStandardUser() {
        await this.loginWith(users_1.USERS.STANDARD);
        await (0, test_1.expect)(this.inventoryPage.productList).toBeVisible();
    }
    /**
     * Attempts login as locked out user.
     * Does NOT assert — caller decides what to assert.
     */
    async loginAsLockedUser() {
        await this.loginWith(users_1.USERS.LOCKED);
    }
    /**
     * Attempts login with invalid credentials.
     * Does NOT assert — caller decides what to assert.
     */
    async loginWithInvalidCredentials() {
        await this.loginWith(users_1.USERS.INVALID);
    }
    // ─── Logout journey ───────────────────────────────────────
    /**
     * Logs out from inventory page and asserts login page is visible.
     */
    async logout() {
        await this.inventoryPage.logout();
        await (0, test_1.expect)(this.loginPage.loginButton).toBeVisible();
    }
    // ─── Assertion helpers ────────────────────────────────────
    /**
     * Asserts the login error message contains expected text.
     */
    async assertLoginError(expectedText) {
        const errorMessage = await this.loginPage.getErrorMessage();
        (0, test_1.expect)(errorMessage).toContain(expectedText);
    }
    /**
     * Asserts user is on inventory page after successful login.
     */
    async assertLoginSuccess() {
        await (0, test_1.expect)(this.inventoryPage.productList).toBeVisible();
        await this.inventoryPage.assertUrl(/inventory/);
    }
}
exports.AuthFlow = AuthFlow;
