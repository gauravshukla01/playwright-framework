// tests/api/Tuum_FR_P/frp2ExactlyOnceIdempotency.api.spec.ts
// FRP2 — Exactly-Once Processing Idempotency
//   TC1: Duplicate transaction rejection — replaying a debit/credit with the
//        same x-request-id, referenceNumber, uniqueIdentifier, sourceRef,
//        valueDate and transactionDTime returns the original transaction and
//        posts nothing new (balances and ledger entries are unchanged)
//   TC2: New transactions with a unique x-request-id are posted successfully
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
import {
  getFrp2DuplicateScenarios,
  getFrp2UniqueRequestIdScenarios,
} from '../../../data/tuumFrp2Data';
import {
  AccountBalance,
  CreateTransactionRequest,
  Transaction,
} from '../../../api/tuum/AccountApiClient';
import { LedgerEntry } from '../../../api/tuum/FinanceApiClient';
import { ApiResponse } from '../../../types';

// Serial: every scenario posts against the same account (ID-1048) and
// reconciles its balance step by step — another scenario's posting landing
// in between would skew the expected balance and the "unchanged" checks.
test.describe.serial(
  // eslint-disable-next-line playwright/valid-title -- title is built at runtime with a run timestamp
  suiteTitleWithRunTimestamp('FRP2 — Exactly-Once Processing Idempotency'),
  () => {
    // ─── TC1: duplicate transaction is not posted twice ───────

    for (const scenario of getFrp2DuplicateScenarios()) {
      test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
        await setTestInfo({
          description:
            'FRP2 TC1: posts a transaction, then replays the identical request (same x-request-id, ' +
            'referenceNumber, uniqueIdentifier, sourceRef, valueDate and transactionDTime). The replay ' +
            'must return the original transaction unchanged, and the account balance and finance-api ' +
            'ledger entries must be identical before and after the replay — nothing posted twice.',
          severity: 'critical',
          feature: Features.TUUM_IDEMPOTENCY,
          story: 'FRP2 TC1 — Duplicate transaction rejection',
          tags: [Tags.TUUM_IDEMPOTENCY, Tags.API, scenario.id],
        });

        const { accountId, transaction, expected } = scenario;
        const flow = tuumApiFlows.ledgerEntry;

        await step('Authorise as employee', async () => {
          await flow.authenticate();
        });

        // Built once and sent twice — the replay must be the identical request.
        const requestId = randomUUID();
        const requestBody: CreateTransactionRequest = {
          ...transaction,
          source: { ...transaction.source!, sourceRef: randomUUID() },
          referenceNumber: randomUUID(),
          uniqueIdentifier: randomUUID(),
          valueDate: flow.todayUtc(),
          transactionDTime: flow.nowIso(),
        };

        let originalResponse: ApiResponse<Transaction[]> | undefined;
        let transactionId: string;
        let createdTransaction: Transaction;
        let expectedBalanceAmount: number;
        let balancesBeforeReplay: ApiResponse<AccountBalance[]> | undefined;
        let ledgerBeforeReplay: ApiResponse<LedgerEntry[]> | undefined;

        await step('Post transaction (original request)', async () => {
          originalResponse = await flow.postOutgoingFunds(accountId, requestBody, requestId);
          let initialBalanceAmount: number;
          ({
            accountTransactionId: transactionId,
            initialBalanceAmount,
            transaction: createdTransaction,
          } = flow.assertCreateTransactionResponse(
            originalResponse,
            requestBody,
            expected.directionCode,
            accountId,
            requestId,
          ));
          expectedBalanceAmount =
            expected.directionCode === 'OUT'
              ? initialBalanceAmount - requestBody.money.amount
              : initialBalanceAmount + requestBody.money.amount;
          await logValues({
            accountId,
            requestId,
            transactionId,
            initialBalanceAmount,
            expectedBalanceAmount,
            referenceNumber: requestBody.referenceNumber,
            uniqueIdentifier: requestBody.uniqueIdentifier,
            sourceRef: requestBody.source?.sourceRef,
          });
          await logAttachment('Create transaction response (original)', originalResponse.data);
        });

        await step('Fetch account balances (before replay)', async () => {
          balancesBeforeReplay = await flow.getAccountBalances(accountId);
          flow.assertAccountBalances(balancesBeforeReplay, accountId, {
            balanceAmount: expectedBalanceAmount,
            currencyCode: requestBody.money.currencyCode,
          });
          await logValues({
            accountId,
            expectedBalanceAmount,
            actualBalanceAmount: balancesBeforeReplay.data.find(
              (b) => b.currencyCode === requestBody.money.currencyCode,
            )?.balanceAmount,
          });
          await logAttachment(
            'Account balances response (before replay)',
            balancesBeforeReplay.data,
          );
        });

        await step('Fetch finance-api ledger entries (before replay)', async () => {
          ledgerBeforeReplay = await flow.waitForLedgerEntries(transactionId, {
            transactionCreatedDTime: createdTransaction.createdDTime,
          });
          flow.assertLedgerEntries(ledgerBeforeReplay, transactionId, {
            amount: requestBody.money.amount,
            currencyCode: requestBody.money.currencyCode,
            details: createdTransaction.details ?? null,
          });
          await logValues({ transactionId, entries: ledgerBeforeReplay.data.length });
          await logAttachment(
            'Finance ledger entries response (before replay)',
            ledgerBeforeReplay.data,
          );
        });

        await step('View transaction details', async () => {
          const response = await flow.viewTransactionDetails(transactionId);
          flow.assertTransactionDetails(response, createdTransaction, {
            accountId,
            directionCode: expected.directionCode,
            amount: requestBody.money.amount,
            currencyCode: requestBody.money.currencyCode,
          });
          await logValues({ transactionId, accountId, directionCode: expected.directionCode });
          await logAttachment('Transaction details response', response.data);
        });

        await step(
          'Replay the identical request (same x-request-id and idempotency keys)',
          async () => {
            const replayRequestId = requestId;
            const replayResponse = await flow.postOutgoingFunds(
              accountId,
              requestBody,
              replayRequestId,
            );
            flow.assertReplayedTransactionResponse(
              replayResponse,
              originalResponse,
              replayRequestId,
              requestId,
            );
            await logValues({
              replayRequestId,
              originalAccountTransactionId: transactionId,
              replayAccountTransactionId: replayResponse.data?.[0]?.accountTransactionId,
            });
            await logAttachment('Create transaction response (replay)', replayResponse.data);
          },
        );

        await step('Fetch account balances after replay (balance moved once only)', async () => {
          const response = await flow.getAccountBalances(accountId);
          flow.assertAccountBalances(response, accountId, {
            balanceAmount: expectedBalanceAmount,
            currencyCode: requestBody.money.currencyCode,
          });
          flow.assertResponseUnchanged(response, balancesBeforeReplay, 'FetchBalances2');
          await logValues({
            accountId,
            expectedBalanceAmount,
            actualBalanceAmount: response.data.find(
              (b) => b.currencyCode === requestBody.money.currencyCode,
            )?.balanceAmount,
          });
          await logAttachment('Account balances response (after replay)', response.data);
        });

        await step(
          'Fetch finance-api ledger entries after replay (no second posting)',
          async () => {
            const response = await flow.waitForLedgerEntries(transactionId, {
              transactionCreatedDTime: createdTransaction.createdDTime,
            });
            flow.assertLedgerEntries(response, transactionId, {
              amount: requestBody.money.amount,
              currencyCode: requestBody.money.currencyCode,
              details: createdTransaction.details ?? null,
            });
            flow.assertLedgerEntriesUnchanged(response, ledgerBeforeReplay, 'Finance event2');
            await logValues({ transactionId, entries: response.data.length });
            await logAttachment('Finance ledger entries response (after replay)', response.data);
          },
        );
      });
    }

    // ─── TC2: unique x-request-id posts successfully ──────────

    for (const scenario of getFrp2UniqueRequestIdScenarios()) {
      test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
        await setTestInfo({
          description:
            'FRP2 TC2: posts new transactions, each with a unique x-request-id and fresh ' +
            'referenceNumber / uniqueIdentifier, and verifies each is created successfully.',
          severity: 'critical',
          feature: Features.TUUM_IDEMPOTENCY,
          story: 'FRP2 TC2 — New transaction with a unique x-request-id',
          tags: [Tags.TUUM_IDEMPOTENCY, Tags.API, scenario.id],
        });

        const { accountId } = scenario;
        const flow = tuumApiFlows.ledgerEntry;

        await step('Authorise as employee', async () => {
          await flow.authenticate();
        });

        for (const [index, { transaction, expected }] of scenario.transactions.entries()) {
          await step(
            `Post ${transaction.transactionTypeCode} with a unique x-request-id (#${index + 1})`,
            async () => {
              const requestId = randomUUID();
              const requestBody: CreateTransactionRequest = {
                ...transaction,
                source: { ...transaction.source!, sourceRef: randomUUID() },
                referenceNumber: randomUUID(),
                uniqueIdentifier: randomUUID(),
                valueDate: flow.todayUtc(),
                transactionDTime: flow.nowIso(),
              };
              const response = await flow.postOutgoingFunds(accountId, requestBody, requestId);
              const { accountTransactionId, initialBalanceAmount } =
                flow.assertCreateTransactionResponse(
                  response,
                  requestBody,
                  expected.directionCode,
                  accountId,
                  requestId,
                );
              await logValues({
                accountId,
                requestId,
                accountTransactionId,
                initialBalanceAmount,
                transactionTypeCode: requestBody.transactionTypeCode,
                amount: requestBody.money.amount,
              });
              await logAttachment(`Create transaction response (#${index + 1})`, response.data);
            },
          );
        }
      });
    }
  },
);
