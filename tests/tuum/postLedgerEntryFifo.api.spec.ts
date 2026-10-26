import { test } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { getLedgerEntryFifoScenarios } from '../../data/tuumLedgerEntryFifoData';
import { DispatchedTransaction } from '../../flows/tuum/PostLedgerEntryFlow';

test.describe('Tuum API — Post Ledger Entry FIFO Ordering', () => {
  const scenarios = getLedgerEntryFifoScenarios();

  for (const scenario of scenarios) {
    test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
      // Default 30s timeout isn't enough headroom once the dispatch stagger
      // itself (transactions.length * gapMs) starts approaching 20s+.
      test.setTimeout(90_000);

      await setTestInfo({
        description:
          'Proves FIFO ordering by dispatching transactions with a small, deliberate delay ' +
          "(gapMs) between each request's start — large enough to establish a known, intended " +
          'submission order, while still leaving multiple requests in flight concurrently (a true ' +
          'zero-gap burst would leave no reliable ground truth to compare against, since network- ' +
          'level arrival order can differ from dispatch order). That known dispatch order is then ' +
          'compared against filingCode, a server-assigned, strictly-increasing sequence field ' +
          'returned on every transaction response, re-sorted into recorded order. If sorting by ' +
          'filingCode reproduces the exact dispatch order, the server processed these submissions ' +
          'in true FIFO order; any mismatch is direct evidence it did not. createdDTime (a separate ' +
          'server timestamp) is logged as a secondary cross-check only, never asserted on directly.',
        severity: 'critical',
        feature: Features.TUUM_LEDGER_ENTRY,
        story: 'Post ledger entry — FIFO ordering',
        tags: [Tags.TUUM_LEDGER_ENTRY, Tags.API, scenario.id],
      });

      const { accountId, gapMs, transactions, valueDate } = scenario;
      const flow = tuumApiFlows.ledgerEntry;

      await step('Authorise as employee', async () => {
        await flow.authenticate();
      });

      let dispatched: DispatchedTransaction[] = [];

      await step(
        `Dispatch ${transactions.length} transactions with a ${gapMs}ms stagger`,
        async () => {
          dispatched = await flow.postOutgoingFundsStaggered(
            accountId,
            transactions,
            gapMs,
            valueDate,
          );
        },
      );

      await step(
        'Assert the server recorded the transactions in FIFO (dispatch) order',
        async () => {
          flow.assertFifoOrder(dispatched);
        },
      );

      await step('Assert each posted transaction matches its request', async () => {
        flow.assertAllTransactionsMatchRequests(dispatched, transactions);
      });
    });
  }
});
