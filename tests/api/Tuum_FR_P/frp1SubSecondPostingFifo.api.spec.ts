// tests/api/Tuum_FR_P/frp1SubSecondPostingFifo.api.spec.ts
// FRP1 — Sub-Second Real-Time Posting with Precise Timestamps and FIFO
//   TC1: Single debit posting reflecting ledger details with sub-second latency
//   TC2: Single credit posting reflecting ledger details with sub-second latency
import { randomUUID } from 'crypto';
import { test } from '../../../fixtures';
import {
  setTestInfo,
  step,
  logValues,
  logAttachment,
  suiteTitleWithRunTimestamp,
  Tags,
  Features,
} from '../../../utils/allureUtils';
import { getFrp1Scenarios } from '../../../data/tuumFrp1Data';
import { CreateTransactionRequest } from '../../../api/tuum/AccountApiClient';

// Order follows the scenarios JSON: the deposit (TC2) runs before the debit
// (TC1) so a freshly funded account doesn't fail TC1 on insufficient funds.
// Serial: TC1 and TC2 post against the same account and each
// reconciles the balance against its own initialBalanceAmount — running
// them in parallel workers lets one test's transaction land in between the
// other's create-transaction and balance-check, skewing the expected delta.
test.describe.serial(
  // eslint-disable-next-line playwright/valid-title -- title is built at runtime with a run timestamp
  suiteTitleWithRunTimestamp(
    'FRP1 — Sub-Second Real-Time Posting with Precise Timestamps and FIFO',
  ),
  () => {
    const scenarios = getFrp1Scenarios();

    for (const scenario of scenarios) {
      test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
        await setTestInfo({
          description:
            'FRP1: posts a single transaction (debit or credit) and verifies it end-to-end ' +
            'across account-api (create + view) and finance-api (the posted double-entry ' +
            'ledger pair, posted to the GL accounts expected for its transaction type code), ' +
            'including that the account balance reconciles against the ' +
            "transaction's own initialBalanceAmount.",
          severity: 'critical',
          feature: Features.TUUM_LEDGER_ENTRY,
          story: 'FRP1 — Sub-second posting (single debit/credit)',
          tags: [Tags.TUUM_LEDGER_ENTRY, Tags.API, scenario.id],
        });

        const { accountId, transaction, expected } = scenario;
        const flow = tuumApiFlows.ledgerEntry;

        await step('Authorise as employee', async () => {
          await flow.authenticate();
        });

        let transactionId: string;
        let initialBalanceAmount: number;
        let createdTransaction: ReturnType<
          typeof flow.assertCreateTransactionResponse
        >['transaction'];

        await step('Post transaction (create ledger entry)', async () => {
          const sourceRef = randomUUID();
          const requestId = randomUUID();
          // Generated here (not left to postOutgoingFunds's own defaults) so
          // this exact requestBody — the one asserted against below — is
          // what's actually sent; otherwise the flow's internal defaulting
          // would silently diverge from what this test thinks it sent.
          // valueDate = today (UTC, sender's clock) via the shared
          // flow.todayUtc(), the same rule FRP2/FRP3 use (matches the
          // collection-level todayDate pre-request script). Tuum rejects it if
          // it's before the account's activationDate
          // (err.valueDateBeforeAccountActivationDate) or too far behind its
          // own business date (err.valueDateTooEarlyByRules).
          const requestBody: CreateTransactionRequest = {
            ...transaction,
            source: { ...transaction.source!, sourceRef },
            referenceNumber: randomUUID(),
            uniqueIdentifier: randomUUID(),
            valueDate: flow.todayUtc(),
            // Sent (as the source collection does with {{$isoTimestamp}}) so
            // the create check can assert the echo matches what was sent.
            transactionDTime: flow.nowIso(),
          };
          const response = await flow.postOutgoingFunds(accountId, requestBody, requestId);
          ({
            accountTransactionId: transactionId,
            initialBalanceAmount,
            transaction: createdTransaction,
          } = flow.assertCreateTransactionResponse(
            response,
            requestBody,
            expected.directionCode,
            accountId,
            requestId,
          ));
          await logValues({
            accountId,
            sourceRef,
            requestId,
            transactionId,
            initialBalanceAmount,
            expectedDirectionCode: expected.directionCode,
            requestedAmount: requestBody.money.amount,
            requestedCurrencyCode: requestBody.money.currencyCode,
          });
          await logAttachment('Create transaction response', response.data);
        });

        await step('View transaction details', async () => {
          const response = await flow.viewTransactionDetails(transactionId);
          flow.assertTransactionDetails(response, createdTransaction, {
            accountId,
            directionCode: expected.directionCode,
            amount: transaction.money.amount,
            currencyCode: transaction.money.currencyCode,
          });
          await logValues({
            transactionId,
            accountId,
            directionCode: expected.directionCode,
            ...transaction.money,
          });
          await logAttachment('Transaction details response', response.data);
        });

        await step('Fetch account balances and reconcile against the transaction', async () => {
          const response = await flow.getAccountBalances(accountId);
          const expectedBalanceAmount =
            expected.directionCode === 'OUT'
              ? initialBalanceAmount - transaction.money.amount
              : initialBalanceAmount + transaction.money.amount;
          flow.assertAccountBalances(response, accountId, {
            balanceAmount: expectedBalanceAmount,
            currencyCode: transaction.money.currencyCode,
          });
          await logValues({
            accountId,
            initialBalanceAmount,
            transactionAmount: transaction.money.amount,
            direction: expected.directionCode,
            expectedBalanceAmount,
            actualBalanceAmount: response.data.find(
              (b) => b.currencyCode === transaction.money.currencyCode,
            )?.balanceAmount,
          });
          await logAttachment('Account balances response', response.data);
        });

        await step(
          'Fetch finance-api ledger entries for the transaction (amounts + GL accounts)',
          async () => {
            const response = await flow.waitForLedgerEntries(transactionId, {
              transactionCreatedDTime: createdTransaction.createdDTime,
            });
            flow.assertLedgerEntries(response, transactionId, {
              amount: transaction.money.amount,
              currencyCode: transaction.money.currencyCode,
              details: createdTransaction.details ?? null,
              glAccounts: expected.ledger,
            });
            await logValues({
              transactionId,
              entries: response.data?.length,
              expectedAmount: transaction.money.amount,
              expectedCurrencyCode: transaction.money.currencyCode,
              expectedDebitGl: expected.ledger.debit.accountCode,
              expectedCreditGl: expected.ledger.credit.accountCode,
            });
            await logAttachment('Finance ledger entries response', response.data);
          },
        );
      });
    }
  },
);
