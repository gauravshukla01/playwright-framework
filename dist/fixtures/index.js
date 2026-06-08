"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
// fixtures/index.ts
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const AuthFlow_1 = require("../flows/AuthFlow");
const CheckoutFlow_1 = require("../flows/CheckoutFlow");
const AuthApiFlow_1 = require("../flows/AuthApiFlow");
const LoginPage_1 = require("../pages/LoginPage");
const InventoryPage_1 = require("../pages/InventoryPage");
const CheckoutPage_1 = require("../pages/CheckoutPage");
const InternetLoginFlow_1 = require("../flows/internet/InternetLoginFlow");
const InternetCheckboxFlows_1 = require("../flows/internet/InternetCheckboxFlows");
// ─── Extended test with custom fixtures ───────────────────────
exports.test = test_1.test.extend({
    // ─── Page objects composite ─────────────────────────────
    uiPages: async ({ page }, use) => {
        await use({
            loginPage: new LoginPage_1.LoginPage(page),
            inventoryPage: new InventoryPage_1.InventoryPage(page),
            checkoutPage: new CheckoutPage_1.CheckoutPage(page),
        });
    },
    // ─── UI flows composite ──────────────────────────────────
    uiFlows: async ({ page }, use) => {
        await use({
            auth: new AuthFlow_1.AuthFlow(page),
            checkout: new CheckoutFlow_1.CheckoutFlow(page),
        });
    },
    // ─── API flows composite ─────────────────────────────────
    apiFlows: async ({ request }, use) => {
        await use({
            auth: new AuthApiFlow_1.AuthApiFlow(request),
        });
    },
    internetFlows: async ({ page }, use) => {
        await use({
            login: new InternetLoginFlow_1.InternetLoginFlow(page),
            checkbox: new InternetCheckboxFlows_1.InternetCheckboxFlows(page)
        });
    },
});
