"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/ui/login.spec.ts
const fixtures_1 = require("../../fixtures");
const allureUtils_1 = require("../../utils/allureUtils");
const users_1 = require("../../data/users");
fixtures_1.test.describe('Login — happy path', () => {
    (0, fixtures_1.test)('standard user can log in successfully', async ({ uiFlows, uiPages }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies standard user can login and land on inventory page',
            severity: 'critical',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Standard user login',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.LOGIN],
        });
        await (0, allureUtils_1.step)('Login as standard user', async () => {
            await uiFlows.auth.loginAsStandardUser();
        });
        await (0, allureUtils_1.step)('Assert inventory page is visible', async () => {
            await uiPages.inventoryPage.assertUrl(/inventory/);
            await (0, fixtures_1.expect)(uiPages.inventoryPage.productList).toBeVisible();
        });
    });
    (0, fixtures_1.test)('standard user can log out', async ({ uiFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies standard user can log out successfully',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Logout',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.LOGIN],
        });
        await (0, allureUtils_1.step)('Login as standard user', async () => {
            await uiFlows.auth.loginAsStandardUser();
        });
        await (0, allureUtils_1.step)('Logout and verify login page is shown', async () => {
            await uiFlows.auth.logout();
        });
    });
});
fixtures_1.test.describe('Login — negative scenarios', () => {
    const invalidLoginScenarios = [
        {
            description: 'locked out user sees locked error',
            user: users_1.USERS.LOCKED,
            errorText: 'Sorry, this user has been locked out',
        },
        {
            description: 'invalid credentials show error message',
            user: users_1.USERS.INVALID,
            errorText: 'Username and password do not match',
        },
        {
            description: 'missing username shows error',
            user: { username: '', password: 'secret_sauce' },
            errorText: 'Username is required',
        },
        {
            description: 'missing password shows error',
            user: { username: 'standard_user', password: '' },
            errorText: 'Password is required',
        },
    ];
    for (const scenario of invalidLoginScenarios) {
        (0, fixtures_1.test)(scenario.description, async ({ uiFlows }) => {
            await (0, allureUtils_1.setTestInfo)({
                description: `Verifies login fails — ${scenario.description}`,
                severity: 'normal',
                feature: allureUtils_1.Features.AUTHENTICATION,
                story: 'Invalid login',
                tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.LOGIN, allureUtils_1.Tags.NEGATIVE],
            });
            await (0, allureUtils_1.step)('Attempt login with invalid credentials', async () => {
                await uiFlows.auth.loginWith(scenario.user);
            });
            await (0, allureUtils_1.step)('Assert error message is displayed', async () => {
                await uiFlows.auth.assertLoginError(scenario.errorText);
            });
        });
    }
});
fixtures_1.test.describe('Login — page level assertions', () => {
    (0, fixtures_1.test)('login page title is correct', async ({ uiPages }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies login page has correct browser title',
            severity: 'minor',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Login page load',
            tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.LOGIN],
        });
        await (0, allureUtils_1.step)('Navigate to login page', async () => {
            await uiPages.loginPage.navigateTo('/');
        });
        await (0, allureUtils_1.step)('Assert page title is Swag Labs', async () => {
            await uiPages.loginPage.assertTitle('Swag Labs');
        });
    });
    (0, fixtures_1.test)('login button is visible on load', async ({ uiPages }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies login button is visible when page loads',
            severity: 'minor',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Login page load',
            tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.LOGIN],
        });
        await (0, allureUtils_1.step)('Navigate to login page', async () => {
            await uiPages.loginPage.navigateTo('/');
        });
        await (0, allureUtils_1.step)('Assert login button is visible', async () => {
            await (0, fixtures_1.expect)(uiPages.loginPage.loginButton).toBeVisible();
        });
    });
    (0, fixtures_1.test)('error message can be dismissed', async ({ uiFlows, uiPages }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies error message can be closed after failed login',
            severity: 'minor',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Error handling',
            tags: [allureUtils_1.Tags.REGRESSION, allureUtils_1.Tags.LOGIN],
        });
        await (0, allureUtils_1.step)('Attempt login with invalid credentials', async () => {
            await uiFlows.auth.loginWithInvalidCredentials();
        });
        await (0, allureUtils_1.step)('Assert error message is visible', async () => {
            await (0, fixtures_1.expect)(uiPages.loginPage.errorMessage).toBeVisible();
        });
        await (0, allureUtils_1.step)('Dismiss error message', async () => {
            await uiPages.loginPage.closeErrorMessage();
        });
        await (0, allureUtils_1.step)('Assert error message is hidden', async () => {
            await (0, fixtures_1.expect)(uiPages.loginPage.errorMessage).toBeHidden();
        });
    });
});
