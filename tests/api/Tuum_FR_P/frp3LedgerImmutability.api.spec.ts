// tests/api/Tuum_FR_P/frp3LedgerImmutability.api.spec.ts
// FRP3 — Ledger Immutability — Append-Only
//   TC1: A reversal triggered via API creates an equal and opposite linked
//        offsetting entry (without fee) — one scenario per entry in
//        testData/tuum/frp3LedgerImmutability.scenarios.json (debit, credit)
//   TC2: Reversal with fee — DEFERRED (not working on the Tuum side yet;
//        todoList.md P5). Add it as a new scenario entry when it is.
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
import { getFrp3Scenarios } from '../../../data/tuumFrp3Data';
import { CreateTransactionRequest, Transaction } from '../../../api/tuum/AccountApiClient';
import { LedgerEntry } from '../../../api/tuum/FinanceApiClient';
import { ApiResponse } from '../../../types';

// Serial: every scenario posts against the same account (ID-1048) and checks
// the balance is restored after its reversal — another scenario's posting in
// between would skew it. Note a hard failure skips the remaining scenarios
// in this file (todoList.md P1).
test.describe.serial(
  // eslint-disable-next-line playwright/valid-title -- title is built at runtime with a run timestamp
  suiteTitleWithRunTimestamp('FRP3 — Ledger Immutability — Append-Only'),
  () => {
    for (const scenario of getFrp3Scenarios()) {
      test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
        await setTestInfo({
          description:
            'FRP3 TC1: posts a transaction, reverses it via API, and verifies the reversal is an equal ' +
            'and opposite linked offsetting entry: linked to the original both ways, funds fully restored, ' +
            'the original ledger pair left untouched (append-only), and the reversal ledger pair the mirror ' +
            'of the original (same amount, debit/credit GL accounts swapped).',
          severity: 'critical',
          feature: Features.TUUM_LEDGER_IMMUTABILITY,
          story:
            'FRP3 TC1 — Reversal creates an equal and opposite linked offsetting entry (without fee)',
          tags: [Tags.TUUM_LEDGER_IMMUTABILITY, Tags.API, scenario.id],
        });

        const { accountId, transaction, reversal: reversalSpec, expected } = scenario;
        const flow = tuumApiFlows.ledgerEntry;

        await step('Authorise as employee', async () => {
          await flow.authenticate();
        });

        let original: Transaction;
        let originalLedger: ApiResponse<LedgerEntry[]> | undefined;
        let reversalBody: CreateTransactionRequest;
        let reversal: Transaction;

        await step(`Post original transaction (${transaction.transactionTypeCode})`, async () => {
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
          ({ transaction: original } = flow.assertCreateTransactionResponse(
            response,
            requestBody,
            expected.directionCode,
            accountId,
            requestId,
          ));
          await logValues({
            accountId,
            requestId,
            originalTransactionId: original.accountTransactionId,
            initialBalanceAmount: original.initialBalanceAmount,
            amount: original.amount,
            directionCode: original.directionCode,
          });
          await logAttachment('Create transaction response (original)', response.data);
        });

        await step('Fetch finance-api ledger entries for the original', async () => {
          originalLedger = await flow.waitForLedgerEntries(original.accountTransactionId, {
            transactionCreatedDTime: original.createdDTime,
          });
          flow.assertLedgerEntries(originalLedger, original.accountTransactionId, {
            amount: original.amount,
            currencyCode: original.currencyCode,
            details: original.details ?? null,
            glAccounts: expected.ledger.original,
          });
          await logValues({
            originalTransactionId: original.accountTransactionId,
            entries: originalLedger.data.length,
          });
          await logAttachment('Finance ledger entries response (original)', originalLedger.data);
        });

        await step(
          `Reverse the original via API (${reversalSpec.transactionTypeCode})`,
          async () => {
            const requestId = randomUUID();
            reversalBody = flow.buildReversalRequest(original, reversalSpec.transactionTypeCode);
            const response = await flow.postReversal(accountId, reversalBody, requestId);
            reversal = flow.assertReversalResponse(response, reversalBody, {
              accountId,
              directionCode: expected.reversalDirectionCode,
            });
            await logValues({
              requestId,
              reversalTransactionId: reversal.accountTransactionId,
              reversedTransactionId: reversal.reversedTransactionId,
              reversalAmount: reversal.amount,
              reversalDirectionCode: reversal.directionCode,
              reversalInitialBalanceAmount: reversal.initialBalanceAmount,
            });
            await logAttachment('Create transaction response (reversal)', response.data);
          },
        );

        await step('Fetch account balances (funds fully restored)', async () => {
          const response = await flow.getAccountBalances(accountId);
          flow.assertAccountBalances(response, accountId, {
            balanceAmount: original.initialBalanceAmount,
            currencyCode: original.currencyCode,
          });
          flow.assertBalanceRestoredByReversal(response, original, reversal);
          await logValues({
            accountId,
            expectedBalanceAmount: original.initialBalanceAmount,
            actualBalanceAmount: response.data.find((b) => b.currencyCode === original.currencyCode)
              ?.balanceAmount,
          });
          await logAttachment('Account balances response (after reversal)', response.data);
        });

        await step('View the original transaction (now flagged as reversed)', async () => {
          const response = await flow.viewTransactionDetails(original.accountTransactionId);
          flow.assertTransactionDetails(response, original, {
            accountId,
            directionCode: expected.directionCode,
            amount: original.amount,
            currencyCode: original.currencyCode,
          });
          flow.assertOriginalMarkedReversed(response, reversal.accountTransactionId);
          await logValues({
            originalTransactionId: original.accountTransactionId,
            reversed: response.data?.reversed,
            reversedByTransactionId: response.data?.reversedByTransactionId,
          });
          await logAttachment('Transaction details response (original)', response.data);
        });

        await step('View the reversal transaction (linked to the original)', async () => {
          const response = await flow.viewTransactionDetails(reversal.accountTransactionId);
          flow.assertReversalDetails(response, reversal, original.accountTransactionId);
          await logValues({
            reversalTransactionId: reversal.accountTransactionId,
            reversedTransactionId: response.data?.reversedTransactionId,
          });
          await logAttachment('Transaction details response (reversal)', response.data);
        });

        await step(
          'Re-fetch the original ledger entries (unchanged after reversal — append-only)',
          async () => {
            const response = await flow.waitForLedgerEntries(original.accountTransactionId, {
              transactionCreatedDTime: original.createdDTime,
            });
            flow.assertLedgerEntriesUnchanged(
              response,
              originalLedger,
              'Original ledger after reversal',
            );
            await logValues({
              originalTransactionId: original.accountTransactionId,
              entries: response.data?.length,
            });
            await logAttachment(
              'Finance ledger entries response (original, after reversal)',
              response.data,
            );
          },
        );

        // Last on purpose: a hard failure here (0 entries, or not the mirror of
        // the original) is a genuine Tuum defect, and running it last means the
        // steps above still report their results. Single query, no polling —
        // the user's decision (F3-4), unlike the other ledger lookups.
        await step(
          'Fetch finance-api ledger entries for the reversal (mirror of the original)',
          async () => {
            const response = await flow.getLedgerEntriesForTransaction(
              reversal.accountTransactionId,
            );
            flow.assertReversalLedgerMirrorsOriginal(
              response,
              reversal.accountTransactionId,
              originalLedger,
              {
                amount: reversalBody.money.amount,
                currencyCode: reversalBody.money.currencyCode,
                glAccounts: expected.ledger.reversal,
              },
            );
            await logValues({
              reversalTransactionId: reversal.accountTransactionId,
              entries: response.data?.length,
              expectedAmount: reversalBody.money.amount,
            });
            await logAttachment('Finance ledger entries response (reversal)', response.data);
          },
        );
      });
    }
  },
);
