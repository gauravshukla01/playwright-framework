// tests/ui/checkout.spec.ts
import { test, expect }                      from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { CHECKOUT }                          from '../../data/users';

test.describe('Checkout — happy path', () => {

  test.beforeEach(async ({ uiFlows }) => {
    await uiFlows.auth.loginAsStandardUser();
  });

  test('user can add single item to cart', async ({ uiFlows, uiPages }) => {
    await setTestInfo({
      description: 'Verifies a single item can be added to cart from inventory',
      severity:    'critical',
      feature:     Features.CART,
      story:       'Add single item to cart',
      tags:        [Tags.SMOKE, Tags.CHECKOUT],
    });

    await step('Add Sauce Labs Backpack to cart', async () => {
      await uiFlows.checkout.addItemToCart('Sauce Labs Backpack');
    });

    await step('Assert cart count is 1', async () => {
      await uiFlows.checkout.assertCartCount(1);
      await expect(uiPages.inventoryPage.shoppingCartBadge).toBeVisible();
    });
  });

  test('user can add multiple items to cart', async ({ uiFlows }) => {
    await setTestInfo({
      description: 'Verifies multiple items can be added to cart',
      severity:    'critical',
      feature:     Features.CART,
      story:       'Add multiple items to cart',
      tags:        [Tags.SMOKE, Tags.CHECKOUT],
    });

    await step('Add two items to cart', async () => {
      await uiFlows.checkout.addMultipleItemsToCart([
        'Sauce Labs Backpack',
        'Sauce Labs Bike Light',
      ]);
    });

    await step('Assert cart count is 2', async () => {
      await uiFlows.checkout.assertCartCount(2);
    });
  });

  test('user can complete full purchase', async ({ uiFlows }) => {
    await setTestInfo({
      description: 'Verifies end to end purchase flow completes successfully',
      severity:    'blocker',
      feature:     Features.CHECKOUT,
      story:       'Complete purchase',
      tags:        [Tags.SMOKE, Tags.CHECKOUT],
    });

    await step('Add item and complete purchase end to end', async () => {
      await uiFlows.checkout.completePurchaseForItem('Sauce Labs Backpack');
    });

    await step('Assert confirmation message is shown', async () => {
      await uiFlows.checkout.assertConfirmationMessage('Thank you for your order');
    });
  });

  test('user can complete purchase with custom checkout details', async ({ uiFlows }) => {
    await setTestInfo({
      description: 'Verifies purchase completes with explicitly provided checkout details',
      severity:    'normal',
      feature:     Features.CHECKOUT,
      story:       'Complete purchase with custom details',
      tags:        [Tags.REGRESSION, Tags.CHECKOUT],
    });

    await step('Add item to cart', async () => {
      await uiFlows.checkout.addItemToCart('Sauce Labs Fleece Jacket');
    });

    await step('Proceed through checkout with valid details', async () => {
      await uiFlows.checkout.proceedToCheckout();
      await uiFlows.checkout.fillCheckoutDetails(CHECKOUT.VALID);
    });

    await step('Complete purchase and assert confirmation', async () => {
      await uiFlows.checkout.completePurchase();
      await uiFlows.checkout.assertConfirmationMessage('Thank you for your order');
    });
  });

});

test.describe('Checkout — negative scenarios', () => {

  test.beforeEach(async ({ uiFlows }) => {
    await uiFlows.auth.loginAsStandardUser();
    await uiFlows.checkout.addItemToCart('Sauce Labs Backpack');
    await uiFlows.checkout.proceedToCheckout();
  });

  const invalidCheckoutScenarios = [
    {
      description: 'missing first name shows error',
      data:        CHECKOUT.MISSING_FIRSTNAME,
      errorText:   'First Name is required',
    },
    {
      description: 'missing post code shows error',
      data:        CHECKOUT.MISSING_POSTCODE,
      errorText:   'Postal Code is required',
    },
  ];

  for (const scenario of invalidCheckoutScenarios) {
    test(scenario.description, async ({ uiFlows }) => {
      await setTestInfo({
        description: `Verifies checkout fails — ${scenario.description}`,
        severity:    'normal',
        feature:     Features.CHECKOUT,
        story:       'Invalid checkout details',
        tags:        [Tags.REGRESSION, Tags.CHECKOUT, Tags.NEGATIVE],
      });

      await step('Fill invalid checkout details and continue', async () => {
        await uiFlows.checkout.fillCheckoutDetails(scenario.data);
      });

      await step('Assert checkout error is displayed', async () => {
        await uiFlows.checkout.assertCheckoutError(scenario.errorText);
      });
    });
  }

});