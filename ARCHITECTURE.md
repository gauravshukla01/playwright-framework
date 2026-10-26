# Playwright Framework — Architecture Overview

This framework automates end-to-end testing of the **Tuum Backoffice** web application
using [Playwright](https://playwright.dev/) and TypeScript. It is designed so that tests
read like a description of what a real user does, not like a script full of technical detail.

---

## How it is layered

Every test goes through five layers, each with a single responsibility:

```
┌─────────────────────────────────────────────────────────┐
│  TEST SPECS   tests/tuumbackoffice/tuumLogin.spec.ts    │  ← What to verify
│               tests/tuumbackoffice/tuumNotifications…   │
└────────────────────────┬────────────────────────────────┘
                         │ calls
┌────────────────────────▼────────────────────────────────┐
│  FLOWS        flows/tuumbackoffice/TuumAuthFlow.ts      │  ← How to do it
│               flows/tuumbackoffice/TuumNotificationFlow │    (user journeys)
└────────────────────────┬────────────────────────────────┘
                         │ calls
┌────────────────────────▼────────────────────────────────┐
│  PAGE OBJECTS pages/tuumbackoffice/TuumLoginPage.ts     │  ← Where things are
│               pages/tuumbackoffice/TuumHomePage.ts      │    (locators + actions)
│               pages/tuumbackoffice/TuumFailedNotif…     │
└────────────────────────┬────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────┐
│  BROWSER      Playwright (Chromium / Firefox / WebKit)  │  ← The real browser
└─────────────────────────────────────────────────────────┘

Supporting layers (used across all of the above):

  fixtures/index.ts   — Wires pages and flows into Playwright's test runner
  data/tuumUsers.ts   — Test user credentials
  utils/allureUtils   — Allure reporting helpers (steps, tags, severity)
  playwright.config   — Browser setup and target URL (controlled by APP env var)
```

---

## What each layer does

**Test Specs** are the entry point. Each spec file contains one or more tests grouped by
feature. Tests are written in plain English steps and read like a user story. They do not
contain any knowledge of HTML structure or element selectors — that detail is hidden deeper
in the stack.

**Flows** sit directly below specs. A Flow is a class that knows how to carry out a
multi-step user journey, such as logging in, navigating to Failed Notifications, or signing
out. Flows compose multiple Page Object actions into meaningful sequences and own the
assertions that confirm a journey succeeded. Flows have no idea what the HTML looks like.

**Page Objects** know exactly which element on a page does what. Each class represents one
screen of the Tuum Backoffice (Login, Homepage, Failed Notifications). Locators — the
instructions that tell the browser which element to interact with — are declared once here
and reused everywhere. Actions (fill this field, click that button) are individual methods
named from a user's perspective.

**Fixtures** are the glue. They instantiate Flows and Page Objects and hand them to tests
via Playwright's dependency-injection system. A test simply declares what it needs
(`{ tuumFlows }`) and the fixture provides it — no manual setup required.

**Data** holds test credentials and expected values in one place (`data/tuumUsers.ts`),
so changing a password means editing one file, not hunting through many tests.

**Config** (`playwright.config.ts`) reads the `APP` environment variable to decide which
application URL to point at. Setting `APP=tuumbackoffice` targets
`https://backoffice.cab-dev.tuumplatform.com`. Switching to a different application requires
only a one-word change.

---

## What a test looks like end to end

```
beforeEach → tuumFlows.auth.loginAsValidUser()
             └─ TuumAuthFlow
                └─ TuumLoginPage.navigateTo('/login')
                └─ TuumLoginPage.fillUsername(...)
                └─ TuumLoginPage.fillPassword(...)
                └─ TuumLoginPage.clickSignIn()
                └─ page.waitForURL('/')
                └─ TuumHomePage.dismissOnboardingBannerIfVisible()

test step  → tuumFlows.notifications.navigateToFailedNotifications()
             └─ TuumNotificationFlow
                └─ TuumHomePage.dismissProductTourIfVisible()
                └─ TuumHomePage.clickNotifications()
                └─ TuumHomePage.clickFailedNotifications()
                └─ TuumFailedNotificationsPage.waitForTableToLoad()

assertion  → tuumFlows.notifications.assertNotificationRecord('ID-1008', 'EMAIL')
             └─ TuumFailedNotificationsPage.assertRowExists(...)
             └─ TuumFailedNotificationsPage.assertNotificationId(...)
             └─ TuumFailedNotificationsPage.assertChannel(...)
```

The test itself never touches a selector or a URL — all of that lives in the appropriate
layer below it.

---

## API Testing

The framework supports REST API testing alongside browser UI tests. The same Playwright
installation covers both — no separate tool or library is needed.

---

### How the API layer is structured

API testing follows the same three-layer principle as UI testing, but replaces Page Objects
with API Clients. There is no browser involved — Playwright sends HTTP requests directly.

```
┌─────────────────────────────────────────────────────────┐
│  TEST SPECS   tests/api/auth.api.spec.ts                │  ← What to verify
└────────────────────────┬────────────────────────────────┘
                         │ calls
┌────────────────────────▼────────────────────────────────┐
│  API FLOWS    flows/AuthApiFlow.ts                      │  ← How to do it
│                                                         │    (journeys + assertions)
└────────────────────────┬────────────────────────────────┘
                         │ calls
┌────────────────────────▼────────────────────────────────┐
│  API CLIENTS  api/BaseApiClient.ts  (abstract)          │  ← Where requests go
│               api/AuthApiClient.ts  (concrete)          │    (endpoints + parsing)
└────────────────────────┬────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────┐
│  HTTP         Playwright APIRequestContext              │  ← The real HTTP engine
└─────────────────────────────────────────────────────────┘
```

---

### BaseApiClient — the shared HTTP foundation

`api/BaseApiClient.ts` is an abstract class that all API clients extend. It wraps
Playwright's `APIRequestContext` into clean, reusable HTTP methods (`get`, `post`, `put`,
`delete`) and handles two things that every request needs automatically:

- **Headers** — `Content-Type`, `Accept`, and the API key are injected on every call via a
  private `buildHeaders()` method. Individual tests never think about headers.
- **Response parsing** — a typed `parseResponse<T>()` method converts the raw response body
  into a TypeScript object, so callers get structured data rather than raw JSON strings.

> **Why abstract?** Any future API client (e.g. a Tuum-specific one) simply extends
> `BaseApiClient` and inherits all the HTTP plumbing for free. Only the endpoint methods
> need to be written.

---

### AuthApiClient — the concrete endpoint layer

`api/AuthApiClient.ts` extends `BaseApiClient` and defines the actual API calls the tests
make. Each method maps to one endpoint and returns a typed `ApiResponse<T>` containing the
HTTP status code and the parsed response body.

Current endpoints covered:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `login(email, password)` | `POST /api/login` | Authenticate and receive a token |
| `loginWithInvalidCredentials(...)` | `POST /api/login` | Attempt login with bad credentials |
| `getUsers(page)` | `GET /api/users?page=N` | Fetch a paginated list of users |
| `getUserById(id)` | `GET /api/users/:id` | Fetch a single user by ID |
| `register(email, password)` | `POST /api/register` | Register a new user |

> **Note on test target:** The current API tests run against `reqres.in`, a publicly
> available API sandbox, rather than Tuum Backoffice directly. The pattern is fully
> established — adding a Tuum-specific API client means creating a new class that extends
> `BaseApiClient` and points at the Tuum API base URL.

---

### AuthApiFlow — journeys and assertions

`flows/AuthApiFlow.ts` sits above the client and follows the same principle as UI flows:
it composes individual client calls into named journeys and owns all the assertions.

Tests do not call the client directly. They call the flow, which decides which client
method to use and what the result should look like. This keeps assertion logic out of
specs and makes flows reusable across multiple tests.

Key methods:

- `loginWithValidCredentials()` — calls the login endpoint with known-good credentials and
  returns the full response for the caller to inspect.
- `loginWith(credentials)` — parameterised version for data-driven tests that pass in
  different credential combinations.
- `loginWithInvalidCredentials()` — calls the login endpoint with bad credentials; the
  caller asserts on the error response.
- `getAuthToken()` — logs in, asserts the token is present, and returns just the token
  string. Intended as a precondition helper for tests that need an authenticated session
  before making further API calls.
- `assertLoginSuccess(response)` — verifies status is 200 and token is a non-empty string.
- `assertLoginFailure(response, expectedError)` — verifies status is 400 and the error
  message matches.
- `assertUserShape(userId)` — fetches a user by ID and verifies the response contains the
  expected fields (`id`, `email`, `first_name`).

> **Why return the response to the caller in some methods?** Methods like `loginWith()`
> return the raw `ApiResponse<T>` rather than asserting inside the flow. This supports
> parameterised test patterns where the same journey is called with different inputs and
> the test decides what outcome to assert for each one.

---

### How the API fixture is wired

The `apiFlows` fixture in `fixtures/index.ts` receives Playwright's `request` object
(not `page`) and uses it to instantiate `AuthApiFlow`. Tests that need API access simply
declare `{ apiFlows }` — the framework provides the rest.

```
apiFlows: async ({ request }, use) => {
  await use({
    auth: new AuthApiFlow(request),
  });
},
```

The `request` fixture is Playwright's built-in HTTP context — it is completely independent
of the browser. A test can use `{ apiFlows }` without ever opening a browser tab, or combine
`{ tuumFlows, apiFlows }` in the same test to mix UI and API assertions.

---

### Shared utilities

Beyond the layered architecture, the framework provides two utility modules available to
any test or flow:

**`utils/envUtils.ts`** manages environment configuration safely. `getRequiredEnv(key)`
throws immediately with a clear message if a required variable is missing, rather than
failing silently mid-test. `getOptionalEnv(key, default)` returns a fallback value.
`getENV()` returns a fully typed config object — it is called as a function rather than
exported as a constant so that environment variables are only read when actually needed,
not at import time.

**`utils/stringutils.ts`** provides test data generation helpers that any test can use
without importing an external library:

| Function | Purpose |
|----------|---------|
| `generateRandomEmail(prefix)` | Unique email per test run — avoids duplicate registration errors |
| `randomString(length)` | Random alphanumeric string for free-text fields |
| `randomInt(min, max)` | Random integer, useful for selecting random list items |
| `maskSensitiveData(value)` | Masks passwords in log output (`secret` → `se*****`) |
| `containsIgnoreCase(source, search)` | Case-insensitive partial text match for assertions |
| `truncate(value, maxLength)` | Shortens long strings for readable test output |

---

## Key design decisions

| Decision | Why |
|----------|-----|
| **Strict layer boundaries** | A bug in a locator is fixed in one place and all tests that use it benefit automatically. |
| **Flows own assertions** | Tests stay readable; flows stay reusable; no assertion logic is scattered across specs. |
| **APP env var controls target URL** | The same test suite can run against dev, staging, or production by changing one variable. |
| **Fixtures inject dependencies** | Tests declare what they need; the framework provides it. No boilerplate setup in every spec. |
| **try/catch for optional UI elements** | Dismissible banners and product tours are handled silently so tests never fail on UI noise. |
| **Playwright for both UI and API** | One tool, one runner, one report — no context-switching between separate API and UI test stacks. |
| **Typed API responses** | `ApiResponse<T>` gives compile-time safety on response shape — a mismatched assertion fails at build time, not at test runtime. |
| **Abstract BaseApiClient** | New API clients for other services inherit HTTP plumbing for free — only endpoint methods need writing. |
