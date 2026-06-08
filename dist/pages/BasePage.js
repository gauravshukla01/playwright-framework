"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePage = void 0;
// pages/BasePage.ts
const test_1 = require("@playwright/test");
class BasePage {
    constructor(page) {
        this.page = page;
    }
    // ─── Navigation ───────────────────────────────────────────
    async navigateTo(path = '/') {
        await this.page.goto(path);
    }
    async getTitle() {
        return this.page.title();
    }
    async getCurrentUrl() {
        return this.page.url();
    }
    // ─── Wait helpers ─────────────────────────────────────────
    async waitForPageLoad() {
        await this.page.waitForLoadState('domcontentloaded');
    }
    async waitForUrl(urlPattern) {
        await this.page.waitForURL(urlPattern);
    }
    async waitForVisible(locator) {
        await (0, test_1.expect)(locator).toBeVisible();
    }
    // ─── Common assertions ────────────────────────────────────
    async assertUrl(expectedUrl) {
        await (0, test_1.expect)(this.page).toHaveURL(expectedUrl);
    }
    async assertTitle(expectedTitle) {
        await (0, test_1.expect)(this.page).toHaveTitle(expectedTitle);
    }
    // ─── Utility ──────────────────────────────────────────────
    async takeScreenshot(name) {
        await this.page.screenshot({ path: `test-results/${name}.png` });
    }
}
exports.BasePage = BasePage;
