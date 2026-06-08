"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/api/auth.api.spec.ts
const fixtures_1 = require("../../fixtures");
const users_1 = require("../../data/users");
fixtures_1.test.describe('Auth API — login endpoint', () => {
    (0, fixtures_1.test)('valid credentials return 200 and token', async ({ apiFlows }) => {
        // Pattern A — flow uses API_USERS.VALID internally
        const response = await apiFlows.auth.loginWithValidCredentials();
        await apiFlows.auth.assertLoginSuccess(response);
    });
    (0, fixtures_1.test)('invalid credentials return 400 and error message', async ({ apiFlows }) => {
        // Pattern A — flow uses API_USERS.INVALID internally
        const response = await apiFlows.auth.loginWithInvalidCredentials();
        await apiFlows.auth.assertLoginFailure(response, 'user not found');
    });
    // Pattern C — same test logic across multiple credential combinations
    const loginScenarios = [
        {
            description: 'valid credentials return 200',
            credentials: users_1.API_USERS.VALID,
            expectedStatus: 200,
        },
        {
            description: 'invalid credentials return 400',
            credentials: users_1.API_USERS.INVALID,
            expectedStatus: 400,
        },
    ];
    for (const scenario of loginScenarios) {
        (0, fixtures_1.test)(`login scenario — ${scenario.description}`, async ({ apiFlows }) => {
            // Pattern B — test controls which credentials are passed
            const response = await apiFlows.auth.loginWith(scenario.credentials);
            (0, fixtures_1.expect)(response.status).toBe(scenario.expectedStatus);
        });
    }
});
fixtures_1.test.describe('Auth API — user endpoints', () => {
    (0, fixtures_1.test)('get users returns paginated list', async ({ apiFlows }) => {
        const response = await apiFlows.auth.getUsers(1);
        (0, fixtures_1.expect)(response.status).toBe(200);
        (0, fixtures_1.expect)(response.data.data.length).toBeGreaterThan(0);
        (0, fixtures_1.expect)(response.data.page).toBe(1);
        (0, fixtures_1.expect)(response.data.total).toBeGreaterThan(0);
    });
    (0, fixtures_1.test)('get users page 2 returns different results', async ({ apiFlows }) => {
        const page1 = await apiFlows.auth.getUsers(1);
        const page2 = await apiFlows.auth.getUsers(2);
        (0, fixtures_1.expect)(page1.status).toBe(200);
        (0, fixtures_1.expect)(page2.status).toBe(200);
        // Pages should have different user IDs
        const page1Ids = page1.data.data.map((u) => u.id);
        const page2Ids = page2.data.data.map((u) => u.id);
        const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
        (0, fixtures_1.expect)(hasOverlap).toBe(false);
    });
    (0, fixtures_1.test)('get user by valid id returns correct user', async ({ apiFlows }) => {
        await apiFlows.auth.assertUserShape(1);
    });
    (0, fixtures_1.test)('get user by invalid id returns 404', async ({ apiFlows }) => {
        const response = await apiFlows.auth.getUserById(999);
        (0, fixtures_1.expect)(response.status).toBe(404);
    });
    // Pattern C — validate multiple user IDs
    const validUserIds = [1, 2, 3];
    for (const userId of validUserIds) {
        (0, fixtures_1.test)(`user id ${userId} returns valid shape`, async ({ apiFlows }) => {
            await apiFlows.auth.assertUserShape(userId);
        });
    }
});
fixtures_1.test.describe('Auth API — register endpoint', () => {
    (0, fixtures_1.test)('valid registration returns id and token', async ({ apiFlows }) => {
        const response = await apiFlows.auth.registerUser(users_1.API_USERS.VALID);
        (0, fixtures_1.expect)(response.status).toBe(200);
        (0, fixtures_1.expect)(response.data.id).toBeDefined();
        (0, fixtures_1.expect)(response.data.token).toBeDefined();
    });
    (0, fixtures_1.test)('registration response has correct shape', async ({ apiFlows }) => {
        const response = await apiFlows.auth.registerUser(users_1.API_USERS.VALID);
        (0, fixtures_1.expect)(typeof response.data.id).toBe('number');
        (0, fixtures_1.expect)(typeof response.data.token).toBe('string');
        (0, fixtures_1.expect)(response.data.token.length).toBeGreaterThan(0);
    });
});
