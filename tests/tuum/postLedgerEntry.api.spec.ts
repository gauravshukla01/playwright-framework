import { test, expect } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { getLedgerEntryScenarios } from '../../data/tuumLedgerEntryData';

test.describe('Tuum API — Post Ledger Entry', () => {
  const scenarios = getLedgerEntryScenarios();

  for (const scenario of scenarios) {
    test(scenario.description, async ({ tuumApiFlows }) => {
      await setTestInfo({
        description:
          'Post a ledger entry (transaction) against an account and verify it via the transaction details endpoint',
        severity: 'critical',
        feature: Features.TUUM_LEDGER_ENTRY,
        story: 'Post ledger entry',
        tags: [Tags.SMOKE, Tags.TUUM_LEDGER_ENTRY, Tags.API],
      });

      const { personId, accountId, transaction, expected } = scenario;
      const flow = tuumApiFlows.ledgerEntry;

      await step('Authorise as employee', async () => {
        await flow.authenticate();
      });

      await step('Fetch customer', async () => {
        const response = await flow.getCustomer(personId);
        expect(response.status).toBe(200);
        expect(response.data.personId).toBe(personId);
      });

      await step("Fetch person's accounts", async () => {
        const response = await flow.getPersonAccounts(personId);
        expect(response.status).toBe(200);
        expect(response.data.values.some((account) => account.accountId === accountId)).toBe(true);
      });

      await step('Fetch account details', async () => {
        const response = await flow.getAccountDetails(accountId);
        expect(response.status).toBe(200);
        expect(response.data.accountId).toBe(accountId);
      });

      let transactionId = '';

      await step('Post outgoing funds (create ledger entry)', async () => {
        const response = await flow.postOutgoingFunds(accountId, transaction);
        transactionId = flow.assertTransactionCreated(response);
      });

      await step('View transaction details', async () => {
        const response = await flow.viewTransactionDetails(transactionId);
        flow.assertTransactionMatches(response, expected);
      });
    });
  }
});
