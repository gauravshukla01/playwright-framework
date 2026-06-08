"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Features = exports.Tags = void 0;
exports.setTestInfo = setTestInfo;
exports.step = step;
// utils/allureUtils.ts
const allure_playwright_1 = require("allure-playwright");
// ─── Test metadata helper ─────────────────────────────────────
/**
 * Sets Allure metadata for a test in one call.
 * Call at the top of every test before any actions.
 */
async function setTestInfo(options) {
    await allure_playwright_1.allure.description(options.description);
    await allure_playwright_1.allure.severity(options.severity);
    await allure_playwright_1.allure.feature(options.feature);
    await allure_playwright_1.allure.story(options.story);
    await allure_playwright_1.allure.owner(options.owner ?? 'SDET Team');
    for (const tag of options.tags) {
        await allure_playwright_1.allure.tag(tag);
    }
}
// ─── Step helper ──────────────────────────────────────────────
/**
 * Wraps a block of actions in a named Allure step.
 * Use at meaningful boundaries only — not for every single action.
 */
async function step(name, action) {
    await allure_playwright_1.allure.step(name, async () => {
        await action();
    });
}
// ─── Predefined tag sets ──────────────────────────────────────
// Keeps tag naming consistent across the team
exports.Tags = {
    SMOKE: 'smoke',
    REGRESSION: 'regression',
    NEGATIVE: 'negative',
    LOGIN: 'login',
    CHECKOUT: 'checkout',
    API: 'api',
};
// ─── Predefined feature names ─────────────────────────────────
exports.Features = {
    AUTHENTICATION: 'Authentication',
    CHECKOUT: 'Checkout',
    CART: 'Cart',
    API_AUTH: 'API Authentication',
};
