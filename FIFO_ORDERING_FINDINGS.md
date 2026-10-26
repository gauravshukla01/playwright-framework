# FIFO Ordering — Approach & Findings

## Objective

Determine whether Tuum's account-api (`POST /api/v5/accounts/{accountId}/transactions`)
processes ledger-entry postings against the same account in the order they
were submitted (FIFO), and if not always, under what conditions ordering
holds.

## Why this needed a deliberate design, not just concurrent calls

Firing all requests truly simultaneously (`Promise.all` with zero gap) gives
no ground truth to check against — independent HTTP connections have no
guaranteed arrival order at the server, so a scrambled result wouldn't prove
a FIFO violation (there's nothing to violate). To make FIFO testable,
requests were dispatched **in a known order with a deliberate gap between
dispatch starts** — large enough to give a meaningful "expected order,"
small enough that requests still overlap in flight rather than running
fully sequentially.

## Mechanism

- **Dispatch:** `PostLedgerEntryFlow.postOutgoingFundsStaggered(accountId, transactions[], gapMs)`
  fires each transaction in loop order, awaiting only a `gapMs` delay
  between dispatch *starts* (not between completions), so multiple
  requests are genuinely in flight concurrently.
- **Ground truth for recorded order:** `filingCode`, a server-assigned
  field confirmed (via a real debug call) to be populated synchronously on
  the transaction-creation response itself — no follow-up search/list call
  needed. It was also observed to track `accountTransactionId`'s own
  numeric sequence exactly across every run.
- **Assertion:** `PostLedgerEntryFlow.assertFifoOrder` sorts the captured
  responses by `filingCode` and asserts that order matches dispatch order.
- **Test setup:** 10 transactions per run, dedicated test account
  (`ID-1086`), each transaction tagged with a per-run-unique `details`
  suffix for manual traceability only (not used by the assertion itself).
- **Method:** binary search on `gapMs` between a known-failing value (20ms)
  and a known-passing value (200ms), re-confirming boundary results before
  trusting them (100ms was run twice to rule out a fluke).

## Results

| Gap | Result |
|---|---|
| 20ms | Fail (heavily scrambled) |
| 100ms | Fail (heavily scrambled) — confirmed twice |
| 112ms | Pass |
| 125ms | Pass |
| 150ms | Pass |
| 200ms | Pass |

## Conclusion

The account-api does **not** guarantee FIFO ordering when ledger entries
are submitted in rapid succession — at dispatch gaps of 100ms or below,
the server recorded entries in a materially different order than they
were submitted (not near-misses; e.g. dispatch order `[0,1,2,...,9]` came
back as `[3,0,9,4,8,5,1,2,7,6]`). Once the gap between submissions reached
roughly **110–125ms, ordering became reliable** across multiple repeated
runs (112ms, 125ms, 150ms, 200ms all passed cleanly with sequential
`accountTransactionId`/`filingCode` values matching dispatch order
exactly).

## Caveats

- The exact breakpoint (somewhere between 100ms and 112ms) wasn't narrowed
  further — at that resolution we'd likely be measuring network/processing
  jitter rather than a fixed server-enforced threshold, so a more precise
  number wouldn't necessarily be stable run-to-run.
- This was measured against one dev environment, one account, at one
  point in time — it reflects observed behavior, not a documented
  guarantee from Tuum.
- Results were single-run at each gap except 100ms (confirmed twice) and
  125ms (confirmed twice after one unrelated transient infra error) — the
  20ms/150ms/200ms results have not been independently re-confirmed.

## Backlog — not yet implemented

- **Balance-chain consistency check**, as a separate spec from the FIFO
  ordering test. Each `Transaction` response includes `initialBalanceAmount`
  (the account's balance immediately before that specific posting) — if
  sorted by `filingCode`, consecutive entries should chain:
  `entry[i].initialBalanceAmount + entry[i].amount == entry[i+1].initialBalanceAmount`.
  A break in that chain would be independent evidence of a balance-update
  race (lost/overlapping updates), a different failure mode than the
  `filingCode`/`createdDTime` sequence-numbering disagreement this doc
  already covers. Needs: `initialBalanceAmount` added to `Transaction`
  (`AccountApiClient.ts`) and `DispatchedTransaction`
  (`PostLedgerEntryFlow.ts`), a new `assertBalanceChainConsistent()`
  helper, and a new spec file (e.g.
  `tests/tuum/postLedgerEntryBalanceChain.api.spec.ts`) reusing the same
  `postLedgerEntryFifo*.scenarios.json` data and
  `postOutgoingFundsStaggered()` dispatch mechanism, kept deliberately
  separate from `postLedgerEntryFifo.api.spec.ts` per the same
  one-concern-per-spec rule used throughout this framework.
