"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const BasePage_1 = require("./BasePage");
class LoginPage extends BasePage_1.BasePage {
    constructor(page) {
        super(page);
        this.usernameInput = page.locator('[data-test="username"]');
        this.passwordInput = page.locator('[data-test="password"]');
        this.loginButton = page.locator('[data-test="login-button"]');
        this.errorMessage = page.locator('[data-test="error"]');
        this.errorCloseButton = page.locator('.error-button');
    }
    // ─── Actions ──────────────────────────────────────────────
    async fillUsername(username) {
        await this.usernameInput.fill(username);
    }
    async fillPassword(password) {
        await this.passwordInput.fill(password);
    }
    async clickLoginButton() {
        await this.loginButton.click();
    }
    async getErrorMessage() {
        return await this.errorMessage.innerText();
    }
    async closeErrorMessage() {
        await this.errorCloseButton.click();
    }
    async isErrorVisible() {
        return await this.errorMessage.isVisible();
    }
}
exports.LoginPage = LoginPage;
