// tests/api/auth.api.spec.ts
import { test, expect } from '../../fixtures';
import { API_USERS } from '../../data/users';

test.describe('Auth API — login endpoint', () => {

  test('valid credentials return 200 and token', async ({ apiFlows }) => {
    // Pattern A — flow uses API_USERS.VALID internally
    const response = await apiFlows.auth.loginWithValidCredentials();
    await apiFlows.auth.assertLoginSuccess(response);
  });

  test('invalid credentials return 400 and error message', async ({ apiFlows }) => {
    // Pattern A — flow uses API_USERS.INVALID internally
    const response = await apiFlows.auth.loginWithInvalidCredentials();
    await apiFlows.auth.assertLoginFailure(response, 'user not found');
  });

  // Pattern C — same test logic across multiple credential combinations
 const loginScenarios = [
    {
      description:    'valid credentials return 200',
      credentials:    API_USERS.VALID,
      expectedStatus: 200,
    },
    {
      description:    'invalid credentials return 400',
      credentials:    API_USERS.INVALID,
      expectedStatus: 400,
    },
  ];

  for (const scenario of loginScenarios) {
    test(`login scenario — ${scenario.description}`, async ({ apiFlows }) => {
      // Pattern B — test controls which credentials are passed
      const response = await apiFlows.auth.loginWith(scenario.credentials);
      expect(response.status).toBe(scenario.expectedStatus);

     
    });
  }

});

test.describe('Auth API — user endpoints', () => {

  test('get users returns paginated list', async ({ apiFlows }) => {
    const response = await apiFlows.auth.getUsers(1);
    expect(response.status).toBe(200);
    expect(response.data.data.length).toBeGreaterThan(0);
    expect(response.data.page).toBe(1);
    expect(response.data.total).toBeGreaterThan(0);
  });

  test('get users page 2 returns different results', async ({ apiFlows }) => {
    const page1 = await apiFlows.auth.getUsers(1);
    const page2 = await apiFlows.auth.getUsers(2);

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    // Pages should have different user IDs
    const page1Ids = page1.data.data.map((u) => u.id);
    const page2Ids = page2.data.data.map((u) => u.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    expect(hasOverlap).toBe(false);
  });

  test('get user by valid id returns correct user', async ({ apiFlows }) => {
    await apiFlows.auth.assertUserShape(1);
  });

  test('get user by invalid id returns 404', async ({ apiFlows }) => {
    const response = await apiFlows.auth.getUserById(999);
    expect(response.status).toBe(404);
  });

  // Pattern C — validate multiple user IDs
  const validUserIds = [1, 2, 3];

  for (const userId of validUserIds) {
    test(`user id ${userId} returns valid shape`, async ({ apiFlows }) => {
      await apiFlows.auth.assertUserShape(userId);
    });
  }

});

test.describe('Auth API — register endpoint', () => {

  test('valid registration returns id and token', async ({ apiFlows }) => {
    const response = await apiFlows.auth.registerUser(API_USERS.VALID);
    expect(response.status).toBe(200);
    expect(response.data.id).toBeDefined();
    expect(response.data.token).toBeDefined();
  });

  test('registration response has correct shape', async ({ apiFlows }) => {
    const response = await apiFlows.auth.registerUser(API_USERS.VALID);
    expect(typeof response.data.id).toBe('number');
    expect(typeof response.data.token).toBe('string');
    expect(response.data.token.length).toBeGreaterThan(0);
  });

});