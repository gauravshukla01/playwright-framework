// tests/ui/login.spec.ts
import { test, expect }               from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { USERS }                       from '../../data/users';

test.describe('Login — happy path', () => {

  test('standard user can log in successfully', async ({ uiFlows, uiPages }) => {
    await setTestInfo({
      description: 'Verifies standard user can login and land on inventory page',
      severity:    'critical',
      feature:     Features.AUTHENTICATION,
      story:       'Standard user login',
      tags:        [Tags.SMOKE, Tags.LOGIN],
    });

    await step('Login as standard user', async () => {
      await uiFlows.auth.loginAsStandardUser();
    });

    await step('Assert inventory page is visible', async () => {
      await uiPages.inventoryPage.assertUrl(/inventory/);
      await expect(uiPages.inventoryPage.productList).toBeVisible();
    });
  });

  test('standard user can log out', async ({ uiFlows }) => {
    await setTestInfo({
      description: 'Verifies standard user can log out successfully',
      severity:    'normal',
      feature:     Features.AUTHENTICATION,
      story:       'Logout',
      tags:        [Tags.SMOKE, Tags.LOGIN],
    });

    await step('Login as standard user', async () => {
      await uiFlows.auth.loginAsStandardUser();
    });

    await step('Logout and verify login page is shown', async () => {
      await uiFlows.auth.logout();
    });
  });

});

test.describe('Login — negative scenarios', () => {

  const invalidLoginScenarios = [
    {
      description: 'locked out user sees locked error',
      user:        USERS.LOCKED,
      errorText:   'Sorry, this user has been locked out',
    },
    {
      description: 'invalid credentials show error message',
      user:        USERS.INVALID,
      errorText:   'Username and password do not match',
    },
    {
      description: 'missing username shows error',
      user:        { username: '', password: 'secret_sauce' },
      errorText:   'Username is required',
    },
    {
      description: 'missing password shows error',
      user:        { username: 'standard_user', password: '' },
      errorText:   'Password is required',
    },
  ];

  for (const scenario of invalidLoginScenarios) {
    test(scenario.description, async ({ uiFlows }) => {
      await setTestInfo({
        description: `Verifies login fails — ${scenario.description}`,
        severity:    'normal',
        feature:     Features.AUTHENTICATION,
        story:       'Invalid login',
        tags:        [Tags.REGRESSION, Tags.LOGIN, Tags.NEGATIVE],
      });

      await step('Attempt login with invalid credentials', async () => {
        await uiFlows.auth.loginWith(scenario.user);
      });

      await step('Assert error message is displayed', async () => {
        await uiFlows.auth.assertLoginError(scenario.errorText);
      });
    });
  }

});

test.describe('Login — page level assertions', () => {

  test('login page title is correct', async ({ uiPages }) => {
    await setTestInfo({
      description: 'Verifies login page has correct browser title',
      severity:    'minor',
      feature:     Features.AUTHENTICATION,
      story:       'Login page load',
      tags:        [Tags.REGRESSION, Tags.LOGIN],
    });

    await step('Navigate to login page', async () => {
      await uiPages.loginPage.navigateTo('/');
    });

    await step('Assert page title is Swag Labs', async () => {
      await uiPages.loginPage.assertTitle('Swag Labs');
    });
  });

  test('login button is visible on load', async ({ uiPages }) => {
    await setTestInfo({
      description: 'Verifies login button is visible when page loads',
      severity:    'minor',
      feature:     Features.AUTHENTICATION,
      story:       'Login page load',
      tags:        [Tags.REGRESSION, Tags.LOGIN],
    });

    await step('Navigate to login page', async () => {
      await uiPages.loginPage.navigateTo('/');
    });

    await step('Assert login button is visible', async () => {
      await expect(uiPages.loginPage.loginButton).toBeVisible();
    });
  });

  test('error message can be dismissed', async ({ uiFlows, uiPages }) => {
    await setTestInfo({
      description: 'Verifies error message can be closed after failed login',
      severity:    'minor',
      feature:     Features.AUTHENTICATION,
      story:       'Error handling',
      tags:        [Tags.REGRESSION, Tags.LOGIN],
    });

    await step('Attempt login with invalid credentials', async () => {
      await uiFlows.auth.loginWithInvalidCredentials();
    });

    await step('Assert error message is visible', async () => {
      await expect(uiPages.loginPage.errorMessage).toBeVisible();
    });

    await step('Dismiss error message', async () => {
      await uiPages.loginPage.closeErrorMessage();
    });

    await step('Assert error message is hidden', async () => {
      await expect(uiPages.loginPage.errorMessage).toBeHidden();
    });
  });

});