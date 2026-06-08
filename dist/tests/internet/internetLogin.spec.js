"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/internet/internetLogin.spec.ts
const fixtures_1 = require("../../fixtures");
const allureUtils_1 = require("../../utils/allureUtils");
fixtures_1.test.describe('The internet : Login happy path', () => {
    (0, fixtures_1.test)('Valid credentials login success', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies admin user can login with valid credentials',
            severity: 'critical',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Valid login',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.LOGIN],
        }); // end set test info
        await (0, allureUtils_1.step)('Navigate and login with valid credentials', async () => {
            await internetFlows.login.loginWithValidCredentials();
        }); // end of step 1
        await (0, allureUtils_1.step)('Assert login with success message', async () => {
            await internetFlows.login.assertionLoginSuccess();
        }); // end of step 2
    }); // end of test method 1
    (0, fixtures_1.test)(' user can logout successfully', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies logged in user can logout successfully',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Logout',
            tags: [allureUtils_1.Tags.SMOKE, allureUtils_1.Tags.LOGIN],
        }); // end of setTestInfo
        await (0, allureUtils_1.step)('login with valid credentials ', async () => {
            await internetFlows.login.loginWithValidCredentials();
        }); // end of step 1
        await (0, allureUtils_1.step)('logout and assert logout message', async () => {
            await internetFlows.login.logout();
            await internetFlows.login.assertLogoutSuccess();
        });
    }); // end of test method 2
}); // end of test describe
