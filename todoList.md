# TODO

- Parameterize `transactionTypeCode`, `valueDate`, `money`, etc. in
  `flows/tuum/PostLedgerEntryFlow.ts`'s `postOutgoingFunds` (around line 70)
  so these fields can be controlled more directly, rather than only via the
  `overrides` param on top of hardcoded defaults.

## FRP2 / FRP3 conversion — pending items (logged 2026-10-20)

- **P1 — Serial mode skips scenarios after a hard failure.** FRP2/FRP3 specs
  use `test.describe.serial`, so if one scenario fails hard (e.g. the FRP3
  reversal-ledger mirror check), the remaining scenarios in that file are
  skipped (e.g. FRP3-TC1-CREDIT never runs). Consider
  `test.describe.configure({ mode: 'default' })` — still in order, but a
  failure doesn't skip the rest.
- **P2 — Retries in CI.** `playwright.config.ts` has `retries: process.env.CI ? 2 : 0`,
  so a failing posting spec re-posts real Tuum transactions up to 3 times.
  Revisit per-spec `retries: 0` for FRP specs.
- ~~**P3 — FRP3 deposit GL codes are a placeholder.**~~ **Closed 2026-10-20:**
  verified on cab-dev (deposit ID-6050 posted D 2022000 / C 2014000, the
  mirror of a withdrawal); FRP3-TC1-CREDIT in
  `testData/tuum/frp3LedgerImmutability.scenarios.json` updated to match.
- **P4 — FRP3 is USD-only (R8).** The reversal-ledger check asserts
  `reportingCcyExchangeRate === 1` on every entry, so the FRP3 loader rejects
  non-USD scenarios. To support other currencies, make the check conditional
  (rate 1 ⇒ amounts equal) or add an expected rate to the scenario JSON.
- **P5 — FRP3 TC2 (reversal with fee) deferred.** Not working on the Tuum side.
  Add later as a new scenario entry; the reversal should cover the full
  transaction (100 principal + fee 5 + VAT 1 breakup).
- **P6 — FRP4 parked; FRP5 open.** FRP4 (concurrency) review items 4.1–4.5 and
  FRP5 items 5.3–5.9 are unresolved.
- **P7 — Postman-only gaps in FRP3 › TC1.** The Postman collection still lacks:
  amount-equality on the reversal ledger (R3), re-query of the original ledger
  after reversal (R4 / "4a"), and a GET of the original asserting
  `reversed = true` + `reversedByTransactionId` (R5). The TS spec covers all
  three.
- **P8 — FRP2 uses two scenarios files (rule: one per spec).** Logged
  2026-10-21, awaiting user confirmation — do not change yet.
  `frp2ExactlyOnceIdempotency.scenarios.json` (TC1) and
  `frp2UniqueRequestId.scenarios.json` (TC2) should become one file with one
  shape: every entry has a `transactions` array (TC1 = 1 item, TC2 = 2) and a
  `"testCase": "TC1" | "TC2"` field; `data/tuumFrp2Data.ts` gets a single
  `getFrp2Scenarios(testCase?)` loader; the spec filters by test case; delete
  `frp2UniqueRequestId.scenarios.json`. Same 3 tests, same data. Also add the
  "one scenarios file per spec" rule to the convert-collection skill (Step 4).
- **P9 — FRP1 and FRP2 don't assert ledger GL codes.** Logged 2026-10-21,
  not started. `PostLedgerEntryFlow.assertLedgerEntries()` already supports
  an optional `glAccounts` check (shared `assertGlAccounts()`), but only
  FRP3 passes it — the FRP1/FRP2 Postman Finance event scripts never
  checked GL codes, so a posting booked to the wrong GL accounts would
  still pass them. Fix is data + one argument, no new helper code: add an
  `expected.ledger.original` block (same shape as
  `frp3LedgerImmutability.scenarios.json`) to
  `frp1SubSecondPostingFifo.scenarios.json` and the FRP2 scenarios —
  withdrawal D 2014000 / C 2022000, deposit the mirror (D 2022000 /
  C 2014000), both confirmed on cab-dev — add the field to the data types
  in `data/tuumFrp1Data.ts` / `data/tuumFrp2Data.ts`, and pass
  `glAccounts: expected.ledger.original` in the specs'
  `assertLedgerEntries()` calls (FRP1 Finance event; FRP2 Finance event1 and
  Finance event2). Best done together with P8.
- **P10 — FRP3 reversal-ledger check duplicates the shared ledger check.**
  Logged 2026-10-21, not started.
  `PostLedgerEntryFlow.assertReversalLedgerMirrorsOriginal()` re-implements
  ~15 checks that `assertLedgerEntries()` already has, and the two have
  drifted: the reversal version lacks the `entryId` format (`^ID-\d+$`) and
  `entryNumber = eventId` checks, and differs on exchange rate (must be 1
  vs. "if 1, amounts match") and details (consistent across entries vs.
  equals the transaction's). Refactor it to call `assertLedgerEntries()` for
  the common part and keep only the reversal-specific checks (D/C swapped
  vs. the original, amount = reversed amount, rate = 1 / USD-only, unique
  entry ids). Note: the reversal check would then gain the two checks FRP1's
  Postman script has but FRP3's reversal script doesn't — confirm with the
  user first.
