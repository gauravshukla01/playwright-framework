# Framework Patterns Document

> Reference for a code-generator agent. All snippets are taken from the real source files.

---

## 1. Folder Structure

```
playwright-framework/
├── playwright.config.ts        # Central config — APP env var → baseURL
├── .env.example                # Template for .env secrets
├── fixtures/
│   └── index.ts                # Custom test fixtures (re-exports test + expect)
├── pages/
│   ├── BasePage.ts             # Abstract base — navigation, wait, assertion helpers
│   ├── LoginPage.ts            # Concrete page object
│   ├── InventoryPage.ts
│   ├── CheckoutPage.ts
│   └── internet/               # Grouped by app domain
│       ├── InternetLoginPage.ts
│       ├── InternetCheckboxPage.ts
│       └── ...
├── flows/
│   ├── AuthFlow.ts             # Multi-step UI journeys (compose Page Objects)
│   ├── CheckoutFlow.ts
│   ├── AuthApiFlow.ts          # API-level flows
│   └── internet/
│       ├── InternetLoginFlow.ts
│       ├── InternetCheckboxFlows.ts
│       └── ...
├── api/
│   ├── BaseApiClient.ts        # Abstract HTTP client (GET/POST/PUT/DELETE)
│   └── AuthApiClient.ts        # Concrete API client
├── tests/
│   ├── ui/
│   │   ├── login.spec.ts
│   │   └── checkout.spec.ts
│   ├── internet/
│   │   ├── internetcheckboxes.spec.ts
│   │   └── ...
│   └── api/
│       └── auth.api.spec.ts
├── data/
│   ├── users.ts                # UI test data (USERS, CHECKOUT, API_USERS)
│   └── internetUsers.ts        # Internet app users
├── types/
│   └── index.ts                # Shared interfaces + enums
└── utils/
    ├── envUtils.ts             # getRequiredEnv / getOptionalEnv / getENV()
    ├── allureUtils.ts          # setTestInfo / step / Tags / Features
    └── stringutils.ts
```

---

## 2. Page Object Pattern

### BasePage (abstract)

Every Page Object extends `BasePage`. It receives `Page` via constructor and exposes shared navigation, wait, and assertion helpers.

```typescript
// pages/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async assertUrl(expectedUrl: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrl);
  }
}
```

### Concrete Page Object

- **Locators** declared as `readonly` class fields, initialised in the constructor
- **Actions** are async methods — one action per method, named from the user's perspective
- Locators use `data-test` attributes first, then CSS/role selectors

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {

  // ─── Locators ─────────────────────────────────────────────
  readonly usernameInput:    Locator;
  readonly passwordInput:    Locator;
  readonly loginButton:      Locator;
  readonly errorMessage:     Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput    = page.locator('[data-test="username"]');
    this.passwordInput    = page.locator('[data-test="password"]');
    this.loginButton      = page.locator('[data-test="login-button"]');
    this.errorMessage     = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('.error-button');
  }

  // ─── Actions ──────────────────────────────────────────────

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async clickLoginButton(): Promise<void> {
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.innerText();
  }
}
```

---

## 3. Flow Pattern

Flows sit above Page Objects. They compose multiple Page Object calls into named user journeys. They **do not** contain locators — they orchestrate pages.

```typescript
// flows/AuthFlow.ts
import { Page, expect } from '@playwright/test';
import { LoginPage }    from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { USERS }        from '../data/users';
import { UserCredentials } from '../types';

export class AuthFlow {
  private readonly loginPage:     LoginPage;
  private readonly inventoryPage: InventoryPage;

  constructor(private readonly page: Page) {
    this.loginPage     = new LoginPage(page);
    this.inventoryPage = new InventoryPage(page);
  }

  async loginWith(credentials: UserCredentials): Promise<void> {
    await this.loginPage.navigateTo('/');
    await this.loginPage.fillUsername(credentials.username);
    await this.loginPage.fillPassword(credentials.password);
    await this.loginPage.clickLoginButton();
  }

  async loginAsStandardUser(): Promise<void> {
    await this.loginWith(USERS.STANDARD);
    await expect(this.inventoryPage.productList).toBeVisible();
  }

  async assertLoginError(expectedText: string): Promise<void> {
    const errorMessage = await this.loginPage.getErrorMessage();
    expect(errorMessage).toContain(expectedText);
  }
}
```

---

## 4. Test Spec Structure

### Imports — always from `../../fixtures`, never directly from `@playwright/test`

```typescript
import { test, expect }                      from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { CHECKOUT }                          from '../../data/users';
```

### Spec anatomy

```typescript
test.describe('Feature — scenario group', () => {

  test.beforeEach(async ({ uiFlows }) => {
    await uiFlows.auth.loginAsStandardUser();   // shared precondition
  });

  test('short plain-English description', async ({ uiFlows, uiPages }) => {

    // 1. Allure metadata — always first
    await setTestInfo({
      description: 'What this test verifies',
      severity:    'critical',              // blocker | critical | normal | minor | trivial
      feature:     Features.CHECKOUT,
      story:       'Story name',
      tags:        [Tags.SMOKE, Tags.CHECKOUT],
    });

    // 2. Steps — wrap meaningful action blocks
    await step('Human-readable step name', async () => {
      await uiFlows.checkout.addItemToCart('Sauce Labs Backpack');
    });

    await step('Assert something', async () => {
      await uiFlows.checkout.assertCartCount(1);
      await expect(uiPages.inventoryPage.shoppingCartBadge).toBeVisible();
    });
  });

});
```

### Parameterised tests (data-driven)

```typescript
const scenarios = [
  { description: 'missing first name shows error', data: CHECKOUT.MISSING_FIRSTNAME, errorText: 'First Name is required' },
  { description: 'missing post code shows error',  data: CHECKOUT.MISSING_POSTCODE,  errorText: 'Postal Code is required' },
];

for (const scenario of scenarios) {
  test(scenario.description, async ({ uiFlows }) => {
    await uiFlows.checkout.fillCheckoutDetails(scenario.data);
    await uiFlows.checkout.assertCheckoutError(scenario.errorText);
  });
}
```

---

## 5. Fixtures

Fixtures extend Playwright's `test` with three composite objects: `uiPages`, `uiFlows`, `apiFlows`, and `internetFlows`. Tests destructure only what they need.

```typescript
// fixtures/index.ts
export const test = base.extend<MyFixtures>({

  uiPages: async ({ page }, use) => {
    await use({
      loginPage:     new LoginPage(page),
      inventoryPage: new InventoryPage(page),
      checkoutPage:  new CheckoutPage(page),
    });
  },

  uiFlows: async ({ page }, use) => {
    await use({
      auth:     new AuthFlow(page),
      checkout: new CheckoutFlow(page),
    });
  },

  apiFlows: async ({ request }, use) => {
    await use({
      auth: new AuthApiFlow(request),
    });
  },

  internetFlows: async ({ page, context }, use) => {
    await use({
      login:               new InternetLoginFlow(page),
      checkbox:            new InternetCheckboxFlows(page),
      dropDownBox:         new InternetDropdownFlows(page),
      JSAlert:             new InternetJSAlertsFlows(page),
      newWindowPage:       new InternetWindowsPageFlows(page, context),
      fileUploadPage:      new InternetFileUploadPageFlows(page),
      networkInterception: new InternetNetworkInterceptionFlow(page),
    });
  },
});

export { expect };
```

---

## 6. playwright.config.ts — APP Environment Variable

### How it works

The config reads `APP` at startup and maps it to a `baseURL`. If `APP` is missing or unknown, it throws immediately with a helpful message.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();   // loads .env file

const getBaseURL = (): string => {
  const app = process.env['APP'];

  if (!app) {
    throw new Error(
      `APP environment variable is not set.\n` +
      `Set it in your .env file or pass it in the command line.\n` +
      `Valid options are: saucedemo, internet`
    );
  }

  const urlMap: Record<string, string> = {
    saucedemo: process.env['BASE_URL_SAUCEDEMO'] ?? 'https://www.saucedemo.com',
    internet:  process.env['BASE_URL_INTERNET']  ?? 'https://the-internet.herokuapp.com',
  };

  if (!urlMap[app]) {
    throw new Error(`Unknown APP value: "${app}". Valid options are: ${Object.keys(urlMap).join(', ')}`);
  }

  return urlMap[app];
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['allure-playwright']],
  use: {
    baseURL: getBaseURL(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome']  } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari']  } },
  ],
});
```

### APP variable details

| Item | Detail |
|------|--------|
| Read in | `playwright.config.ts` → `getBaseURL()` |
| Valid values | `saucedemo`, `internet` |
| Derived baseURL | `BASE_URL_SAUCEDEMO` env var (default `https://www.saucedemo.com`) or `BASE_URL_INTERNET` (default `https://the-internet.herokuapp.com`) |
| How to set | In `.env` file **or** CLI: `APP=saucedemo npx playwright test` |
| Missing APP | Throws with a message listing valid options |
| Unknown APP | Throws listing valid keys from `urlMap` |

### .env file format

```bash
# .env  (copy from .env.example — never commit this file)
APP=saucedemo

BASE_URL_SAUCEDEMO=https://www.saucedemo.com
BASE_URL_INTERNET=https://the-internet.herokuapp.com

REQRES_API_KEY=your_api_key_here
REQRES_BASE_URL=https://reqres.in

REQRES_VALID_EMAIL=eve.holt@reqres.in
REQRES_VALID_PASSWORD=cityslicka
```

---

## 7. Adding a New Application — Tuum Backoffice

To add `tuumbackoffice` pointing at `https://backoffice.cab-dev.tuumplatform.com`:

### Step 1 — `playwright.config.ts`

Add the key to `urlMap` and update the error message:

```typescript
const urlMap: Record<string, string> = {
  saucedemo:      process.env['BASE_URL_SAUCEDEMO']      ?? 'https://www.saucedemo.com',
  internet:       process.env['BASE_URL_INTERNET']       ?? 'https://the-internet.herokuapp.com',
  tuumbackoffice: process.env['BASE_URL_TUUMBACKOFFICE'] ?? 'https://backoffice.cab-dev.tuumplatform.com',
};
```

Also update the error hint string:
```typescript
`Valid options are: saucedemo, internet, tuumbackoffice`
```

### Step 2 — `.env.example`

```bash
BASE_URL_TUUMBACKOFFICE=https://backoffice.cab-dev.tuumplatform.com
APP=tuumbackoffice
```

### Step 3 — `utils/envUtils.ts` — `getENV()`

```typescript
export function getENV() {
  return {
    // ... existing keys
    BASE_URL_TUUMBACKOFFICE: getOptionalEnv('BASE_URL_TUUMBACKOFFICE', 'https://backoffice.cab-dev.tuumplatform.com'),
  };
}
```

### Step 4 — Create page objects

```
pages/tuumbackoffice/
├── TuumBasePage.ts        (extend BasePage if needed, or use BasePage directly)
├── TuumLoginPage.ts
└── TuumDashboardPage.ts
```

### Step 5 — Create flows

```
flows/tuumbackoffice/
├── TuumAuthFlow.ts
└── TuumSomeFeatureFlow.ts
```

### Step 6 — Register in `fixtures/index.ts`

```typescript
type TuumFlows = {
  auth: TuumAuthFlow;
};

type MyFixtures = {
  uiPages:    UiPages;
  uiFlows:    UiFlows;
  apiFlows:   ApiFlows;
  internetFlows: InternetFlows;
  tuumFlows:  TuumFlows;        // ← add this
};

// inside base.extend:
tuumFlows: async ({ page }, use) => {
  await use({
    auth: new TuumAuthFlow(page),
  });
},
```

### Step 7 — Create tests

```
tests/tuumbackoffice/
└── tuumLogin.spec.ts
```

---

## 8. Shared Utilities

### `utils/envUtils.ts`

```typescript
getRequiredEnv('KEY')          // throws if missing
getOptionalEnv('KEY', 'default') // returns default if missing
getENV()                       // returns typed config object — call lazily, not at import time
```

### `utils/allureUtils.ts`

```typescript
await setTestInfo({ description, severity, feature, story, tags });  // call first in every test
await step('Step label', async () => { /* actions */ });              // wraps actions in Allure step

Tags.SMOKE | Tags.REGRESSION | Tags.NEGATIVE | Tags.LOGIN | Tags.CHECKOUT | Tags.API
Features.AUTHENTICATION | Features.CHECKOUT | Features.CART | Features.API_AUTH
```

---

## 9. API Client Pattern

```typescript
// api/BaseApiClient.ts  (abstract)
export abstract class BaseApiClient {
  protected readonly baseUrl: string;
  protected readonly request: APIRequestContext;

  constructor(request: APIRequestContext, baseUrl = getENV().REQRES_BASE_URL) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  protected async get(endpoint: string, headers?: Record<string, string>): Promise<APIResponse> { ... }
  protected async post(endpoint: string, body: Record<string, unknown>): Promise<APIResponse> { ... }
  // also: put, delete, parseResponse<T>, isSuccess
}

// api/AuthApiClient.ts  (concrete — extends BaseApiClient)
// flows/AuthApiFlow.ts  (orchestrates AuthApiClient + adds assertions)
```

---

## 10. Import Patterns

| What you need | Import from |
|---------------|-------------|
| `test`, `expect` | `../../fixtures` |
| `setTestInfo`, `step`, `Tags`, `Features` | `../../utils/allureUtils` |
| Test data | `../../data/users` |
| Shared types | `../../types` |
| Env helpers | `../../utils/envUtils` |
| Page objects (inside flows only) | `../pages/LoginPage` |

**Never** import directly from `@playwright/test` in spec files — always use the extended `test` from `fixtures/index.ts`.
---

## 11. Tuum Backoffice — Application-Specific Patterns

> Added after POC completion. These patterns extend the base
> framework for the Tuum Backoffice application specifically.
> All files live under the `tuumbackoffice/` subfolder.

---

### 11.1 Folder Structure — Tuum Backoffice
pages/tuumbackoffice/
├── TuumLoginPage.ts
├── TuumHomePage.ts
└── TuumFailedNotificationsPage.ts
flows/tuumbackoffice/
├── TuumAuthFlow.ts
└── TuumNotificationFlow.ts
tests/tuumbackoffice/
├── tuumLogin.spec.ts
└── tuumNotifications.spec.ts
data/
└── tuumUsers.ts
---

### 11.2 Test Data — `data/tuumUsers.ts`

Hardcoded for POC. Future evolution: move credentials
to `.env` via `getENV()` pattern.

```typescript
export const TUUM_USERS = {
  VALID: {
    username: 'Gaurav',
    password: 'newpassword@#23D'
  },
  INVALID: {
    username: 'invaliduser',
    password: 'wrongpassword999'
  }
};
```

---

### 11.3 SPA-Specific Page Object Patterns

Tuum Backoffice is an AJAX-heavy SPA. Three patterns
are established for handling async rendering:

#### Pattern 1 — Dismissible Dialog Handling
Used for: onboarding banner, product tour dialog.
Always use try/catch — never fail test if dialog absent.

```typescript
async dismissOnboardingBannerIfVisible(): Promise<void> {
  try {
    await this.onboardingNoThanksButton.waitFor({
      state: 'visible',
      timeout: 3000
    });
    await this.onboardingNoThanksButton.click();
  } catch {
    // banner not present — continue silently
  }
}

async dismissProductTourIfVisible(): Promise<void> {
  try {
    const tourDialog = this.page.locator(
      "text=Minimise or maximise"
    ).first();
    await tourDialog.waitFor({ state: 'visible', timeout: 3000 });
    await this.page.keyboard.press('Escape');
  } catch {
    // not present — continue
  }
}
```

#### Pattern 2 — Table with Async Data Load
Critical pattern: table container renders immediately
but data rows load via async API call.
Always wait for DATA ROWS not just table container.

```typescript
async waitForTableToLoad(): Promise<void> {
  // Step 1 — wait for table container (renders immediately)
  await this.notificationsTable.waitFor({
    state: 'visible',
    timeout: 15000
  });

  // Step 2 — wait for data rows (loads via async API call)
  // This is the critical wait — DO NOT skip this
  await this.page.waitForSelector(
    "[data-testid='table-notifications-failed-table'] tbody tr",
    { state: 'visible', timeout: 20000 }
  );
}
```

#### Pattern 3 — Network Idle Wait
Never access `this.page` directly from a Flow class —
`page` is protected in BasePage. Always wrap in a
Page Object method.

```typescript
// In Page Object — correct ✅
async waitForNetworkIdle(): Promise<void> {
  await this.page.waitForLoadState('networkidle');
}

// In Flow — correct ✅
await this.failedNotificationsPage.waitForNetworkIdle();

// In Flow — WRONG ❌ — will not compile
await this.failedNotificationsPage.page.waitForLoadState('networkidle');
```

---

### 11.4 Scoped Table Cell Locators

For tables where rows have unique `data-testid` values,
always scope cell locators within the row locator.
This prevents false matches when multiple rows exist.

```typescript
// Row locator
rowID1008 = page.locator("[data-testid='row-ID-1008']");

// Cell locators scoped within row — correct ✅
notificationIdCell = page
  .locator("[data-testid='row-ID-1008']")
  .locator("[data-testid='value-notificationID']");

channelCell = page
  .locator("[data-testid='row-ID-1008']")
  .locator("[data-testid='value-channel']");

// Unscoped cell locator — wrong ❌
// Will match first occurrence in entire table
notificationIdCell = page
  .locator("[data-testid='value-notificationID']");
```

---

### 11.5 Flow Composition Pattern — Tuum

Tuum flows do NOT compose each other.
Login is always handled in `beforeEach` via `tuumFlows.auth`.
Each flow handles its own domain only.

```typescript
// CORRECT — flows are independent ✅
test.beforeEach(async ({ tuumFlows }) => {
  await tuumFlows.auth.loginAsValidUser();  // auth flow
});

test('S05...', async ({ tuumFlows }) => {
  await tuumFlows.notifications            // notification flow
    .navigateToFailedNotifications();
});

// WRONG — notification flow composing auth flow ❌
export class TuumNotificationFlow {
  async loginAndNavigate(): Promise<void> {
    await this.authFlow.loginAsValidUser(); // don't do this
    await this.homePage.clickNotifications();
  }
}
```

---

### 11.6 Test Isolation Pattern

Tuum is a SPA — navigation state persists between tests
in the same describe block. Always reset to homepage
in `afterEach` to prevent state leakage between tests.

```typescript
test.describe('Tuum Backoffice — Feature', () => {

  test.beforeEach(async ({ tuumFlows }) => {
    await tuumFlows.auth.loginAsValidUser();
  });

  // Critical — reset page state after every test
  test.afterEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('...', async ({ tuumFlows }) => { ... });
});
```

**Why this matters:**

Without afterEach:
SPA retains navigation state between tests
→ Panel left open in T1 affects T2
→ Redirect to /login mid-test in T2
→ Intermittent failures hard to diagnose
With afterEach:
Every test starts from clean homepage state
→ Predictable, isolated, reliable


### 11.7 Notifications Panel — Dynamic Count Warning

The notifications trigger label includes a dynamic count:
"5 Failed notifications" ← count changes

Never assert on the exact label text.
Always use the `data-testid` locator instead:

```typescript
// CORRECT ✅
readonly notificationsButton = page.locator(
  "[data-testid='trigger-notifications']"
);

// WRONG ❌ — will fail when count changes
readonly notificationsButton = page.getByText(
  '5 Failed notifications'
);
```

---

### 11.8 Sign Out Pattern

Account settings dropdown → logout button.
Always wait for URL to return to /login before returning.

```typescript
// In TuumHomePage.ts
async signOut(): Promise<void> {
  await this.accountSettingsButton.click();
  await this.logoutButton.waitFor({ state: 'visible' });
  await this.logoutButton.click();
  await this.page.waitForURL('**/login');
}

// In TuumAuthFlow.ts or TuumNotificationFlow.ts
async signOut(): Promise<void> {
  await this.homePage.signOut();
  await expect(this.page)
    .toHaveURL(/.*\/login/);
}
```

---

### 11.9 Allure Tags and Features — Tuum

```typescript
// Tags enum additions
Tags.TUUM_LOGIN         = 'tuum-login'
Tags.TUUM_NOTIFICATIONS = 'tuum-notifications'

// Features enum additions
Features.TUUM_AUTH          = 'Tuum Authentication'
Features.TUUM_NOTIFICATIONS = 'Tuum Notifications'
```

Usage pattern:
```typescript
await setTestInfo({
  description: 'Verify failed notifications data',
  severity:    'critical',
  feature:     Features.TUUM_NOTIFICATIONS,
  story:       'Failed notifications data integrity',
  tags:        [Tags.SMOKE, Tags.TUUM_NOTIFICATIONS],
});
```

---

### 11.10 Fixture Registration — Tuum

```typescript
// Types
type TuumFlows = {
  auth:          TuumAuthFlow;
  notifications: TuumNotificationFlow;
};

// Registration in fixtures/index.ts
tuumFlows: async ({ page }, use) => {
  await use({
    auth:          new TuumAuthFlow(page),
    notifications: new TuumNotificationFlow(page),
  });
},
```

Adding a new Tuum flow:
---

### 11.11 Code Generator Reference Files

When generating new Tuum code, read these files
in this order — do NOT re-read all source files:

PRIMARY REFERENCE (always read):
→ FRAMEWORK_PATTERNS.md (this file)
TARGETED LOOKUP (read only when modifying):
→ TuumHomePage.ts        before adding locators/methods
→ fixtures/index.ts      before adding new fixture
→ allureUtils.ts         before adding new tags/features
→ plan.json              for locator expressions

---

### 11.12 Known Issues and Resolutions Log

| Issue | Root Cause | Resolution |
|---|---|---|
| S05 redirect to /login between tests | SPA state leakage from S04 leaving panel open | Added `afterEach` page reset to homepage |
| Table assertion failing — element not found | Table container renders before async data loads | Added `waitForSelector` on `tbody tr` after table container wait |
| TypeScript error — `page` is protected | Accessed `this.page` directly from Flow class | Wrapped in Page Object method `waitForNetworkIdle()` |
| MCP server failing in Claude CLI | `npx` resolving to `.ps1` blocked by execution policy | Changed command to `npx.cmd` in `.mcp.json` |
| Planner Chrome blocked by Group Policy | Corporate policy blocks remote debugging on managed Chrome | Switched to `--browser chromium` (Playwright bundled) |

---

## 12. Assertion Messages — Descriptive `expect()` Labels

Every `expect(...)` call in a Flow's assertion helper must pass a descriptive
message as the second argument:

```ts
// Don't:
expect(response.status).toBe(200);
expect(response.data.personId).toBeTruthy();

// Do:
expect(response.status, 'Create person response status should be 200').toBe(200);
expect(response.data.personId, 'Created person should have a personId').toBeTruthy();
```

**Why:** `allure-playwright` auto-captures every `expect()` call as its own
report sub-step, labelled with the matcher name (`Expect "toBe"`,
`Expect "toBeTruthy"`) by default — which tells a report reader nothing
about *what* was actually checked. The message argument becomes that
step's label instead (confirmed empirically — not just a doc comment,
inspect a real `allure-results/*-result.json`'s `steps` array to see it),
so the report reads as a plain-English list of what was verified, with the
actual expected value baked in, e.g. `Error code should be
"err.personTypeMissing"` — a non-engineer reading the report can
understand the check without opening the test code.

**Message content rules:**
- State what's being checked and the expected value, not just the field
  name — `` `Transaction amount should be ${expected.amount}` ``, not
  `'amount check'`.
- Interpolate the actual expected value into the message wherever
  possible, so the label itself carries the concrete number/string being
  checked, not just a description of the field.
- Keep it one line, plain English — this is for a report reader, not a
  code comment.

**Scope: this is a framework-wide rule, not an API-only one.** It applies
to every `expect(...)` call anywhere in the framework — Page Object/UI
assertions included, not just API Flow assertion helpers. The same
`expect(value, message)` signature works for web-first locator assertions
too:

```ts
// UI example — same convention
await expect(this.inventoryPage.shoppingCartBadge, 'Cart badge should be visible after adding an item').toBeVisible();
```

**Current status:** the Tuum API flows (`PostLedgerEntryFlow.ts`,
`CreatePersonAndAccountFlow.ts`) have been retrofitted with descriptive
messages. The existing UI/Page Object assertions (`BasePage`, UI flows
under `flows/`, `tuumbackoffice/` flows, etc.) have **not** been
retrofitted yet — that's a deliberately deferred, separate pass, not an
oversight. New UI assertions written from this point forward should still
follow this convention even though old ones haven't been updated.

**When converting a Postman collection to TS automation**
(`POSTMAN_TO_AUTOMATION_GUIDE.md`): every generated assertion helper must
follow this pattern from the start — don't generate bare `expect(a).toBe(b)`
calls and add messages later. This applies to every `expect()` in every
new Flow's assertion helpers, not just the ones converted from a specific
collection.