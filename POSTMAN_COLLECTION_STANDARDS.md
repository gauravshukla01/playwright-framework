# Postman Collection Standards — for collections destined for automation

> A collection that meets these standards can go through
> `POSTMAN_TO_AUTOMATION_GUIDE.md`'s conversion process with far less
> back-and-forth. Most of the ambiguities that conversion has hit so far
> (hardcoded IDs, incomplete assertions, unclear scope) were preventable at
> the source, not inherent to conversion itself. Share this with whoever
> builds/exports the collection before handing it over for automation.

---

## 1. No hardcoded environment values

Base URL, tenant code, channel code, and credentials must be collection or
environment **variables** (`{{baseUrl}}`, `{{tenantCode}}`, ...) — never
literal strings baked into a request. A collection with a literal
`CA.CAGM` in one request and `{{tenantCode}}` in another is a sign of
copy-paste drift, not a deliberate choice — call it out if it's
intentional.

## 2. No hardcoded response values in assertions

Every expected value in a `pm.test(...)` block must come from a variable
captured earlier in the same run (`pm.collectionVariables.set(...)`),
never a literal copied from one specific past execution. This is the
single most damaging pattern seen so far — assertions hardcoding a
specific `accountId`/`personId`/GUID from one historical run will always
fail on a fresh run, and converting them faithfully just ports the bug
into the automated suite.

## 3. Chaining must already be wired in the collection

If step N's response produces a value step N+1 needs, that must already
be captured via `pm.collectionVariables.set(...)` (or
`pm.environment.set(...)`) in the source collection — not left as
something the conversion has to reverse-engineer from reading two
requests side by side and guessing the relationship.

## 4. Out-of-scope content lives in a separate collection

Diagnostic/one-off setup requests (e.g. discovering a lookup-table value)
and explicitly parked/abandoned work ("do not run this folder") should not
be nested inside the same collection as the real business flow. If they
must stay for reference, mark them unmistakably at the **collection**
level (not buried in one folder's description) and expect them to be
excluded from conversion by default.

## 5. Every test script has a complete, real assertion

A `pm.test(...)` block that only checks `status === 200` (or worse, has no
assertion at all) gives automation nothing to reproduce. Negative/
validation test cases especially must assert the actual expected error
`code`/`message`/`field` — an incomplete case either gets dropped from
conversion or blocks it while someone runs it live to discover the real
expected value.

## 6. One collection = one clearly-scoped concern

A collection should cover one business flow or one tightly related group
(e.g. "FR-A2 — Account Suspension and Reinstatement"), not a grab-bag of
unrelated requirements bundled together because they happened to be built
around the same time.

## 7. The matching OpenAPI spec(s) must be supplied alongside the collection

Every conversion so far has needed the real microservice spec(s) as a
second input — Postman collections are frequently stale, copy-pasted from
a different endpoint's template, or simply wrong about required fields.
Treat the spec as a **required companion input**, not optional
documentation.

## 8. No unexplained "Copy" duplicates

A request named `CreateAccount Copy` with no description of *why* it's a
copy (a currency-iteration variant? an abandoned experiment? a genuine
duplicate?) forces a judgment call during conversion. Rename to state its
actual purpose (`CreateAccount — currency iteration`), or delete it if
it's dead weight.

## 9. Document known unknowns directly in the request/folder description

Rich, dated descriptions ("confirmed live 10 Sep 2026...", "unconfirmed —
flag rather than guess") have been consistently the *most* useful signal
during conversion — they turn a silent assumption into something that can
be verified or asked about explicitly. Keep this practice; it's a
strength, not overhead. Date-stamp significant changes so staleness is
visible.

## 10. Idempotency-sensitive requests must already use dynamic values

Any `POST` that creates a resource should send a fresh unique value per
run for its idempotency key (`{{$guid}}` for `x-request-id`) and for any
uniqueness-constrained business field (`idNumber`, `name`, etc. — e.g.
`{{$timestamp}}`/`{{$randomInt}}`), not a static string that will collide
on a second run against a real, stateful environment.

## 11. No real credentials or tokens committed in the collection JSON

Only variable *references* to credentials should appear in an exported
collection — actual usernames/passwords/tokens belong in a separate,
not-exported Postman environment file (or better, never in Postman at
all, only in the target `.env`).

## 12. Flag response-shape assumptions for undocumented endpoints explicitly

If a request hits a path with no `operationId` wired in the spec (a stub),
its description should say so plainly — "this path is undocumented in the
spec export, response shape is inferred from the component schema, not
confirmed" — rather than presenting an inferred shape as if it were
verified.

## 13. Flag environment-side preconditions explicitly

If a request depends on tenant-specific configuration that must already
exist (a registered lookup value, a specific pre-existing test account),
say so directly, including how that precondition was created/loaded.
Automation needs to know whether it's expected to set that precondition
up itself or treat it as a fixed assumption about the target environment.

---

## Quick checklist before handing off a collection for automation

- [ ] No literal base URL / tenant / credential values anywhere
- [ ] No hardcoded response values in any assertion
- [ ] All cross-request chaining already wired via collection variables
- [ ] Diagnostic/parked content separated out or clearly marked at the collection level
- [ ] Every test script has a real, complete assertion
- [ ] Collection scope is one business concern, not several bundled together
- [ ] Matching OpenAPI spec(s) attached/referenced
- [ ] No unexplained "Copy" duplicate requests
- [ ] Descriptions capture known unknowns/assumptions, dated
- [ ] Idempotency keys and uniqueness-constrained fields use dynamic values
- [ ] No real secrets in the exported JSON
- [ ] Undocumented/stub endpoints flagged as unconfirmed
- [ ] Environment-side preconditions stated explicitly
