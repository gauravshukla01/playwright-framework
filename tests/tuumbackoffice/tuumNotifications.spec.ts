// tests/tuumbackoffice/tuumNotifications.spec.ts
import { test, expect } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';

test.describe('Tuum Backoffice — Notifications', () => {
  test.beforeEach(async ({ tuumFlows }) => {
    await tuumFlows.auth.loginAsValidUser();
  });

  test.afterEach(async ({ page }) => {
    // Navigate back to homepage after each test
    // ensures clean state for next test
    await page.goto('/');
  });

  test('S03: Homepage displays correct welcome message', async ({ tuumFlows }) => {
    await setTestInfo({
      description: 'Verify welcome message displays correct authenticated user name on homepage',
      severity: 'normal',
      feature: Features.TUUM_AUTH,
      story: 'Homepage welcome message',
      tags: [Tags.SMOKE, Tags.TUUM_LOGIN],
    });

    await step('Assert welcome message is visible on homepage', async () => {
      await tuumFlows.notifications.assertWelcomeMessage();
    });
  });

  test('S04: Notifications panel shows Failed Notifications link', async ({ tuumFlows }) => {
    await setTestInfo({
      description:
        'Verify notifications panel expands and displays Failed Notifications navigation link',
      severity: 'normal',
      feature: Features.TUUM_NOTIFICATIONS,
      story: 'Notifications panel navigation',
      tags: [Tags.SMOKE, Tags.TUUM_NOTIFICATIONS],
    });

    await step('Click notifications trigger and assert panel expands', async () => {
      await tuumFlows.notifications.openNotificationsPanel();
    });

    await step('Assert Failed Notifications link is visible in notifications panel', async () => {
      await tuumFlows.notifications.assertFailedNotificationsLinkVisible();
    });
  });

  test('S05: Failed Notifications page shows correct data for ID-1008', async ({ tuumFlows }) => {
    await setTestInfo({
      description:
        'Verify Failed Notifications page loads and displays notification ID-1008 with channel EMAIL',
      severity: 'critical',
      feature: Features.TUUM_NOTIFICATIONS,
      story: 'Failed notifications data integrity',
      tags: [Tags.SMOKE, Tags.TUUM_NOTIFICATIONS],
    });

    await step('Navigate to Failed Notifications page', async () => {
      await tuumFlows.notifications.navigateToFailedNotifications();
    });

    await step('Assert Failed Notifications page loaded', async () => {
      await tuumFlows.notifications.assertFailedNotificationsPageLoaded();
    });

    await step('Assert notification record ID-1008 with channel EMAIL', async () => {
      await tuumFlows.notifications.assertNotificationRecord('ID-1008', 'EMAIL');
    });
  });

  test('S06: User can sign out successfully', async ({ tuumFlows, page }) => {
    await setTestInfo({
      description: 'Verify user can sign out and is redirected to login page',
      severity: 'critical',
      feature: Features.TUUM_AUTH,
      story: 'Sign out',
      tags: [Tags.SMOKE, Tags.TUUM_LOGIN],
    });

    await step('Click account settings and sign out', async () => {
      await tuumFlows.notifications.signOut();
    });

    await step('Assert user redirected to login page', async () => {
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
});
