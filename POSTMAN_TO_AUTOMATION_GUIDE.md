# Postman Collection → TS Automation — Conversion Guide

> Reference for converting a Tuum Postman collection into this framework's
> layered API automation (client → flow → fixture → spec), based on the
> process used for `CollectionPostLEdgerEntry_Tuum` and
> `CreatePersonCollection`. Read alongside `ARCHITECTURE.md` and
> `FRAMEWORK_PATTERNS.md` — this file is the *process*, those are the
> *code shape*.

---

## 0. Inputs you need before starting

- The Postman collection JSON (exported, `.postman_collection.json`).
- The OpenAPI spec for every microservice the collection touches
  (`auth-api.json`, `person-api.json`, `account-api.json`, ... — currently
  at `C:\Users\g_shukla\OneDrive - Crown Agents Bank\TuumAPIs\`).
- Real credentials for the target environment, and the environment's base
  domain (e.g. `cab-dev.tuumplatform.com`) — these almost never live in the
  exported collection (they're in a separate, usually not-exported, Postman
  *environment* file).

---

## 1. Verify every request against the real spec — never trust Postman blindly

For each request in the collection, look up its `method + path` in the
matching OpenAPI spec and confirm:

- The exact `operationId`.
- The request body schema name and its actual required/optional fields.
- The response schema (and whether it's wrapped in the Tuum envelope —
  see §4).

Use a quick Node script against the spec JSON rather than eyeballing a
huge file:

```js
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const op = spec.paths['/api/v3/persons/{personId}'].get;
console.log(op.operationId, op.requestBody, op.responses['200']);
```

**Flag anything that doesn't line up:**

| Symptom | What it usually means |
|---|---|
| Path exists but has no method wired (`"...": {}`) | Undocumented/stub endpoint in this spec export. Build the request from the matching `components.schemas.*Json` if it exists (e.g. `CreateAccountV5Json`), but treat the **response shape as unverified** until a real call confirms it (see §6). |
| Postman body has fields not in the schema | Likely copy-pasted from a different endpoint's template. Ask the user whether to keep or drop them — don't decide silently (see §2). |
| Postman header uses a different tenant/env value than the rest of the collection | Could be intentional (different resource, different tenant) or a copy-paste leftover. Ask, don't assume. |
| A later request hardcodes an ID that an earlier request's response actually produces | The Postman collection never wired a `pm.collectionVariables.set(...)` for it, or it's stale. In automation this **must** become chained data (capture the ID from the earlier response), never a hardcoded literal. |

---

## 2. Resolve ambiguities before writing any code

Every conversion so far has surfaced the same categories of open question.
Ask the user explicitly (don't guess) when you hit:

1. **Base URL / environment domain** — not in the exported collection.
2. **Tenant code inconsistency** across requests in the same collection.
3. **Credential source** — hardcoded in a data file vs. externalized to `.env`.
4. **Extra/mismatched request body fields** vs. the documented schema.
5. **Undocumented endpoints** — proceed on the component schema, flag the gap.

Use `AskUserQuestion` for anything that's genuinely the user's call and
blocks correctness — not for things you can infer from the spec or from
existing framework convention.

---

## 3. Env config

Add to **both** `.env.example` and `utils/envUtils.ts`'s `getENV()`:

- One `BASE_URL_<SERVICE>_API` per microservice touched (default value =
  `https://<service>-api.<confirmed-domain>`).
- `TUUM_TENANT_CODE` / `TUUM_CHANNEL_CODE` (shared across all Tuum calls).
- Employee credentials (`TUUM_EMPLOYEE_USERNAME` / `TUUM_EMPLOYEE_PASSWORD`)
  via `getRequiredEnv()` — fail fast with a clear message if missing.

**Known gotcha:** `dotenv` treats an unquoted `#` in a value as a comment
marker and silently truncates everything after it. If a password/secret
contains `#`, it **must** be quoted in `.env`:
`TUUM_EMPLOYEE_PASSWORD="pass@#word"`. A truncated secret produces a
confusing 400 from the API, not an obvious "wrong password" error — if a
freshly-wired auth call 400s, verify the parsed env value's length before
suspecting anything else.

**Known gotcha #2:** `getENV()` builds one combined object, and any key
wired with `getRequiredEnv()` throws immediately if missing — even if the
caller only needed a different key. Every environment must have *all*
required keys populated (even irrelevant ones, e.g. `REQRES_API_KEY=unused`
if you're only running Tuum tests), or add a real value.

---

## 4. Client layer — `api/tuum/`

- One client class per microservice, extending `TuumBaseApiClient` (which
  itself extends `BaseApiClient`). `TuumBaseApiClient` already provides:
  - `x-tenant-code` / `x-channel-code` default headers.
  - `setAuthToken(token)` — call once after login, shared across all Tuum
    clients used in a flow.
  - `parseTuumData<T>(response)` — unwraps the `{errors, validationErrors,
    data}` envelope every Tuum service uses, so client methods return a
    plain `ApiResponse<T>` like the rest of the framework.
- **One method per endpoint.** Split into named variants only when the
  response shape genuinely branches by scenario (see `AuthApiClient.ts`'s
  `login()` vs `loginWithInvalidCredentials()` for the established
  precedent) — not for every input variation.
- **Type only the fields the framework actually sends/reads.** Don't
  transcribe a 50-field schema when 6 fields are used — extend the
  interface later if a new flow needs more (see `Person`, `Account` for
  examples of intentionally lean types).
- **Idempotent POSTs need a fresh `x-request-id` per call.** Generate it
  in the client method signature as a required param
  (`requestId: string`), pass `randomUUID()` from the flow layer at
  call time — never hardcode it.
- **New endpoint methods extend the existing client file** — don't create
  a second `AccountApiClient`-like class for new account-api endpoints.

---

## 5. Flow layer — `flows/tuum/`

One flow class per business journey, constructed with Playwright's
`request` fixture:

```ts
export class SomeFlow {
  private readonly authClient: TuumAuthApiClient;
  // ...other clients

  async authenticate(): Promise<string> {
    // authorise, assert 200 + token present, then:
    this.otherClient.setAuthToken(token);
    return token;
  }

  // one method per journey step, returning ApiResponse<T>

  // assertX() methods: own all assertions, and return any ID the caller
  // needs to chain into the next step (never hardcode a downstream ID).
}
```

- `authenticate()` is copy-pasted per flow today (same body in
  `PostLedgerEntryFlow` and `CreatePersonAndAccountFlow`) — acceptable
  duplication for now; only extract a shared helper if a third flow makes
  the duplication actually costly.
- Assertion helpers live in the flow, not the spec (framework-wide rule).
- Every `expect(...)` call inside an assertion helper must pass a
  descriptive message as its second argument (e.g.
  `expect(response.status, 'Create person response status should be 200').toBe(200)`) —
  see `FRAMEWORK_PATTERNS.md` §12 for why and the exact convention. Write
  it this way the first time; don't generate bare `expect(a).toBe(b)` and
  add messages in a later pass.
- Journey methods should accept scenario/override objects rather than
  hardcoding business values, so the same flow works whether the spec is
  static or data-driven (see §7).

---

## 6. When an endpoint's response shape is unverified (undocumented path)

Don't guess and move on — confirm with a real call, then fix the type:

1. Type the response using your best guess from context.
2. Run the flow once with a temporary `console.log(JSON.stringify(response.data, null, 2))` in the relevant assertion helper.
3. Compare the real shape to your type, fix the interface, remove the
   debug log.
4. Add a one-line comment on the type noting it was confirmed against a
   real response, not the (missing/incomplete) spec.

This caught a real bug during `createAccount()`: the assumed `Account`
type had a top-level `personId`, but the real `/api/v5/accounts` response
nests person ownership inside `accountPersons[]` instead.

---

## 7. Fixture wiring

Add the new flow to the **existing** `tuumApiFlows` fixture bucket in
`fixtures/index.ts` — extend the `TuumApiFlows` type and the factory
function. Don't invent a new fixture type per flow; `tuumApiFlows` is the
home for all Tuum API journeys, the same way `apiFlows` is for reqres.

---

## 8. Spec layer — static vs. data-driven

Start with a single hardcoded scenario to prove the flow works end to end
(the "checkpoint" run). Once that passes, parameterize:

### 8.1 Scenario JSON file — `testData/<domain>/<flowName>.scenarios.json`

An array of objects, each with:
- `description` — becomes the Playwright test name.
- Whatever inputs the flow's journey methods need (mirror the request
  body shape).
- An `expected` block — what the spec asserts against. Keeps assertion
  values out of the spec file entirely.

**Deliberately excluded from JSON:** anything that must be fresh per call
(idempotency UUIDs, "today's date" when a scenario doesn't override it,
random uniqueness suffixes for fields like `idNumber`/`name` that the
target system requires to be unique). JSON holds the *static* business
data; code appends the *dynamic* parts. Don't build a templating engine
(`{{random:6}}` tokens) for this — a small per-flow "build request from
scenario" function reusing `utils/stringutils.ts` is simpler and already
established.

### 8.2 Loader — `utils/testDataLoader.ts` (build once, reuse everywhere)

```ts
export function loadScenarios<T>(relativePath: string): T[]
```

Reads the JSON, fails fast with a clear error if the file is missing,
invalid JSON, or not a top-level array. Deep per-field validation is
deliberately deferred — revisit only if malformed scenario files become a
recurring problem.

### 8.3 Scenario interface + accessor — `data/<flowName>Data.ts`

```ts
export interface <FlowName>Scenario {
  description: string;
  // ...inputs, reusing existing client request types where possible
  expected: { /* ... */ };
}

export function get<FlowName>Scenarios(): <FlowName>Scenario[] {
  return loadScenarios<...>('testData/<domain>/<flowName>.scenarios.json');
}
```

### 8.4 Spec — loop scenarios into tests

```ts
const scenarios = get<FlowName>Scenarios();
for (const scenario of scenarios) {
  test(scenario.description, async ({ tuumApiFlows }) => {
    // setTestInfo, step(...) blocks as usual, using scenario.* as inputs
    // and scenario.expected in the flow's assertion helper calls
  });
}
```

Adding a new scenario is then a **pure JSON edit** — no TypeScript changes.

---

## 9. Verification checkpoints (every conversion, every parameterization change)

Run in this order, stop and fix on any failure:

1. `npx tsc --noEmit` — compiles clean.
2. `npx eslint <changed files> --ext .ts` — lints clean.
3. `npx playwright test <spec> --project=chromium --list` — confirms
   Playwright discovers the expected number of tests with sensible names.
4. `npx playwright test <spec> --project=chromium` — real run against the
   live environment.

For **create** flows (anything that posts new persons/accounts/records),
call out any identifiers created (e.g. `idNumber`, `personId`) so the user
can manually verify in the application UI — these are real records in a
real environment, not disposable test fixtures.

---

## 10. Things this framework does *not* control, worth remembering

- **Test execution order is not guaranteed.** Local runs use multiple
  Playwright workers by default (`workers: undefined` in
  `playwright.config.ts` → picked based on CPU cores). Two data-driven
  scenarios in the same `describe` block can run in parallel — don't
  assume scenario N finishes before scenario N+1 unless you explicitly
  force `test.describe.configure({ mode: 'serial' })` or reduce to
  `--workers=1`.
- **UI-displayed timestamps may be lower precision than the API's.** If
  you need to prove strict ordering (e.g. FIFO) between two calls, prefer
  a server-assigned monotonic marker from the raw API response
  (`filingCode`'s sequence suffix, or a strictly-increasing ID) over a
  timestamp, and control submission order explicitly (serial, single
  test) rather than relying on parallel test completion order.

---

## Quick checklist for the next collection

- [ ] Verify every request against the real spec (method, path, schema).
- [ ] List gaps/ambiguities found; ask the user before assuming anything.
- [ ] Add any new env vars to `.env.example` + `getENV()`.
- [ ] Extend or create `api/tuum/<Service>ApiClient.ts` — one method per
      endpoint, lean types, idempotency UUID for POSTs.
- [ ] Create `flows/tuum/<Name>Flow.ts` — authenticate + journey steps +
      assertion helpers that return chained IDs.
- [ ] Every `expect(...)` in those assertion helpers has a descriptive
      message as its second argument (see `FRAMEWORK_PATTERNS.md` §12).
- [ ] Wire into the existing `tuumApiFlows` fixture bucket.
- [ ] Write a single-scenario spec first; run it as a checkpoint.
- [ ] If an endpoint's response was unverified, confirm the real shape via
      a debug log, then fix the type and remove the log.
- [ ] Parameterize: scenario interface, `testData/*.scenarios.json`,
      `getXScenarios()`, spec loop.
- [ ] Run the full verification checkpoint (§9) after every change.
