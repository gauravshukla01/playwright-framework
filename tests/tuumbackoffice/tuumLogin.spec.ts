// tests/tuumbackoffice/tuumLogin.spec.ts
import { test } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { TUUM_USERS } from '../../data/tuumUsers';

test.describe('Tuum Backoffice — Authentication', () => {
  test('S01: Valid credentials navigate to homepage', async ({ tuumFlows }) => {
    await setTestInfo({
      description:
        'Verifies valid credentials redirect user to the authenticated homepage with main navigation visible',
      severity: 'critical',
      feature: Features.TUUM_AUTH,
      story: 'Valid credentials navigate to homepage',
      tags: [Tags.SMOKE, Tags.TUUM_LOGIN],
    });

    await step('Navigate to login page and enter valid credentials', async () => {
      await tuumFlows.auth.loginWith(TUUM_USERS.VALID);
    });

    await step('Assert homepage main navigation is visible', async () => {
      await tuumFlows.auth.assertMainNavVisible();
    });

    await step('Assert URL is /', async () => {
      await tuumFlows.auth.assertOnHomePage();
    });
  });

  test('S02: Invalid credentials display an error message', async ({ tuumFlows }) => {
    await setTestInfo({
      description:
        "Verifies invalid credentials show 'Invalid credentials. Trouble signing in?' and user remains on /login",
      severity: 'critical',
      feature: Features.TUUM_AUTH,
      story: 'Invalid credentials display an error message',
      tags: [Tags.NEGATIVE, Tags.TUUM_LOGIN],
    });

    await step('Navigate to login page and enter invalid credentials', async () => {
      await tuumFlows.auth.attemptLoginWithInvalidCredentials();
    });

    await step(
      "Assert error message 'Invalid credentials. Trouble signing in?' is displayed",
      async () => {
        await tuumFlows.auth.assertLoginError('Invalid credentials. Trouble signing in?');
      },
    );

    await step('Assert user remains on /login page', async () => {
      await tuumFlows.auth.assertRemainsOnLoginPage();
    });
  });
});
