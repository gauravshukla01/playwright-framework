// fixtures/index.ts
import { test as base, expect } from '@playwright/test';
import { AuthFlow }     from '../flows/AuthFlow';
import { CheckoutFlow } from '../flows/CheckoutFlow';
import { AuthApiFlow }  from '../flows/AuthApiFlow';
import { LoginPage }    from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { InternetLoginFlow }    from '../flows/internet/InternetLoginFlow';
import { InternetCheckboxFlows } from '../flows/internet/InternetCheckboxFlows';
import { InternetDropdownFlows } from '../flows/internet/InternetDropdownFlows';

// ─── Fixture type definitions ─────────────────────────────────

type UiPages = {
  loginPage:     LoginPage;
  inventoryPage: InventoryPage;
  checkoutPage:  CheckoutPage;
};

type UiFlows = {
  auth:     AuthFlow;
  checkout: CheckoutFlow;
};

type ApiFlows = {
  auth: AuthApiFlow;
};

type InternetFlows = {
  login : InternetLoginFlow;
  checkbox : InternetCheckboxFlows;
  dropDownBox : InternetDropdownFlows;
};

type MyFixtures = {
  uiPages:  UiPages;
  uiFlows:  UiFlows;
  apiFlows: ApiFlows;
  internetFlows : InternetFlows;
};

// ─── Extended test with custom fixtures ───────────────────────

export const test = base.extend<MyFixtures>({

  // ─── Page objects composite ─────────────────────────────
  uiPages: async ({ page }, use) => {
    await use({
      loginPage:     new LoginPage(page),
      inventoryPage: new InventoryPage(page),
      checkoutPage:  new CheckoutPage(page),
    });
  },

  // ─── UI flows composite ──────────────────────────────────
  uiFlows: async ({ page }, use) => {
    await use({
      auth:     new AuthFlow(page),
      checkout: new CheckoutFlow(page),
    });
  },

  // ─── API flows composite ─────────────────────────────────
  apiFlows: async ({ request }, use) => {
    await use({
      auth: new AuthApiFlow(request),
    });
  },

  internetFlows: async ({page}, use) =>{
    await use({
      login : new InternetLoginFlow(page),
      checkbox : new InternetCheckboxFlows(page),
      dropDownBox : new InternetDropdownFlows(page)
    });
  },

});

// ─── Re-export expect so tests only import from fixtures ──────
export { expect };