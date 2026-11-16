# Lint Clean-up Summary

Summary of the ESLint clean-up done before the first check-in of the `playwright-framework` code.

## 1. Background

The repository enforces linting on commit through a pre-commit hook (Husky + lint-staged,
configured in `lint-staged.config.js`). For staged `.ts` files it runs:

- `eslint --fix --max-warnings=0`
- `prettier --write`

`--max-warnings=0` means warnings block a commit exactly like errors do.

The first commit attempt failed with:

- `eslint --fix --max-warnings=0 [FAILED]` on chunk 2 of 2 — real lint findings.
- `eslint --fix --max-warnings=0 [SIGKILL]` on chunk 1 of 2 — most likely a side effect of the other
  chunk failing, not a separate code problem.

## 2. Result

| Stage | ESLint result |
|---|---|
| After `eslint --fix` (starting point) | 28 errors, 3 warnings |
| After removing unused imports, ignoring `dist/`, handling console warnings | 12 problems (11 errors, 1 warning) |
| After the Section A fixes | 4 problems (3 errors, 1 warning) |
| After the final fixes | 0 errors, 0 warnings (`--max-warnings=0`) |

`tsc --noEmit` also passes after the changes.

## 3. Findings by category

| # | Category | Rule | Count at start | Severity |
|---|---|---|---|---|
| 1 | Unused imports and variables | `@typescript-eslint/no-unused-vars` | 21 | error |
| 2 | Stale build output being linted | parser error on `dist/utils/envUtils.ts` | 1 | error |
| 3 | Un-awaited promise | `@typescript-eslint/no-floating-promises` | 1 | error |
| 4 | Flaky wait pattern | `playwright/no-networkidle` | 2 | error |
| 5 | Flaky wait pattern | `playwright/no-wait-for-selector` | 1 | warning |
| 6 | Console statements | `no-console` | 2 | warning |

## 4. What was done for each category

### 1. Unused imports and variables (21)
- Removed unused imports across 11 files: `expect`, `Expect`, `InternetCheckboxFlows`, `INTERNET_USERS`,
  `InternetLoginPage`, `step`, `setTestInfo`, `Tags`, `Features`.
- `internetNewWindow.spec.ts`: the whole Allure import line was unused and was deleted.
- `InternetLoginFlow.ts`: the unused `message` variable in `assertionLoginSuccess` was removed.
  The existing visibility check on the flash message is kept.

### 2. Stale `dist/` output
- `dist/utils/envUtils.ts` is an older copy of `utils/envUtils.ts` and is missing the Tuum settings.
- Added `dist/` to the ESLint `ignorePatterns` in `.eslintrc.json`.
- Added `/dist/` to `.gitignore`.
- `dist/` files were already tracked in git, so a `.gitignore` entry alone does not stop them being
  committed. They need `git rm -r --cached dist` (files stay on disk).

### 3. Floating promise
- `InternetNetworkInterceptionFlow.ts`, `continueRequest`: the route handler now returns
  `route.continue()` so the promise is no longer dropped.

### 4 and 5. Wait patterns (Tuum notifications)
- `TuumFailedNotificationsPage.ts`: `page.waitForSelector(...)` replaced with
  `locator(...).first().waitFor(...)` using the same selector and timeout.
- `waitForNetworkIdle()` removed from the page object, together with its call in
  `TuumNotificationFlow.navigateToFailedNotifications()`. `waitForTableToLoad()` on the next line already
  waits for the table and its data rows.
- `tuumNotifications.spec.ts`: removed the `networkidle` wait in `afterEach`. `page.goto('/')` already
  waits for the load event. A wait on the welcome message was not used, because a test that ends signed
  out would be redirected to login and fail the clean-up.

### 6. Console statements
- Both logs were kept as deliberate output, with `// eslint-disable-next-line no-console` above each:
  - `AccountApiClient.ts` (DEBUG output for a non-200 `createTransaction`).
  - `PostLedgerEntryFlow.ts` (FIFO check summary).

## 5. Notable finding: a latent bug

`InternetLoginFlow.assertionLoginError` read the flash message without `await` and then asserted on the
resulting Promise, so `expect(message).toContain(...)` was not checking the text. An `await` was added.
The method is not called by any spec at the moment, so this had not surfaced.

## 6. Verification and limits

- Verified: `npx eslint . --ext .ts --max-warnings=0` is clean; `npx tsc --noEmit` is clean.
- Not verified: no Playwright tests were run against dev, because the current focus is the API flows.
  The Tuum UI changes (items 4 and 5) and the `continueRequest` change (item 3) have therefore not been
  exercised and should be checked when the UI cases are picked up again.
- The pre-commit hook also runs Prettier. Several files show formatting changes on disk, which is
  consistent with Prettier having reformatted them.

## 7. Files changed

- Config: `.eslintrc.json`, `.gitignore`
- Flows: `InternetLoginFlow.ts`, `InternetNetworkInterceptionFlow.ts`, `TuumNotificationFlow.ts`,
  `PostLedgerEntryFlow.ts`
- Pages: `TuumFailedNotificationsPage.ts`
- API: `AccountApiClient.ts`
- Specs: `internetFileUpload`, `internetJSAlerts`, `internetLogin`, `internetNewWindow`,
  `internetcheckboxes`, `internetdropdown`, `tuumLogin`, `tuumNotifications`

## 8. How to re-run the checks

From the `playwright-framework` folder:

```bash
npx eslint . --ext .ts --max-warnings=0
npx tsc --noEmit
```

## 9. Open items

- Decide whether to run `git rm -r --cached dist` so compiled output stops being tracked.
- Re-run the UI specs when the UI cases resume, to confirm the wait changes.
- Decide whether `internetJSAlerts` and `internetNewWindow` should get Allure `setTestInfo` calls,
  as the other specs have.
