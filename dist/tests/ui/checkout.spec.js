"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/ui/checkout.spec.ts
const fixtures_1 = require("../../fixtures");
const allureUtils_1 = require("../../utils/allureUtils");
const users_1 = require("../../data/users");
fixtures_1.test.describe('Checkout — happy path', () => {
    fixtures_1.test.beforeEach(async ({ uiFlows }) => {
        await uiFlows.auth.loginAsStandardUser();
    });
    (0, fixtures_1.test)('user can add single item to cart', async ({ uiFlows, uiPages }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies a single item can be added to cart from inventory',
            severity: 'critical',
            feature: allureUtils_1.Features.CART,
            story: 'Add single item to cart',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.CHECKOUT],
        });
        await (0, allureUtils_1.step)('Add Sauce Labs Backpack to cart', async () => {
            await uiFlows.checkout.addItemToCart('Sauce Labs Backpack');
        });
        await (0, allureUtils_1.step)('Assert cart count is 1', async () => {
            await uiFlows.checkout.assertCartCount(1);
            await (0, fixtures_1.expect)(uiPages.inventoryPage.shoppingCartBadge).toBeVisible();
        });
    });
    (0, fixtures_1.test)('user can add multiple items to cart', async ({ uiFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies multiple items can be added to cart',
            severity: 'critical',
            feature: allureUtils_1.Features.CART,
            story: 'Add multiple items to cart',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.CHECKOUT],
        });
        await (0, allureUtils_1.step)('Add two items to cart', async () => {
            await uiFlows.checkout.addMultipleItemsToCart([
                'Sauce Labs Backpack',
                'Sauce Labs Bike Light',
            ]);
        });
        await (0, allureUtils_1.step)('Assert cart count is 2', async () => {
            await uiFlows.checkout.assertCartCount(2);
        });
    });
    (0, fixtures_1.test)('user can complete full purchase', async ({ uiFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies end to end purchase flow completes successfully',
            severity: 'blocker',
            feature: allureUtils_1.Features.CHECKOUT,
            story: 'Complete purchase',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.CHECKOUT],
        });
        await (0, allureUtils_1.step)('Add item and complete purchase end to end', async () => {
            await uiFlows.checkout.completePurchaseForItem('Sauce Labs Backpack');
        });
        await (0, allureUtils_1.step)('Assert confirmation message is shown', async () => {
            await uiFlows.checkout.assertConfirmationMessage('Thank you for your order');
        });
    });
    (0, fixtures_1.test)('user can complete purchase with custom checkout details', async ({ uiFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies purchase completes with explicitly provided checkout details',
            severity: 'normal',
            feature: allureUtils_1.Features.CHECKOUT,
            story: 'Complete purchase with custom details',
            tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.CHECKOUT],
        });
        await (0, allureUtils_1.step)('Add item to cart', async () => {
            await uiFlows.checkout.addItemToCart('Sauce Labs Fleece Jacket');
        });
        await (0, allureUtils_1.step)('Proceed through checkout with valid details', async () => {
            await uiFlows.checkout.proceedToCheckout();
            await uiFlows.checkout.fillCheckoutDetails(users_1.CHECKOUT.VALID);
        });
        await (0, allureUtils_1.step)('Complete purchase and assert confirmation', async () => {
            await uiFlows.checkout.completePurchase();
            await uiFlows.checkout.assertConfirmationMessage('Thank you for your order');
        });
    });
});
fixtures_1.test.describe('Checkout — negative scenarios', () => {
    fixtures_1.test.beforeEach(async ({ uiFlows }) => {
        await uiFlows.auth.loginAsStandardUser();
        await uiFlows.checkout.addItemToCart('Sauce Labs Backpack');
        await uiFlows.checkout.proceedToCheckout();
    });
    const invalidCheckoutScenarios = [
        {
            description: 'missing first name shows error',
            data: users_1.CHECKOUT.MISSING_FIRSTNAME,
            errorText: 'First Name is required',
        },
        {
            description: 'missing post code shows error',
            data: users_1.CHECKOUT.MISSING_POSTCODE,
            errorText: 'Postal Code is required',
        },
    ];
    for (const scenario of invalidCheckoutScenarios) {
        (0, fixtures_1.test)(scenario.description, async ({ uiFlows }) => {
            await (0, allureUtils_1.setTestInfo)({
                description: `Verifies checkout fails — ${scenario.description}`,
                severity: 'normal',
                feature: allureUtils_1.Features.CHECKOUT,
                story: 'Invalid checkout details',
                tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.CHECKOUT, allureUtils_1.Tags.NEGATIVE],
            });
            await (0, allureUtils_1.step)('Fill invalid checkout details and continue', async () => {
                await uiFlows.checkout.fillCheckoutDetails(scenario.data);
            });
            await (0, allureUtils_1.step)('Assert checkout error is displayed', async () => {
                await uiFlows.checkout.assertCheckoutError(scenario.errorText);
            });
        });
    }
});
