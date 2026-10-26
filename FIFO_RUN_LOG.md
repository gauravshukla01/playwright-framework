# FIFO Test — Run Log

Running record of every `postLedgerEntryFifo.api.spec.ts` execution, kept so
failures can eventually be checked for a time-of-day / environment-load
correlation. `Fired At` is the server's own `createdDTime` for the
first-dispatched entry (added to the test's summary log after several runs
had already happened without it — those are marked "Not captured" rather
than guessed).

See `FIFO_ORDERING_FINDINGS.md` for the methodology write-up and its
caveats (dispatch-order-vs-arrival-order ambiguity, small sample sizes,
possible client/network confounds — the conclusions below should be read
alongside those limitations, not as a settled root cause).

| Scenario | Gap | Result | Fired At |
|---|---|---|---|
| 10-count | 20ms | Fail | Not captured |
| 10-count | 100ms (1st) | Fail | Not captured |
| 10-count | 100ms (2nd) | Fail | Not captured |
| 10-count | 112ms | Pass | Not captured |
| 10-count | 125ms | Pass | Not captured |
| 10-count | 150ms | Pass | Not captured |
| 10-count | 200ms | Pass | Not captured |
| 10-count | 100ms (3rd) | Fail | 2026-09-23T09:11:03.067Z |
| 10-count | 100ms (4th) | Pass | 2026-09-23T09:15:44.615Z |
| 100-count | 100ms (1st) | Fail | Not captured |
| 100-count | 100ms (2nd) | Pass | Not captured |
| 100-count | 100ms (3rd) | Pass | Not captured |
| 200-count | 100ms (1st) | Pass | Not captured |
| 200-count | 100ms (2nd) | Pass | Not captured |
| 200-count | 100ms (3rd) | Fail | 2026-09-24T09:05:22.517Z |
| 200-count | 100ms (4th) | Pass | 2026-09-24T09:06:59.218Z |
| 200-count | 100ms (5th) | Pass | 2026-09-24T16:56:48.661Z |
| *— `valueDate` fix applied 2026-10-05: see note below —* | | | |
| 10-count | 100ms (5th) | Pass | 2026-10-05T11:01:51.458Z |
| 100-count | 100ms (4th) | Pass | 2026-10-05T16:43:25.677Z |
| 100-count | 100ms (5th) | Fail | 2026-10-06T15:38:04.848Z |
| 100-count | 100ms (6th) | Pass | 2026-10-06T15:39:53.520Z |

**2026-10-05 fix:** earlier runs relied on `postOutgoingFunds` defaulting
`valueDate` to this sandbox's local system clock (`new Date()`), which had
drifted out of sync with Tuum's actual server business date — this caused
`err.valueDateTooEarlyByRules` failures unrelated to FIFO ordering at all
(confirmed live via a raw-response debug log). Fixed by making `valueDate`
an explicit, user-set field on each FIFO scenario (confirm Tuum's current
business date and update the `valueDate` field in
`postLedgerEntryFifo10/100/200.scenarios.json` before each run). Rows
above this fix reflect the old (buggy) default; rows below reflect the
corrected behavior — the Fail on 2026-10-06 is a genuine FIFO-ordering
result (the known gapMs:100 unreliable zone), not a recurrence of the
date bug.

Append new rows here after each future run — don't renumber/reorder past
entries.
