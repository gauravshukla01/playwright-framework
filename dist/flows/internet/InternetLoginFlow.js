"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternetLoginFlow = void 0;
const test_1 = require("@playwright/test");
const InternetLoginPage_1 = require("../../pages/internet/InternetLoginPage");
const internetUsers_1 = require("../../data/internetUsers");
const stringutils_1 = require("../../utils/stringutils");
class InternetLoginFlow {
    constructor(page) {
        this.page = page;
        this.InternetLoginPage = new InternetLoginPage_1.InternetLoginPage(page);
    }
    // login journeys:
    async loginWithValidCredentials() {
        await this.InternetLoginPage.navigateTo('/login');
        await this.InternetLoginPage.login(internetUsers_1.INTERNET_USERS.VALID.userName, internetUsers_1.INTERNET_USERS.VALID.passWord);
    }
    async loginWithInvalidCredentials(username, password) {
        await this.InternetLoginPage.navigateTo('/login');
        await this.InternetLoginPage.login(username, password);
    }
    async logout() {
        await this.InternetLoginPage.navigateTo('/logout');
    }
    // Assertion helpers
    async assertionLoginSuccess() {
        await (0, test_1.expect)(this.InternetLoginPage.flashMessage).toBeVisible();
        const message = this.InternetLoginPage.getFlashMEssage();
    }
    async assertionLoginError(expectedMessage) {
        await (0, test_1.expect)(this.InternetLoginPage.flashMessage).toBeVisible();
        const isError = await (this.InternetLoginPage.isFlashFailure());
        (0, test_1.expect)(isError).toBe(true);
        const message = this.InternetLoginPage.getFlashMEssage();
        (0, test_1.expect)(message).toContain(expectedMessage);
    }
    async assertLogoutSuccess() {
        await (0, test_1.expect)(this.InternetLoginPage.flashMessage).toBeVisible();
        const message = await this.InternetLoginPage.getFlashMEssage();
        //  expect(message).toContain('You logged out of the Secure Area');
        (0, test_1.expect)((0, stringutils_1.containsIgnoreCase)(message, 'You logged out of the secure area')).toBe(true);
    }
}
exports.InternetLoginFlow = InternetLoginFlow;
