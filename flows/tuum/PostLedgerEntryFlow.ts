// flows/tuum/PostLedgerEntryFlow.ts
import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { TuumAuthApiClient } from '../../api/tuum/TuumAuthApiClient';
import { PersonApiClient, Person } from '../../api/tuum/PersonApiClient';
import {
  AccountApiClient,
  Account,
  Transaction,
  AccountBalance,
  CreateTransactionRequest,
} from '../../api/tuum/AccountApiClient';
import { FinanceApiClient, LedgerEntry, LedgerGlPair } from '../../api/tuum/FinanceApiClient';
import { getENV } from '../../utils/envUtils';
import { reportObservation } from '../../utils/allureUtils';
import { ApiResponse, PaginatedResult } from '../../types';

export interface DispatchedTransaction {
  index: number;
  accountTransactionId: string;
  filingCode: string;
  createdDTime: string;
  amount: number;
  currencyCode: string;
}

export class PostLedgerEntryFlow {
  private readonly authClient: TuumAuthApiClient;
  private readonly personClient: PersonApiClient;
  private readonly accountClient: AccountApiClient;
  private readonly financeClient: FinanceApiClient;

  constructor(request: APIRequestContext) {
    this.authClient = new TuumAuthApiClient(request);
    this.personClient = new PersonApiClient(request);
    this.accountClient = new AccountApiClient(request);
    this.financeClient = new FinanceApiClient(request);
  }

  // ─── Auth ─────────────────────────────────────────────────

  /**
   * Logs in as the configured employee and shares the resulting token
   * with the person/account clients used later in the journey.
   */
  async authenticate(): Promise<string> {
    const env = getENV();
    const response = await this.authClient.authorise({
      username: env.TUUM_EMPLOYEE_USERNAME,
      password: env.TUUM_EMPLOYEE_PASSWORD,
    });
    expect(response.status, 'Authorise response status should be 200').toBe(200);
    expect(response.data.token, 'Authorise response should include a token').toBeTruthy();

    this.personClient.setAuthToken(response.data.token);
    this.accountClient.setAuthToken(response.data.token);
    this.financeClient.setAuthToken(response.data.token);
    return response.data.token;
  }

  // ─── Request-data helpers ─────────────────────────────────
  // Both read the sending machine's clock (no Tuum server-date lookup) —
  // the Tuum environment's date is kept aligned with it.

  /** Today's date in UTC, YYYY-MM-DD — what every posting sends as valueDate. */
  todayUtc(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** The current instant as an ISO timestamp — what every posting sends as transactionDTime. */
  nowIso(): string {
    return new Date().toISOString();
  }

  // ─── Journey steps ────────────────────────────────────────

  async getCustomer(personId: string): Promise<ApiResponse<Person>> {
    return this.personClient.getPerson(personId);
  }

  async getPersonAccounts(personId: string): Promise<ApiResponse<PaginatedResult<Account>>> {
    return this.accountClient.getPersonAccounts(personId);
  }

  async getAccountDetails(accountId: string): Promise<ApiResponse<Account>> {
    return this.accountClient.getAccount(accountId);
  }

  /**
   * Posts a ledger entry (transaction) against the account. A fresh
   * x-request-id is generated per call so retries never create duplicates,
   * unless the caller supplies its own (e.g. to assert the exact value was
   * echoed/used, as FRP1 TC1/TC2 do). referenceNumber/uniqueIdentifier are
   * likewise generated fresh per call (Standards #10 in the source Postman
   * collection) unless overridden.
   */
  async postOutgoingFunds(
    accountId: string,
    overrides: Partial<CreateTransactionRequest> = {},
    requestId: string = randomUUID(),
  ): Promise<ApiResponse<Transaction[]>> {
    const requestBody: CreateTransactionRequest = {
      transactionTypeCode: 'EXT_DEPOSIT',
      // valueDate deliberately omitted — computing it from this machine's
      // local clock (new Date()) caused err.valueDateTooEarlyByRules,
      // since this sandbox's system clock has drifted out of sync with
      // Tuum's own server date. Confirmed live: omitting valueDate lets
      // the server default it to its own current date, and the posting
      // succeeds. Pass valueDate explicitly via overrides only if a
      // scenario genuinely needs a specific value date.
      money: { amount: 2000, currencyCode: 'USD' },
      applyFee: false,
      details: 'custom credit transaction',
      source: { sourceName: 'CARD_CREDIT', sourceRef: 'ID-181262' },
      paymentServiceProviderCode: 'TUUM',
      labels: ['ACC_VIRTUAL'],
      referenceNumber: randomUUID(),
      uniqueIdentifier: randomUUID(),
      ...overrides,
    };
    return this.accountClient.createTransaction(accountId, requestBody, requestId);
  }

  /**
   * Dispatches multiple transactions against the same account with a small
   * delay between dispatch starts (not between completions) — enough gap to
   * dominate normal network jitter while still leaving requests overlapping
   * in flight, so there's a known intended order to verify FIFO against.
   */
  async postOutgoingFundsStaggered(
    accountId: string,
    transactions: CreateTransactionRequest[],
    gapMs: number,
    valueDate?: string,
  ): Promise<DispatchedTransaction[]> {
    // Shared per-run suffix so the account statement's "details" field
    // distinguishes this run's entries from earlier runs' — purely for
    // manual traceability, the FIFO assertion itself never reads it back.
    const runId = randomUUID().slice(0, 8);
    const pending: Promise<DispatchedTransaction>[] = [];

    for (let index = 0; index < transactions.length; index++) {
      const dispatchIndex = index;
      const taggedTransaction: CreateTransactionRequest = {
        ...transactions[index],
        // Scenario-level valueDate applies to the whole batch unless a
        // specific transaction already sets its own — set this to the
        // real Tuum server date before each run (this sandbox's system
        // clock isn't reliable for computing it).
        valueDate: transactions[index].valueDate ?? valueDate,
        details: transactions[index].details
          ? `${transactions[index].details}-${runId}`
          : undefined,
      };
      pending.push(
        this.postOutgoingFunds(accountId, taggedTransaction).then((response) => {
          if (
            response.status !== 200 ||
            !Array.isArray(response.data) ||
            response.data.length === 0
          ) {
            throw new Error(
              `postOutgoingFunds failed for dispatch index ${dispatchIndex}: ` +
                `status=${response.status}, data=${JSON.stringify(response.data)}`,
            );
          }
          const [created] = response.data;
          return {
            index: dispatchIndex,
            accountTransactionId: created.accountTransactionId,
            filingCode: created.filingCode,
            createdDTime: created.createdDTime,
            amount: created.amount,
            currencyCode: created.currencyCode,
          };
        }),
      );
      if (index < transactions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, gapMs));
      }
    }

    return Promise.all(pending);
  }

  async viewTransactionDetails(transactionId: string): Promise<ApiResponse<Transaction>> {
    return this.accountClient.getTransaction(transactionId);
  }

  async getAccountBalances(accountId: string): Promise<ApiResponse<AccountBalance[]>> {
    return this.accountClient.getAccountBalances(accountId);
  }

  /**
   * Looks up the double-entry ledger pair (debit + credit) posted in
   * finance-api for a given account-api transaction.
   */
  async getLedgerEntriesForTransaction(
    accountTransactionId: string,
  ): Promise<ApiResponse<LedgerEntry[]>> {
    return this.financeClient.getLedgerEntriesBySource('ACCOUNT_TRANSACTION', accountTransactionId);
  }

  /**
   * getLedgerEntriesForTransaction(), re-queried every `intervalMs` until the
   * expected number of entries is there or `timeoutMs` passes. finance-api
   * writes the ledger pair asynchronously (observed ~70 ms after the
   * account-api transaction), so an immediate lookup can find nothing.
   *
   * Whenever the first query comes back short, the delay is reported (test
   * annotation + Allure attachment) — how long the test had to poll, and the
   * server-side lag (ledger createdDtime − transaction createdDTime, both
   * Tuum timestamps) when the transaction's createdDTime is passed in — so
   * the typical finance-api delay is visible run over run. On timeout the
   * last (short) response is returned and the caller's assertions fail hard.
   */
  async waitForLedgerEntries(
    accountTransactionId: string,
    options: {
      transactionCreatedDTime?: string;
      expectedCount?: number;
      intervalMs?: number;
      timeoutMs?: number;
    } = {},
  ): Promise<ApiResponse<LedgerEntry[]>> {
    const {
      transactionCreatedDTime,
      expectedCount = 2,
      intervalMs = 250,
      timeoutMs = 5000,
    } = options;
    const startedAt = Date.now();
    let attempts = 0;
    let response: ApiResponse<LedgerEntry[]>;
    for (;;) {
      attempts++;
      response = await this.getLedgerEntriesForTransaction(accountTransactionId);
      const found = Array.isArray(response.data) && response.data.length >= expectedCount;
      // Only an empty-but-successful lookup is worth retrying; an error status won't fix itself.
      if (found || response.status !== 200 || Date.now() - startedAt >= timeoutMs) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    if (attempts > 1) {
      const waitedMs = Date.now() - startedAt;
      const found = Array.isArray(response.data) && response.data.length >= expectedCount;
      const ledgerCreated = response.data?.[0]?.createdDtime;
      const serverLag =
        found && ledgerCreated && transactionCreatedDTime
          ? ` Server-side lag: ledger createdDtime ${ledgerCreated} − transaction createdDTime ${transactionCreatedDTime} = ` +
            `${Date.parse(ledgerCreated) - Date.parse(transactionCreatedDTime)} ms.`
          : '';
      const outcome = found
        ? `appeared after ${attempts} queries / ${waitedMs} ms of polling (every ${intervalMs} ms).`
        : `were still missing after ${attempts} queries / ${waitedMs} ms (timeout ${timeoutMs} ms, ` +
          `last response: ${response.data?.length ?? 0} entries, status ${response.status}).`;
      await reportObservation(
        'finance-api ledger delay',
        `Ledger entries for ${accountTransactionId} were not there on the first query — they ${outcome}${serverLag}`,
      );
    }
    return response;
  }

  // ─── Assertion helpers ────────────────────────────────────

  /**
   * Asserts the transaction was created and returns its ID, so the caller
   * can feed it into viewTransactionDetails() without hardcoding anything.
   */
  assertTransactionCreated(response: ApiResponse<Transaction[]>): string {
    expect(response.status, 'Create transaction response status should be 200').toBe(200);
    expect(
      response.data.length,
      'Create transaction response should include at least one transaction',
    ).toBeGreaterThan(0);
    const [transaction] = response.data;
    expect(
      transaction.accountTransactionId,
      'Created transaction should have an accountTransactionId',
    ).toBeTruthy();
    return transaction.accountTransactionId;
  }

  assertTransactionMatches(
    response: ApiResponse<Transaction>,
    expected: { accountId: string; amount: number; currencyCode: string },
  ): void {
    expect(response.status, 'Get transaction response status should be 200').toBe(200);
    expect(response.data.accountId, `Transaction accountId should be "${expected.accountId}"`).toBe(
      expected.accountId,
    );
    expect(response.data.amount, `Transaction amount should be ${expected.amount}`).toBe(
      expected.amount,
    );
    expect(
      response.data.currencyCode,
      `Transaction currencyCode should be "${expected.currencyCode}"`,
    ).toBe(expected.currencyCode);
  }

  /**
   * Asserts the server recorded the dispatched transactions in the same
   * order they were dispatched, using filingCode (a server-assigned,
   * strictly-increasing marker) as the ground truth for recorded order.
   * createdDTime (a separate, independent server timestamp on the same
   * response) is sorted too, purely as a cross-check — logged, not
   * asserted on, so a disagreement between the two is visible without
   * failing the test for a reason other than the filingCode order itself.
   */
  assertFifoOrder(dispatched: DispatchedTransaction[]): void {
    const dispatchOrder = dispatched.map((entry) => entry.index);

    const sortedByFilingCode = [...dispatched].sort((a, b) =>
      a.filingCode < b.filingCode ? -1 : a.filingCode > b.filingCode ? 1 : 0,
    );
    const recordedOrder = sortedByFilingCode.map((entry) => entry.index);

    const sortedByCreatedDTime = [...dispatched].sort((a, b) =>
      a.createdDTime < b.createdDTime ? -1 : a.createdDTime > b.createdDTime ? 1 : 0,
    );
    const createdDTimeOrder = sortedByCreatedDTime.map((entry) => entry.index);

    const sequence = sortedByFilingCode.map((entry, recordedPosition) => ({
      recordedPosition,
      dispatchIndex: entry.index,
      inSequence: entry.index === recordedPosition,
    }));

    // Approximation of "when this batch was fired" — the createdDTime of the
    // first-dispatched entry (index 0), not an exact client-side timestamp.
    const firedAt = dispatched.find((entry) => entry.index === 0)?.createdDTime;

    // eslint-disable-next-line no-console
    console.log(
      'FIFO CHECK SUMMARY:',
      JSON.stringify(
        {
          firedAt,
          totalDispatched: dispatched.length,
          fifoHeld: JSON.stringify(recordedOrder) === JSON.stringify(dispatchOrder),
          createdDTimeAgreesWithFilingCode:
            JSON.stringify(createdDTimeOrder) === JSON.stringify(recordedOrder),
          sequence,
        },
        null,
        2,
      ),
    );

    expect(
      recordedOrder,
      'Overall FIFO check: transactions should be recorded (ordered by server-assigned filingCode) in the same order they were dispatched',
    ).toEqual(dispatchOrder);
  }

  /**
   * Asserts each dispatched transaction's response actually matches what
   * was requested — a correctness check independent of ordering. Only the
   * fields that genuinely vary per entry (amount, currencyCode) are
   * checked; fields constant across the whole batch (accountId,
   * transactionTypeCode, ...) aren't, since a per-entry check there would
   * only ever catch a bug in how the call itself was made, not a real
   * server-side data issue.
   */
  assertAllTransactionsMatchRequests(
    dispatched: DispatchedTransaction[],
    transactions: CreateTransactionRequest[],
  ): void {
    for (const entry of dispatched) {
      const expected = transactions[entry.index];
      // Prefer the transaction's own human-readable label (e.g.
      // "FIFO-TEST-1") — the same one visible in the account statement —
      // over a raw dispatch index, falling back to a 1-based posting
      // number only if a scenario genuinely omits `details`.
      const label = expected.details ?? `posting #${entry.index + 1}`;
      // Per-field checks (rather than one bundled toEqual) so each
      // comparison shows its own pass/fail tick in the report.
      expect(
        entry.amount,
        `${label}: response amount should match request (${expected.money.amount})`,
      ).toBe(expected.money.amount);
      expect(
        entry.currencyCode,
        `${label}: response currencyCode should match request (${expected.money.currencyCode})`,
      ).toBe(expected.money.currencyCode);
    }
  }

  // ─── FRP1 assertion helpers ───────────────────────────────
  // Full parity with the source Postman scripts' pm.test() blocks — every
  // check the collection made is ported here as its own expect(), not just
  // the fields that echo the request body. This is denser than the earlier
  // "one composite check per step" version, but nothing from the source
  // collection is silently dropped.

  private isValidDateString(value: string | null | undefined): boolean {
    return !!value && !isNaN(Date.parse(value));
  }

  /**
   * Full-parity composite check for the create-transaction response
   * (FRP1 TC1/TC2) — ports every pm.test() from the source Postman
   * "Transactions Funds Debit/Credit" script. directionCode can't be
   * derived from the request body alone, so the caller supplies it (same
   * gap the Postman script covered with its own hardcoded
   * transactionTypeCode -> direction map).
   * Returns the new transaction's id, initialBalanceAmount, and the full
   * transaction object — the latter so assertTransactionDetails() can
   * assert the GET-by-id response echoes THIS create response, which is
   * the TS equivalent of the source script's snapshot_<id>/collection-
   * variable comparison (no stored-variable indirection needed here).
   */
  assertCreateTransactionResponse(
    response: ApiResponse<Transaction[]>,
    requestBody: CreateTransactionRequest,
    expectedDirectionCode: 'IN' | 'OUT',
    accountId: string,
    requestId: string,
  ): { accountTransactionId: string; initialBalanceAmount: number; transaction: Transaction } {
    expect(response.status, `Status code is 200/201 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      response.data.length,
      `data array is present and not empty (actual length: ${response.data.length})`,
    ).toBeGreaterThan(0);
    const [transaction] = response.data;

    // ─ Identifiers / keys ─
    expect(
      transaction.accountTransactionId,
      `accountTransactionId is present and valid format (actual: "${transaction.accountTransactionId}")`,
    ).toMatch(/^ID-\d+$/);
    expect(
      transaction.tenantCode,
      `tenantCode matches request header x-tenant-code (actual: "${transaction.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
    ).toBe(getENV().TUUM_TENANT_CODE);
    expect(
      transaction.groupId,
      `groupId is present (actual: "${transaction.groupId}")`,
    ).toBeTruthy();
    expect(
      transaction.filingCode,
      `filingCode is present and matches expected pattern (actual: "${transaction.filingCode}")`,
    ).toMatch(/^\d{16}$/);

    // ─ Dates ─
    expect(
      this.isValidDateString(transaction.postingDate),
      `postingDate is present and a valid date (actual: "${transaction.postingDate}")`,
    ).toBe(true);
    // Literal port of the source script's unconditional equality check —
    // requires the caller to actually send valueDate (FRP1 TC1/TC2 do, as
    // of the valueDate-drift discussion). No silent fallback to a
    // weaker "is a valid date" check if valueDate is omitted — that would
    // quietly change what this assertion means instead of surfacing a
    // real divergence from the source Postman script.
    expect(
      transaction.valueDate,
      `valueDate matches request valueDate (actual: "${transaction.valueDate}", expected: "${requestBody.valueDate}")`,
    ).toBe(requestBody.valueDate);
    expect(
      this.isValidDateString(transaction.createdDTime),
      `createdDTime is present and a valid ISO timestamp (actual: "${transaction.createdDTime}")`,
    ).toBe(true);
    expect(
      Math.abs(Date.now() - Date.parse(transaction.createdDTime)),
      `createdDTime is recent, within 5 minutes of test run (actual: "${transaction.createdDTime}", now: "${new Date().toISOString()}")`,
    ).toBeLessThan(5 * 60 * 1000);
    // Compared as instants (Date.parse), not exact strings, so a timezone
    // offset or trailing-zero difference in the echo doesn't fail it — same
    // as the source collection's v5 create script.
    expect(
      requestBody.transactionDTime,
      `transactionDTime was sent in the request (actual: "${requestBody.transactionDTime}")`,
    ).toBeTruthy();
    expect(
      Date.parse(transaction.transactionDTime),
      `transactionDTime matches request transactionDTime (actual: "${transaction.transactionDTime}", expected: "${requestBody.transactionDTime}")`,
    ).toBe(Date.parse(requestBody.transactionDTime!));

    // ─ Account / type / direction ─
    expect(
      transaction.accountId,
      `accountId matches path parameter (actual: "${transaction.accountId}", expected: "${accountId}")`,
    ).toBe(accountId);
    expect(
      transaction.transactionTypeCode,
      `transactionTypeCode matches request (actual: "${transaction.transactionTypeCode}", expected: "${requestBody.transactionTypeCode}")`,
    ).toBe(requestBody.transactionTypeCode);
    const expectedSubtype =
      requestBody.transactionSubtypeCode === ''
        ? null
        : (requestBody.transactionSubtypeCode ?? null);
    expect(
      transaction.transactionSubtypeCode ?? null,
      `transactionSubtypeCode matches request, empty string treated as null (actual: ${JSON.stringify(transaction.transactionSubtypeCode ?? null)}, expected: ${JSON.stringify(expectedSubtype)})`,
    ).toBe(expectedSubtype);
    expect(
      transaction.directionCode,
      `directionCode correctly derived for transaction type (actual: "${transaction.directionCode}", expected: "${expectedDirectionCode}")`,
    ).toBe(expectedDirectionCode);

    // ─ Money fields ─
    expect(
      transaction.currencyCode,
      `currencyCode matches request money.currencyCode (actual: "${transaction.currencyCode}", expected: "${requestBody.money.currencyCode}")`,
    ).toBe(requestBody.money.currencyCode);
    expect(
      transaction.amount,
      `amount matches request money.amount (actual: ${transaction.amount}, expected: ${requestBody.money.amount})`,
    ).toBe(requestBody.money.amount);
    expect(
      typeof transaction.initialBalanceAmount,
      `initialBalanceAmount is present and numeric (actual: ${transaction.initialBalanceAmount})`,
    ).toBe('number');

    // ─ Descriptive fields ─
    expect(
      transaction.details ?? null,
      `details matches request details (actual: ${JSON.stringify(transaction.details ?? null)}, expected: ${JSON.stringify(requestBody.details ?? null)})`,
    ).toBe(requestBody.details ?? null);
    expect(
      transaction.referenceNumber ?? null,
      `referenceNumber matches request referenceNumber (actual: ${JSON.stringify(transaction.referenceNumber ?? null)}, expected: ${JSON.stringify(requestBody.referenceNumber ?? null)})`,
    ).toBe(requestBody.referenceNumber ?? null);
    expect(
      transaction.uniqueIdentifier ?? null,
      `uniqueIdentifier matches request uniqueIdentifier (actual: ${JSON.stringify(transaction.uniqueIdentifier ?? null)}, expected: ${JSON.stringify(requestBody.uniqueIdentifier ?? null)})`,
    ).toBe(requestBody.uniqueIdentifier ?? null);

    // ─ Source object ─
    expect(
      transaction.source?.sourceName,
      `source.sourceName matches request (actual: "${transaction.source?.sourceName}", expected: "${requestBody.source!.sourceName}")`,
    ).toBe(requestBody.source!.sourceName);
    expect(
      transaction.source?.sourceRef,
      `source.sourceRef matches request (actual: "${transaction.source?.sourceRef}", expected: "${requestBody.source!.sourceRef}")`,
    ).toBe(requestBody.source!.sourceRef);
    expect(
      transaction.source?.sourceLink,
      `source.sourceLink is null (actual: ${JSON.stringify(transaction.source?.sourceLink)})`,
    ).toBeNull();

    // ─ PSP / reversal / labels ─
    expect(
      transaction.paymentServiceProviderCode,
      `paymentServiceProviderCode matches request (actual: "${transaction.paymentServiceProviderCode}", expected: "${requestBody.paymentServiceProviderCode}")`,
    ).toBe(requestBody.paymentServiceProviderCode);
    expect(
      transaction.reversed,
      `reversed is false for a fresh transaction (actual: ${transaction.reversed})`,
    ).toBe(false);
    expect(
      transaction.reversedTransactionId ?? null,
      `reversedTransactionId matches request, null when not a reversal (actual: ${JSON.stringify(transaction.reversedTransactionId ?? null)}, expected: ${JSON.stringify(requestBody.reversedTransactionId ?? null)})`,
    ).toBe(requestBody.reversedTransactionId ?? null);
    expect(
      transaction.labels,
      `labels array matches request labels (actual: ${JSON.stringify(transaction.labels)}, expected: ${JSON.stringify(requestBody.labels)})`,
    ).toEqual(requestBody.labels);

    // ─ Fields expected to remain null when not supplied in request ─
    expect(
      transaction.contractSource ?? null,
      `contractSource is null, not sent in request (actual: ${JSON.stringify(transaction.contractSource ?? null)})`,
    ).toBeNull();
    expect(
      transaction.merchantInfo ?? null,
      `merchantInfo is null, not sent in request (actual: ${JSON.stringify(transaction.merchantInfo ?? null)})`,
    ).toBeNull();
    expect(
      transaction.metaInfo ?? null,
      `metaInfo is null, not sent in request (actual: ${JSON.stringify(transaction.metaInfo ?? null)})`,
    ).toBeNull();
    expect(
      transaction.endToEndId ?? null,
      `endToEndId is null, not applicable for this flow (actual: ${JSON.stringify(transaction.endToEndId ?? null)})`,
    ).toBeNull();
    expect(
      transaction.virtualAccountId ?? null,
      `virtualAccountId is null, no virtual account linkage expected (actual: ${JSON.stringify(transaction.virtualAccountId ?? null)})`,
    ).toBeNull();
    expect(
      transaction.counterparty ?? null,
      `counterparty is null, not sent in request (actual: ${JSON.stringify(transaction.counterparty ?? null)})`,
    ).toBeNull();
    expect(
      transaction.reservationId ?? null,
      `reservationId is null, no reservation involved (actual: ${JSON.stringify(transaction.reservationId ?? null)})`,
    ).toBeNull();
    expect(
      transaction.usage ?? null,
      `usage is null, not sent in request (actual: ${JSON.stringify(transaction.usage ?? null)})`,
    ).toBeNull();
    expect(
      transaction.settlementInfo ?? null,
      `settlementInfo is null, not sent in request (actual: ${JSON.stringify(transaction.settlementInfo ?? null)})`,
    ).toBeNull();

    // ─ Header-level assertion (x-request-id idempotency key) ─
    expect(
      requestId,
      `x-request-id header was sent as a valid UUID (actual: "${requestId}")`,
    ).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    return {
      accountTransactionId: transaction.accountTransactionId,
      initialBalanceAmount: transaction.initialBalanceAmount,
      transaction,
    };
  }

  /**
   * Full-parity composite check for the GET-by-id transaction details
   * response (FRP1 TC1/TC2) — ports every pm.test() from the source
   * Postman "View transaction Details" script, including the equality
   * checks against the original create response (createdTransaction is the
   * Transaction object assertCreateTransactionResponse() already returned —
   * the TS equivalent of the source script's snapshot_<id>/collection-
   * variable comparison, no stored-variable indirection needed).
   */
  assertTransactionDetails(
    response: ApiResponse<Transaction>,
    createdTransaction: Transaction,
    expected: {
      accountId: string;
      directionCode: 'IN' | 'OUT';
      amount: number;
      currencyCode: string;
    },
  ): void {
    const txn = response.data;
    expect(response.status, `Status code is 200 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(txn, 'data is a single object (not array)').toBeTruthy();

    // ─ Identifiers ─
    expect(
      txn.accountTransactionId,
      `accountTransactionId matches path parameter (actual: "${txn.accountTransactionId}", expected: "${createdTransaction.accountTransactionId}")`,
    ).toBe(createdTransaction.accountTransactionId);
    expect(
      txn.tenantCode,
      `tenantCode matches request header x-tenant-code (actual: "${txn.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
    ).toBe(getENV().TUUM_TENANT_CODE);
    expect(txn.groupId, `groupId is present (actual: "${txn.groupId}")`).toBeTruthy();
    expect(
      txn.filingCode,
      `filingCode is present and matches expected pattern (actual: "${txn.filingCode}")`,
    ).toMatch(/^\d{16}$/);

    // ─ Dates ─
    expect(
      this.isValidDateString(txn.postingDate),
      `postingDate is present and a valid date (actual: "${txn.postingDate}")`,
    ).toBe(true);
    expect(
      this.isValidDateString(txn.createdDTime),
      `createdDTime is present and valid ISO timestamp (actual: "${txn.createdDTime}")`,
    ).toBe(true);

    // ─ Business-logic checks ─
    expect(
      txn.directionCode,
      `directionCode correctly derived for transaction type (actual: "${txn.directionCode}", expected: "${expected.directionCode}")`,
    ).toBe(expected.directionCode);
    expect(
      txn.currencyCode,
      `currencyCode is a valid 3-letter ISO code (actual: "${txn.currencyCode}")`,
    ).toMatch(/^[A-Z]{3}$/);
    expect(typeof txn.amount, `amount is present and numeric (actual: ${txn.amount})`).toBe(
      'number',
    );

    // ─ Source object ─
    expect(
      txn.source?.sourceLink,
      `source.sourceLink is null (actual: ${JSON.stringify(txn.source?.sourceLink)})`,
    ).toBeNull();
    expect(
      txn.source?.sourceName,
      `source.sourceName is present (actual: "${txn.source?.sourceName}")`,
    ).toBeTruthy();
    expect(
      txn.source?.sourceRef,
      `source.sourceRef is present (actual: "${txn.source?.sourceRef}")`,
    ).toBeTruthy();

    // ─ Fields expected to remain null when not applicable ─
    expect(
      txn.contractSource ?? null,
      `contractSource is null, not applicable (actual: ${JSON.stringify(txn.contractSource ?? null)})`,
    ).toBeNull();
    expect(
      txn.merchantInfo ?? null,
      `merchantInfo is null, not applicable (actual: ${JSON.stringify(txn.merchantInfo ?? null)})`,
    ).toBeNull();
    expect(
      txn.metaInfo ?? null,
      `metaInfo is null, not applicable (actual: ${JSON.stringify(txn.metaInfo ?? null)})`,
    ).toBeNull();
    expect(
      txn.endToEndId ?? null,
      `endToEndId is null, not applicable (actual: ${JSON.stringify(txn.endToEndId ?? null)})`,
    ).toBeNull();
    expect(
      txn.virtualAccountId ?? null,
      `virtualAccountId is null, no virtual account linkage expected (actual: ${JSON.stringify(txn.virtualAccountId ?? null)})`,
    ).toBeNull();
    expect(
      txn.counterparty ?? null,
      `counterparty is null, not applicable (actual: ${JSON.stringify(txn.counterparty ?? null)})`,
    ).toBeNull();
    expect(
      txn.reservationId ?? null,
      `reservationId is null, no reservation involved (actual: ${JSON.stringify(txn.reservationId ?? null)})`,
    ).toBeNull();
    expect(
      txn.usage ?? null,
      `usage is null, not applicable (actual: ${JSON.stringify(txn.usage ?? null)})`,
    ).toBeNull();
    expect(
      txn.settlementInfo ?? null,
      `settlementInfo is null, not applicable (actual: ${JSON.stringify(txn.settlementInfo ?? null)})`,
    ).toBeNull();

    // ─ Reversal-related fields (incl. deprecated-field sync checks) ─
    // `reversal` means "this transaction IS a reversal" — not an alias of
    // `reversed` ("has been reversed"), as the source script assumed: on
    // cab-dev a reversed original has reversed=true / reversal=false, and
    // its reversal has reversed=false / reversal=true. This helper is only
    // used for non-reversal transactions, so `reversal` must be false.
    expect(
      txn.reversal,
      `reversal flag is false, this is not a reversal transaction (actual: ${txn.reversal}; reversed: ${txn.reversed})`,
    ).toBe(false);
    expect(
      txn.reversalTransactionId ?? null,
      `reversedTransactionId and deprecated reversalTransactionId are in sync (reversedTransactionId: ${JSON.stringify(txn.reversedTransactionId ?? null)}, reversalTransactionId: ${JSON.stringify(txn.reversalTransactionId ?? null)})`,
    ).toBe(txn.reversedTransactionId ?? null);
    if (txn.reversed === false) {
      expect(
        txn.reversedByTransactionId ?? null,
        `reversedByTransactionId is null for a non-reversed transaction (actual: ${JSON.stringify(txn.reversedByTransactionId ?? null)})`,
      ).toBeNull();
    } else {
      expect(
        txn.reversedByTransactionId,
        `reversedByTransactionId exists for a reversed transaction (actual: ${JSON.stringify(txn.reversedByTransactionId)})`,
      ).toBeTruthy();
    }

    // ─ Custom booking / ISO 20022 classification fields ─
    expect(
      typeof txn.customBookingAllowed,
      `customBookingAllowed is a boolean (actual: ${txn.customBookingAllowed})`,
    ).toBe('boolean');
    for (const [label, code] of [
      ['domainCode', txn.domainCode],
      ['familyCode', txn.familyCode],
      ['subFamilyCode', txn.subFamilyCode],
    ] as const) {
      if (code !== null && code !== undefined) {
        expect(code, `${label} is a valid 4-letter ISO 20022 code (actual: "${code}")`).toMatch(
          /^[A-Z]{4}$/,
        );
      }
    }

    // ─ Equality checks against original POST (create) response ─
    expect(
      txn.valueDate,
      `valueDate matches original create response (actual: "${txn.valueDate}", expected: "${createdTransaction.valueDate}")`,
    ).toBe(createdTransaction.valueDate);
    expect(
      txn.transactionTypeCode,
      `transactionTypeCode matches original create response (actual: "${txn.transactionTypeCode}", expected: "${createdTransaction.transactionTypeCode}")`,
    ).toBe(createdTransaction.transactionTypeCode);
    expect(
      txn.transactionSubtypeCode ?? null,
      `transactionSubtypeCode matches original create response (actual: ${JSON.stringify(txn.transactionSubtypeCode ?? null)}, expected: ${JSON.stringify(createdTransaction.transactionSubtypeCode ?? null)})`,
    ).toBe(createdTransaction.transactionSubtypeCode ?? null);
    expect(
      txn.currencyCode,
      `currencyCode matches original create response (actual: "${txn.currencyCode}", expected: "${createdTransaction.currencyCode}")`,
    ).toBe(createdTransaction.currencyCode);
    expect(
      txn.amount,
      `amount matches original create response (actual: ${txn.amount}, expected: ${createdTransaction.amount})`,
    ).toBe(createdTransaction.amount);
    expect(
      txn.initialBalanceAmount,
      `initialBalanceAmount matches original create response (actual: ${txn.initialBalanceAmount}, expected: ${createdTransaction.initialBalanceAmount})`,
    ).toBe(createdTransaction.initialBalanceAmount);
    expect(
      txn.details ?? null,
      `details matches original create response (actual: ${JSON.stringify(txn.details ?? null)}, expected: ${JSON.stringify(createdTransaction.details ?? null)})`,
    ).toBe(createdTransaction.details ?? null);
    expect(
      txn.referenceNumber ?? null,
      `referenceNumber matches original create response (actual: ${JSON.stringify(txn.referenceNumber ?? null)}, expected: ${JSON.stringify(createdTransaction.referenceNumber ?? null)})`,
    ).toBe(createdTransaction.referenceNumber ?? null);
    expect(
      txn.uniqueIdentifier ?? null,
      `uniqueIdentifier matches original create response (actual: ${JSON.stringify(txn.uniqueIdentifier ?? null)}, expected: ${JSON.stringify(createdTransaction.uniqueIdentifier ?? null)})`,
    ).toBe(createdTransaction.uniqueIdentifier ?? null);
    expect(
      txn.accountId,
      `accountId matches original create response (actual: "${txn.accountId}", expected: "${createdTransaction.accountId}")`,
    ).toBe(createdTransaction.accountId);
    expect(
      txn.createdDTime,
      `createdDTime is immutable and matches original create response (actual: "${txn.createdDTime}", expected: "${createdTransaction.createdDTime}")`,
    ).toBe(createdTransaction.createdDTime);
    expect(
      txn.transactionDTime,
      `transactionDTime matches original create response (actual: "${txn.transactionDTime}", expected: "${createdTransaction.transactionDTime}")`,
    ).toBe(createdTransaction.transactionDTime);
    expect(
      txn.paymentServiceProviderCode,
      `paymentServiceProviderCode matches original create response (actual: "${txn.paymentServiceProviderCode}", expected: "${createdTransaction.paymentServiceProviderCode}")`,
    ).toBe(createdTransaction.paymentServiceProviderCode);

    // ─ Cross-reference against the scenario's own expected values ─
    expect(
      txn.accountId,
      `accountId matches scenario's expected value (actual: "${txn.accountId}", expected: "${expected.accountId}")`,
    ).toBe(expected.accountId);
    expect(
      txn.amount,
      `amount matches scenario's expected value (actual: ${txn.amount}, expected: ${expected.amount})`,
    ).toBe(expected.amount);
    expect(
      txn.currencyCode,
      `currencyCode matches scenario's expected value (actual: "${txn.currencyCode}", expected: "${expected.currencyCode}")`,
    ).toBe(expected.currencyCode);
  }

  /**
   * The account's balance record in the given currency. An account can hold
   * several currency balances (ID-1048 has USD and INR), and their order in
   * the response isn't the transaction's currency first — the source
   * scripts' `jsonData.data[0]` picks whichever comes first, so select by
   * currency instead. Fails if the account has no balance in that currency.
   */
  balanceIn(response: ApiResponse<AccountBalance[]>, currencyCode: string): AccountBalance {
    const balance = response.data?.find((entry) => entry.currencyCode === currencyCode);
    expect(
      balance,
      `a balance exists in ${currencyCode} (balances returned: ${JSON.stringify(response.data?.map((entry) => entry.currencyCode))})`,
    ).toBeDefined();
    return balance!;
  }

  /**
   * Full-parity composite check for the account balances response
   * (FRP1 TC1/TC2) — ports every pm.test() from the source Postman
   * "FetchBalances" script, applied to the balance in the transaction's
   * currency (see balanceIn()).
   */
  assertAccountBalances(
    response: ApiResponse<AccountBalance[]>,
    accountId: string,
    expected: { balanceAmount: number; currencyCode: string },
  ): void {
    expect(response.status, `Status code is 200 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      response.data.length,
      `data array is present and not empty (actual length: ${response.data.length})`,
    ).toBeGreaterThan(0);
    const balance = this.balanceIn(response, expected.currencyCode);

    // ─ Identifiers ─
    expect(
      balance.balanceId,
      `balanceId is present and valid format (actual: "${balance.balanceId}")`,
    ).toMatch(/^ID-\d+$/);
    expect(
      balance.tenantCode,
      `tenantCode matches request header x-tenant-code (actual: "${balance.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
    ).toBe(getENV().TUUM_TENANT_CODE);
    expect(
      balance.accountId,
      `accountId matches path parameter (actual: "${balance.accountId}", expected: "${accountId}")`,
    ).toBe(accountId);

    // ─ Currency fields ─
    expect(
      balance.currencyCode,
      `currencyCode is a valid 3-letter ISO code (actual: "${balance.currencyCode}")`,
    ).toMatch(/^[A-Z]{3}$/);
    expect(
      balance.defaultCurrencyCode,
      `defaultCurrencyCode is a valid 3-letter ISO code (actual: "${balance.defaultCurrencyCode}")`,
    ).toMatch(/^[A-Z]{3}$/);

    // ─ Core amount fields ─
    expect(
      typeof balance.balanceAmount,
      `balanceAmount is present and numeric (actual: ${balance.balanceAmount})`,
    ).toBe('number');
    expect(
      typeof balance.reservedAmount,
      `reservedAmount is present and numeric (actual: ${balance.reservedAmount})`,
    ).toBe('number');
    expect(
      balance.reservedAmount,
      `reservedAmount is >= 0 (actual: ${balance.reservedAmount})`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      typeof balance.overdraftLimitAmount,
      `overdraftLimitAmount is present and numeric (actual: ${balance.overdraftLimitAmount})`,
    ).toBe('number');
    expect(
      balance.overdraftLimitAmount,
      `overdraftLimitAmount is >= 0 (actual: ${balance.overdraftLimitAmount})`,
    ).toBeGreaterThanOrEqual(0);

    // ─ Derived / business-logic fields ─
    const expectedAvailable =
      balance.balanceAmount - balance.reservedAmount + balance.overdraftLimitAmount;
    expect(
      Math.round(balance.availableBalanceAmount * 100) / 100,
      `availableBalanceAmount = balanceAmount - reservedAmount + overdraftLimitAmount (actual: ${balance.availableBalanceAmount}, expected: ${expectedAvailable}; balanceAmount: ${balance.balanceAmount}, reservedAmount: ${balance.reservedAmount}, overdraftLimitAmount: ${balance.overdraftLimitAmount})`,
    ).toBe(Math.round(expectedAvailable * 100) / 100);
    expect(
      typeof balance.availableBalanceInDefaultCcy,
      `availableBalanceInDefaultCcy is present and numeric (actual: ${balance.availableBalanceInDefaultCcy})`,
    ).toBe('number');
    if (balance.currencyCode === balance.defaultCurrencyCode) {
      expect(
        Math.round(balance.availableBalanceInDefaultCcy * 100) / 100,
        `availableBalanceInDefaultCcy equals availableBalanceAmount, same currency (actual: ${balance.availableBalanceInDefaultCcy}, expected: ${balance.availableBalanceAmount})`,
      ).toBe(Math.round(balance.availableBalanceAmount * 100) / 100);
    } else {
      expect(
        balance.availableBalanceInDefaultCcy,
        `availableBalanceInDefaultCcy is a converted, non-equal value, different currency (actual: ${balance.availableBalanceInDefaultCcy}, availableBalanceAmount: ${balance.availableBalanceAmount})`,
      ).not.toBe(balance.availableBalanceAmount);
    }

    // ─ Negative balance flag ─
    if (balance.balanceAmount < 0) {
      expect(
        this.isValidDateString(balance.negativeBalanceStartDate),
        `negativeBalanceStartDate is present and a valid date (actual: "${balance.negativeBalanceStartDate}")`,
      ).toBe(true);
    } else {
      expect(
        balance.negativeBalanceStartDate ?? null,
        `negativeBalanceStartDate is null (actual: ${JSON.stringify(balance.negativeBalanceStartDate ?? null)})`,
      ).toBeNull();
    }

    // ─ Reconciliation against the expected post-transaction balance ─
    expect(
      balance.balanceAmount,
      `balanceAmount reconciles to expected (actual: ${balance.balanceAmount}, expected: ${expected.balanceAmount})`,
    ).toBe(expected.balanceAmount);
    expect(
      balance.currencyCode,
      `currencyCode matches expected (actual: "${balance.currencyCode}", expected: "${expected.currencyCode}")`,
    ).toBe(expected.currencyCode);
  }

  /**
   * Full-parity composite check for the finance-api ledger lookup
   * (FRP1 TC1/TC2) — ports every pm.test() from the source Postman
   * "Finance event" script, including the per-entry loop checks and the
   * cross-reference against the original transaction.
   */
  assertLedgerEntries(
    response: ApiResponse<LedgerEntry[]>,
    transactionId: string,
    // glAccounts is optional — only FRP3 asserts which GL accounts the pair
    // posts to (the source FRP1/FRP2 scripts don't check GL codes).
    expected: {
      amount: number;
      currencyCode: string;
      details?: string | null;
      glAccounts?: LedgerGlPair;
    },
  ): void {
    expect(response.status, `Status code is 200 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      Array.isArray(response.data),
      `data is present and is an array (actual type: ${typeof response.data})`,
    ).toBe(true);
    expect(
      response.data,
      `data array has exactly 2 entries, one debit one credit (actual length: ${response.data.length})`,
    ).toHaveLength(2);

    const [entryA, entryB] = response.data;
    const debit = response.data.find((entry) => entry.directionCode === 'D');
    const credit = response.data.find((entry) => entry.directionCode === 'C');
    expect(
      [entryA.directionCode, entryB.directionCode].sort(),
      `one entry is a debit (D) and the other is a credit (C) (actual: [${entryA.directionCode}, ${entryB.directionCode}])`,
    ).toEqual(['C', 'D']);
    if (expected.glAccounts) {
      this.assertGlAccounts(debit, credit, expected.glAccounts, 'Original');
    }
    expect(
      entryA.amount.amount,
      `both entries have the exact same amount (entryA: ${entryA.amount.amount}, entryB: ${entryB.amount.amount})`,
    ).toBe(entryB.amount.amount);
    expect(
      entryA.amount.currencyCode,
      `both entries have the same currencyCode (entryA: "${entryA.amount.currencyCode}", entryB: "${entryB.amount.currencyCode}")`,
    ).toBe(entryB.amount.currencyCode);
    expect(
      entryA.accountCode,
      `accountCode differs between the two entries (entryA: "${entryA.accountCode}", entryB: "${entryB.accountCode}")`,
    ).not.toBe(entryB.accountCode);
    expect(
      entryA.entryNumber,
      `entryNumber is identical across both entries (entryA: "${entryA.entryNumber}", entryB: "${entryB.entryNumber}")`,
    ).toBe(entryB.entryNumber);
    expect(
      entryA.eventId,
      `eventId is identical across both entries (entryA: "${entryA.eventId}", entryB: "${entryB.eventId}")`,
    ).toBe(entryB.eventId);
    expect(
      entryA.entryNumber,
      `entryNumber equals eventId (entryNumber: "${entryA.entryNumber}", eventId: "${entryA.eventId}")`,
    ).toBe(entryA.eventId);
    expect(
      entryA.entryDate,
      `entryDate is identical across both entries (entryA: "${entryA.entryDate}", entryB: "${entryB.entryDate}")`,
    ).toBe(entryB.entryDate);
    expect(
      entryA.createdDtime,
      `createdDtime is identical across both entries (entryA: "${entryA.createdDtime}", entryB: "${entryB.createdDtime}")`,
    ).toBe(entryB.createdDtime);

    // ─ Per-entry field checks ─
    response.data.forEach((entry, idx) => {
      expect(
        entry.entryId,
        `entries[${idx}].entryId is present and valid format (actual: "${entry.entryId}")`,
      ).toMatch(/^ID-\d+$/);
      expect(
        entry.tenantCode,
        `entries[${idx}].tenantCode matches request header x-tenant-code (actual: "${entry.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
      ).toBe(getENV().TUUM_TENANT_CODE);
      expect(
        entry.accountName,
        `entries[${idx}].accountName is present and non-empty (actual: "${entry.accountName}")`,
      ).toBeTruthy();
      if (entry.reportingCcyExchangeRate === 1) {
        expect(
          entry.reportingAmount.amount,
          `entries[${idx}].reportingAmount matches amount when exchange rate is 1 (actual: ${entry.reportingAmount.amount}, expected: ${entry.amount.amount})`,
        ).toBe(entry.amount.amount);
        expect(
          entry.reportingAmount.currencyCode,
          `entries[${idx}].reportingAmount.currencyCode matches amount.currencyCode (actual: "${entry.reportingAmount.currencyCode}", expected: "${entry.amount.currencyCode}")`,
        ).toBe(entry.amount.currencyCode);
      }
      expect(
        typeof entry.reportingCcyExchangeRate,
        `entries[${idx}].reportingCcyExchangeRate is a number (actual: ${entry.reportingCcyExchangeRate})`,
      ).toBe('number');
      expect(
        entry.source.sourceName,
        `entries[${idx}].source.sourceName equals the sourceName query parameter sent (actual: "${entry.source.sourceName}")`,
      ).toBe('ACCOUNT_TRANSACTION');
      expect(
        entry.source.sourceRef,
        `entries[${idx}].source.sourceRef matches the accountTransactionId queried (actual: "${entry.source.sourceRef}", expected: "${transactionId}")`,
      ).toBe(transactionId);
      expect(
        this.isValidDateString(entry.createdDtime),
        `entries[${idx}].createdDtime is present and a valid ISO timestamp (actual: "${entry.createdDtime}")`,
      ).toBe(true);
    });

    // ─ Cross-reference against the original transaction ─
    expect(
      debit?.amount.amount,
      `Ledger debit amount matches expected (actual: ${debit?.amount.amount}, expected: ${expected.amount})`,
    ).toBe(expected.amount);
    expect(
      debit?.amount.currencyCode,
      `Ledger debit currencyCode matches expected (actual: "${debit?.amount.currencyCode}", expected: "${expected.currencyCode}")`,
    ).toBe(expected.currencyCode);
    expect(
      credit?.amount.amount,
      `Ledger credit amount matches expected (actual: ${credit?.amount.amount}, expected: ${expected.amount})`,
    ).toBe(expected.amount);
    expect(
      credit?.amount.currencyCode,
      `Ledger credit currencyCode matches expected (actual: "${credit?.amount.currencyCode}", expected: "${expected.currencyCode}")`,
    ).toBe(expected.currencyCode);
    if (expected.details !== undefined) {
      expect(
        entryA.details,
        `ledger entry details matches the original transaction's details (actual: ${JSON.stringify(entryA.details)}, expected: ${JSON.stringify(expected.details)})`,
      ).toBe(expected.details);
      expect(
        entryB.details,
        `ledger entry details matches the original transaction's details (actual: ${JSON.stringify(entryB.details)}, expected: ${JSON.stringify(expected.details)})`,
      ).toBe(expected.details);
    }
  }

  // ─── FRP2 assertion helpers (idempotency) ─────────────────
  // Port the source collection's "SECOND HIT (replay)" blocks. Postman had to
  // stash the first response in a collection variable (idempotencyCheck_*)
  // and re-parse it; here the caller just passes the earlier response object.

  /** The parts of a Tuum response the source scripts compare (the JSON body). */
  private bodyOf<T>(
    response: ApiResponse<T>,
  ): Pick<ApiResponse<T>, 'data' | 'errors' | 'validationErrors'> {
    return {
      data: response.data,
      errors: response.errors,
      validationErrors: response.validationErrors,
    };
  }

  /**
   * Asserts a repeated read (balances, ledger entries) returned exactly what
   * the earlier read did — the FRP2 "FetchBalances2" / "Finance event2"
   * replay block: nothing was posted twice, so nothing moved.
   */
  assertResponseUnchanged<T>(
    response: ApiResponse<T>,
    earlierResponse: ApiResponse<T> | undefined,
    label: string,
    normaliseData: (data: T) => T = (data) => data,
  ): void {
    expect(
      earlierResponse,
      `${label}: first response was captured before this replay ran`,
    ).toBeDefined();
    expect(
      response.status,
      `${label}: Status code is 200/201 on replay (actual: ${response.status})`,
    ).toBe(200);
    const normalised = <U extends ApiResponse<T>>(r: U) => ({
      ...this.bodyOf(r),
      data: normaliseData(r.data),
    });
    expect(
      normalised(response),
      `${label}: Replayed response is identical to the original (idempotency)`,
    ).toEqual(normalised(earlierResponse!));
  }

  /**
   * assertResponseUnchanged() for finance-api ledger lookups. finance-api
   * doesn't guarantee the order of the debit/credit pair between calls, so
   * both responses are sorted by directionCode first — every field is still
   * compared, only the array order is ignored.
   */
  assertLedgerEntriesUnchanged(
    response: ApiResponse<LedgerEntry[]>,
    earlierResponse: ApiResponse<LedgerEntry[]> | undefined,
    label: string,
  ): void {
    this.assertResponseUnchanged(response, earlierResponse, label, (entries) =>
      Array.isArray(entries)
        ? [...entries].sort((a, b) => a.directionCode.localeCompare(b.directionCode))
        : entries,
    );
  }

  /**
   * Asserts a deliberately duplicated create-transaction request (same
   * x-request-id, referenceNumber, uniqueIdentifier, sourceRef, valueDate
   * and transactionDTime) was answered with the ORIGINAL transaction rather
   * than a new posting — the FRP2 "Transactions Funds Debit 1 duplicate" /
   * "Credit1 Duplicate" script.
   */
  assertReplayedTransactionResponse(
    replayResponse: ApiResponse<Transaction[]>,
    originalResponse: ApiResponse<Transaction[]> | undefined,
    replayRequestId: string,
    originalRequestId: string,
  ): void {
    expect(originalResponse, 'first response was captured before this replay ran').toBeDefined();
    expect(
      replayResponse.status,
      `Status code is 200/201 on replay (actual: ${replayResponse.status})`,
    ).toBe(200);
    expect(
      replayRequestId,
      `Idempotency: x-request-id was replayed from original request (actual: "${replayRequestId}", expected: "${originalRequestId}")`,
    ).toBe(originalRequestId);
    expect(
      this.bodyOf(replayResponse),
      `Replayed response is identical to the original (idempotency) (original accountTransactionId: "${originalResponse?.data?.[0]?.accountTransactionId}", replay accountTransactionId: "${replayResponse.data?.[0]?.accountTransactionId}")`,
    ).toEqual(this.bodyOf(originalResponse!));
  }

  // ─── FRP3: reversals (ledger immutability) ────────────────

  /**
   * Builds the reversal request exactly as the source collection's
   * "Transactions Funds Debit Reversal" body does — a full reversal of the
   * original (same amount/currency), linked via reversedTransactionId —
   * plus valueDate/transactionDTime. Deliberately NOT built via
   * postOutgoingFunds(): its defaults (details, source, PSP, labels,
   * applyFee) would be sent too, and the reversal response is asserted to
   * have those null.
   */
  buildReversalRequest(
    original: Transaction,
    reversalTransactionTypeCode: string,
  ): CreateTransactionRequest {
    return {
      transactionTypeCode: reversalTransactionTypeCode,
      transactionSubtypeCode: '',
      valueDate: this.todayUtc(),
      transactionDTime: this.nowIso(),
      money: { amount: original.amount, currencyCode: original.currencyCode },
      reversedTransactionId: original.accountTransactionId,
      referenceNumber: randomUUID(),
      uniqueIdentifier: randomUUID(),
    };
  }

  /** Posts a reversal body as-is (no defaults merged in). */
  async postReversal(
    accountId: string,
    requestBody: CreateTransactionRequest,
    requestId: string = randomUUID(),
  ): Promise<ApiResponse<Transaction[]>> {
    return this.accountClient.createTransaction(accountId, requestBody, requestId);
  }

  /**
   * Full-parity check for the reversal create response — ports every
   * pm.test() from the source "Transactions Funds Debit Reversal" script
   * (bundled pm.tests split into one expect per field). The reversal type
   * code and direction come from the scenario instead of the script's
   * hardcoded EXT_WITHDRAWAL_R / IN. Returns the reversal transaction.
   */
  assertReversalResponse(
    response: ApiResponse<Transaction[]>,
    requestBody: CreateTransactionRequest,
    expected: { accountId: string; directionCode: 'IN' | 'OUT' },
  ): Transaction {
    // ─ Status and wrappers ─
    expect(response.status, `Status code is 200/201 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      response.data,
      `data contains exactly one transaction (actual length: ${response.data?.length})`,
    ).toHaveLength(1);
    const [txn] = response.data;

    // ─ Identifiers ─
    expect(
      txn.accountTransactionId,
      `accountTransactionId has valid format (actual: "${txn.accountTransactionId}")`,
    ).toMatch(/^ID-\d+$/);
    expect(
      txn.reversedTransactionId,
      `reversedTransactionId exists (actual: ${JSON.stringify(txn.reversedTransactionId)})`,
    ).toBeTruthy();
    expect(
      txn.accountTransactionId,
      `accountTransactionId differs from the reversed transaction (actual: "${txn.accountTransactionId}", reversed: "${txn.reversedTransactionId}")`,
    ).not.toBe(txn.reversedTransactionId);
    expect(
      txn.tenantCode,
      `tenantCode matches x-tenant-code header (actual: "${txn.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
    ).toBe(getENV().TUUM_TENANT_CODE);
    expect(txn.groupId, `groupId is present (actual: "${txn.groupId}")`).toBeTruthy();
    // Tuum's filingCode design: postingDate (yyyymmdd) + transaction number zero-padded to 8 digits.
    const expectedFilingCode =
      String(txn.postingDate).replace(/-/g, '') +
      txn.accountTransactionId.replace('ID-', '').padStart(8, '0');
    expect(txn.filingCode, `filingCode is 16 digits (actual: "${txn.filingCode}")`).toMatch(
      /^\d{16}$/,
    );
    expect(
      txn.filingCode,
      `filingCode = postingDate (yyyymmdd) + 8-digit padded transaction number (actual: "${txn.filingCode}", expected: "${expectedFilingCode}")`,
    ).toBe(expectedFilingCode);

    // ─ Dates (valueDate and transactionDTime are sent, so the response must echo them) ─
    expect(txn.postingDate, `postingDate is a valid date (actual: "${txn.postingDate}")`).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(
      this.isValidDateString(txn.postingDate),
      `postingDate parses as a date (actual: "${txn.postingDate}")`,
    ).toBe(true);
    expect(txn.valueDate, `valueDate is valid (actual: "${txn.valueDate}")`).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(
      this.isValidDateString(txn.valueDate),
      `valueDate parses as a date (actual: "${txn.valueDate}")`,
    ).toBe(true);
    expect(
      requestBody.valueDate,
      `valueDate in request (actual: "${requestBody.valueDate}")`,
    ).toBeTruthy();
    expect(
      txn.valueDate,
      `valueDate matches the value sent (actual: "${txn.valueDate}", expected: "${requestBody.valueDate}")`,
    ).toBe(requestBody.valueDate);
    expect(
      txn.transactionDTime,
      `transactionDTime is present (actual: "${txn.transactionDTime}")`,
    ).toBeTruthy();
    expect(
      this.isValidDateString(txn.transactionDTime),
      `transactionDTime parses as a timestamp (actual: "${txn.transactionDTime}")`,
    ).toBe(true);
    expect(
      requestBody.transactionDTime,
      `transactionDTime in request (actual: "${requestBody.transactionDTime}")`,
    ).toBeTruthy();
    expect(
      Date.parse(txn.transactionDTime),
      `transactionDTime matches the value sent, compared as instants (actual: "${txn.transactionDTime}", expected: "${requestBody.transactionDTime}")`,
    ).toBe(Date.parse(requestBody.transactionDTime!));
    expect(
      this.isValidDateString(txn.createdDTime),
      `createdDTime is valid (actual: "${txn.createdDTime}")`,
    ).toBe(true);
    expect(
      Math.abs(Date.now() - Date.parse(txn.createdDTime)),
      `createdDTime is recent, within 5 minutes (actual: "${txn.createdDTime}", now: "${new Date().toISOString()}")`,
    ).toBeLessThan(5 * 60 * 1000);

    // ─ Account, type, direction ─
    expect(
      txn.accountId,
      `accountId matches the account in the request (actual: "${txn.accountId}", expected: "${expected.accountId}")`,
    ).toBe(expected.accountId);
    expect(
      txn.transactionTypeCode,
      `transactionTypeCode matches the request (actual: "${txn.transactionTypeCode}", expected: "${requestBody.transactionTypeCode}")`,
    ).toBe(requestBody.transactionTypeCode);
    expect(
      txn.transactionTypeCode,
      `transactionTypeCode is a reversal type code ending in _R (actual: "${txn.transactionTypeCode}")`,
    ).toMatch(/_R$/);
    expect(
      txn.transactionSubtypeCode ?? null,
      `transactionSubtypeCode is null (actual: ${JSON.stringify(txn.transactionSubtypeCode)})`,
    ).toBeNull();
    expect(
      txn.directionCode,
      `directionCode is the opposite of the original (actual: "${txn.directionCode}", expected: "${expected.directionCode}")`,
    ).toBe(expected.directionCode);

    // ─ Money ─
    expect(
      txn.currencyCode,
      `currencyCode matches the request (actual: "${txn.currencyCode}", expected: "${requestBody.money.currencyCode}")`,
    ).toBe(requestBody.money.currencyCode);
    expect(typeof txn.amount, `amount is a number (actual: ${txn.amount})`).toBe('number');
    expect(
      txn.amount,
      `amount matches the request, full reversal (actual: ${txn.amount}, expected: ${requestBody.money.amount})`,
    ).toBe(requestBody.money.amount);
    expect(
      typeof txn.initialBalanceAmount,
      `initialBalanceAmount is numeric (actual: ${txn.initialBalanceAmount})`,
    ).toBe('number');

    // ─ Idempotency keys ─
    expect(
      txn.referenceNumber,
      `referenceNumber matches the request (actual: "${txn.referenceNumber}", expected: "${requestBody.referenceNumber}")`,
    ).toBe(requestBody.referenceNumber);
    expect(
      txn.uniqueIdentifier,
      `uniqueIdentifier matches the request (actual: "${txn.uniqueIdentifier}", expected: "${requestBody.uniqueIdentifier}")`,
    ).toBe(requestBody.uniqueIdentifier);

    // ─ Reversal linkage ─
    expect(
      txn.reversed,
      `reversed is false on the new reversal transaction (actual: ${txn.reversed})`,
    ).toBe(false);
    expect(
      txn.reversedTransactionId,
      `reversedTransactionId matches the original transaction sent in the request (actual: "${txn.reversedTransactionId}", expected: "${requestBody.reversedTransactionId}")`,
    ).toBe(requestBody.reversedTransactionId);

    // ─ Fields that must be null on a reversal ─
    const record = txn as unknown as Record<string, unknown>;
    for (const field of [
      'details',
      'source',
      'contractSource',
      'merchantInfo',
      'metaInfo',
      'endToEndId',
      'paymentServiceProviderCode',
      'virtualAccountId',
      'labels',
      'counterparty',
      'reservationId',
      'usage',
      'settlementInfo',
    ]) {
      expect(
        record[field],
        `${field} is null on a reversal (actual: ${JSON.stringify(record[field])})`,
      ).toBeNull();
    }

    return txn;
  }

  /**
   * GET of the ORIGINAL transaction after it was reversed — the source
   * script's commented-out "SIDE-EFFECT CHECK #1". Call after
   * assertTransactionDetails() on the same response.
   */
  assertOriginalMarkedReversed(
    response: ApiResponse<Transaction>,
    reversalTransactionId: string,
  ): void {
    const txn = response.data;
    expect(
      txn.reversed,
      `original transaction is now flagged as reversed (actual: ${txn.reversed})`,
    ).toBe(true);
    expect(
      txn.reversedByTransactionId,
      `original transaction's reversedByTransactionId points to the new reversal (actual: ${JSON.stringify(txn.reversedByTransactionId)}, expected: "${reversalTransactionId}")`,
    ).toBe(reversalTransactionId);
  }

  /** GET of the REVERSAL transaction — it must be linked to the original and match its own create response. */
  assertReversalDetails(
    response: ApiResponse<Transaction>,
    reversal: Transaction,
    originalTransactionId: string,
  ): void {
    const txn = response.data;
    expect(response.status, `Status code is 200 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      txn.accountTransactionId,
      `accountTransactionId matches the reversal (actual: "${txn.accountTransactionId}", expected: "${reversal.accountTransactionId}")`,
    ).toBe(reversal.accountTransactionId);
    expect(
      txn.reversedTransactionId,
      `reversedTransactionId points to the original (actual: ${JSON.stringify(txn.reversedTransactionId)}, expected: "${originalTransactionId}")`,
    ).toBe(originalTransactionId);
    expect(
      txn.transactionTypeCode,
      `transactionTypeCode matches the reversal create response (actual: "${txn.transactionTypeCode}", expected: "${reversal.transactionTypeCode}")`,
    ).toBe(reversal.transactionTypeCode);
    expect(
      txn.directionCode,
      `directionCode matches the reversal create response (actual: "${txn.directionCode}", expected: "${reversal.directionCode}")`,
    ).toBe(reversal.directionCode);
    expect(
      txn.amount,
      `amount matches the reversal create response (actual: ${txn.amount}, expected: ${reversal.amount})`,
    ).toBe(reversal.amount);
    expect(
      txn.currencyCode,
      `currencyCode matches the reversal create response (actual: "${txn.currencyCode}", expected: "${reversal.currencyCode}")`,
    ).toBe(reversal.currencyCode);
    expect(txn.reversed, `reversed is false on the reversal itself (actual: ${txn.reversed})`).toBe(
      false,
    );
    expect(
      txn.reversal,
      `reversal flag is true, this transaction is a reversal (actual: ${txn.reversal})`,
    ).toBe(true);
    expect(
      txn.reversalTransactionId ?? null,
      `deprecated reversalTransactionId is in sync with reversedTransactionId (reversalTransactionId: ${JSON.stringify(txn.reversalTransactionId ?? null)}, reversedTransactionId: ${JSON.stringify(txn.reversedTransactionId ?? null)})`,
    ).toBe(txn.reversedTransactionId ?? null);
  }

  /**
   * Balance after a full reversal must be back where it was before the
   * original posting — the source "FetchBalances (after reversal)" check —
   * and equal the reversal's own starting balance plus/minus its amount.
   * Call after assertAccountBalances() on the same response.
   */
  assertBalanceRestoredByReversal(
    response: ApiResponse<AccountBalance[]>,
    original: Transaction,
    reversal: Transaction,
  ): void {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const balance = this.balanceIn(response, original.currencyCode);
    expect(
      round2(balance.balanceAmount),
      `balance equals the original's initialBalanceAmount, funds fully restored (actual: ${balance.balanceAmount}, expected: ${original.initialBalanceAmount})`,
    ).toBe(round2(original.initialBalanceAmount));
    const expectedFromReversal =
      reversal.directionCode === 'IN'
        ? reversal.initialBalanceAmount + reversal.amount
        : reversal.initialBalanceAmount - reversal.amount;
    expect(
      round2(balance.balanceAmount),
      `balance equals the reversal's initialBalanceAmount ${reversal.directionCode === 'IN' ? '+' : '-'} amount (actual: ${balance.balanceAmount}, expected: ${expectedFromReversal}; reversal initialBalanceAmount: ${reversal.initialBalanceAmount}, amount: ${reversal.amount})`,
    ).toBe(round2(expectedFromReversal));
  }

  private assertGlAccounts(
    debit: LedgerEntry | undefined,
    credit: LedgerEntry | undefined,
    expected: LedgerGlPair,
    label: string,
  ): void {
    expect(
      debit?.accountCode,
      `${label} debit GL code is ${expected.debit.accountCode} (actual: "${debit?.accountCode}")`,
    ).toBe(expected.debit.accountCode);
    expect(
      debit?.accountName,
      `${label} debit GL account name includes "${expected.debit.accountName}" (actual: "${debit?.accountName}")`,
    ).toContain(expected.debit.accountName);
    expect(
      credit?.accountCode,
      `${label} credit GL code is ${expected.credit.accountCode} (actual: "${credit?.accountCode}")`,
    ).toBe(expected.credit.accountCode);
    expect(
      credit?.accountName,
      `${label} credit GL account name includes "${expected.credit.accountName}" (actual: "${credit?.accountName}")`,
    ).toContain(expected.credit.accountName);
  }

  /**
   * The reversal's finance-api ledger pair must be the equal-and-opposite
   * mirror of the original's — ports every pm.test() from the source
   * "Finance event" (after reversal) script, plus: the pair's amount equals
   * the reversed amount (the "equal" half), and its D/C accounts are the
   * original's swapped (derived, independent of the scenario's GL codes).
   * Hard-fail by design: 0 entries or a non-mirror pair is a real defect.
   * USD-only for now: every entry must have reportingCcyExchangeRate === 1.
   */
  assertReversalLedgerMirrorsOriginal(
    response: ApiResponse<LedgerEntry[]>,
    reversalTransactionId: string,
    originalLedger: ApiResponse<LedgerEntry[]> | undefined,
    expected: { amount: number; currencyCode: string; glAccounts: LedgerGlPair },
  ): void {
    expect(response.status, `Status code is 200 (actual: ${response.status})`).toBe(200);
    expect(
      response.errors,
      `errors is null (actual: ${JSON.stringify(response.errors)})`,
    ).toBeNull();
    expect(
      response.validationErrors,
      `validationErrors is null (actual: ${JSON.stringify(response.validationErrors)})`,
    ).toBeNull();
    expect(
      Array.isArray(response.data),
      `data is present and is an array (actual type: ${typeof response.data})`,
    ).toBe(true);
    expect(
      response.data,
      `data array has exactly 2 entries, one debit one credit (actual length: ${response.data?.length})`,
    ).toHaveLength(2);

    const entries = response.data;
    const debit = entries.find((entry) => entry.directionCode === 'D');
    const credit = entries.find((entry) => entry.directionCode === 'C');
    expect(debit, 'one entry is a debit (D)').toBeDefined();
    expect(credit, 'one entry is a credit (C)').toBeDefined();

    // ─ GL accounts: from the scenario, and derived as the original's swapped ─
    this.assertGlAccounts(debit, credit, expected.glAccounts, 'Reversal');
    const originalDebit = originalLedger?.data?.find((entry) => entry.directionCode === 'D');
    const originalCredit = originalLedger?.data?.find((entry) => entry.directionCode === 'C');
    expect(
      debit?.accountCode,
      `reversal debit account is the original's credit account (actual: "${debit?.accountCode}", original credit: "${originalCredit?.accountCode}")`,
    ).toBe(originalCredit?.accountCode);
    expect(
      credit?.accountCode,
      `reversal credit account is the original's debit account (actual: "${credit?.accountCode}", original debit: "${originalDebit?.accountCode}")`,
    ).toBe(originalDebit?.accountCode);
    expect(
      debit?.accountCode,
      `accountCode differs between the two entries (debit: "${debit?.accountCode}", credit: "${credit?.accountCode}")`,
    ).not.toBe(credit?.accountCode);

    // ─ Amounts: balanced, and equal to the reversed amount ─
    expect(
      debit?.amount.amount,
      `both entries have the exact same amount (debit: ${debit?.amount.amount}, credit: ${credit?.amount.amount})`,
    ).toBe(credit?.amount.amount);
    expect(
      debit?.amount.currencyCode,
      `both entries have the same currencyCode (debit: "${debit?.amount.currencyCode}", credit: "${credit?.amount.currencyCode}")`,
    ).toBe(credit?.amount.currencyCode);
    expect(
      debit?.amount.amount,
      `reversal ledger amount equals the reversed amount (actual: ${debit?.amount.amount}, expected: ${expected.amount})`,
    ).toBe(expected.amount);
    expect(
      debit?.amount.currencyCode,
      `reversal ledger currencyCode matches the reversal (actual: "${debit?.amount.currencyCode}", expected: "${expected.currencyCode}")`,
    ).toBe(expected.currencyCode);

    // ─ One event ─
    expect(
      debit?.entryNumber,
      `entryNumber is identical across both entries (debit: "${debit?.entryNumber}", credit: "${credit?.entryNumber}")`,
    ).toBe(credit?.entryNumber);
    expect(
      debit?.eventId,
      `eventId is identical across both entries (debit: "${debit?.eventId}", credit: "${credit?.eventId}")`,
    ).toBe(credit?.eventId);
    expect(
      debit?.entryDate,
      `entryDate is identical across both entries (debit: "${debit?.entryDate}", credit: "${credit?.entryDate}")`,
    ).toBe(credit?.entryDate);
    expect(
      debit?.createdDtime,
      `createdDtime is identical across both entries (debit: "${debit?.createdDtime}", credit: "${credit?.createdDtime}")`,
    ).toBe(credit?.createdDtime);
    expect(debit?.entryId, `debit entryId is present (actual: "${debit?.entryId}")`).toBeTruthy();
    expect(
      credit?.entryId,
      `credit entryId is present (actual: "${credit?.entryId}")`,
    ).toBeTruthy();
    expect(
      debit?.entryId,
      `entryIds are unique (debit: "${debit?.entryId}", credit: "${credit?.entryId}")`,
    ).not.toBe(credit?.entryId);
    expect(
      debit?.details ?? null,
      `details is consistent across both entries (debit: ${JSON.stringify(debit?.details)}, credit: ${JSON.stringify(credit?.details)})`,
    ).toBe(credit?.details ?? null);

    // ─ Per-entry checks ─
    entries.forEach((entry, idx) => {
      expect(
        entry.source.sourceName,
        `entries[${idx}].source.sourceName is ACCOUNT_TRANSACTION (actual: "${entry.source.sourceName}")`,
      ).toBe('ACCOUNT_TRANSACTION');
      expect(
        entry.source.sourceRef,
        `entries[${idx}].source.sourceRef matches the reversal transaction (actual: "${entry.source.sourceRef}", expected: "${reversalTransactionId}")`,
      ).toBe(reversalTransactionId);
      expect(
        entry.tenantCode,
        `entries[${idx}].tenantCode matches request header x-tenant-code (actual: "${entry.tenantCode}", expected: "${getENV().TUUM_TENANT_CODE}")`,
      ).toBe(getENV().TUUM_TENANT_CODE);
      expect(
        entry.accountName,
        `entries[${idx}].accountName is present and non-empty (actual: "${entry.accountName}")`,
      ).toBeTruthy();
      expect(
        typeof entry.reportingCcyExchangeRate,
        `entries[${idx}].reportingCcyExchangeRate is a number (actual: ${entry.reportingCcyExchangeRate})`,
      ).toBe('number');
      expect(
        entry.reportingCcyExchangeRate,
        `entries[${idx}].reportingCcyExchangeRate is 1, USD-only (actual: ${entry.reportingCcyExchangeRate})`,
      ).toBe(1);
      expect(
        entry.reportingAmount.amount,
        `entries[${idx}].reportingAmount matches amount (actual: ${entry.reportingAmount.amount}, expected: ${entry.amount.amount})`,
      ).toBe(entry.amount.amount);
      expect(
        entry.reportingAmount.currencyCode,
        `entries[${idx}].reportingAmount.currencyCode matches amount.currencyCode (actual: "${entry.reportingAmount.currencyCode}", expected: "${entry.amount.currencyCode}")`,
      ).toBe(entry.amount.currencyCode);
      if (entry.details !== null) {
        expect(
          typeof entry.details,
          `entries[${idx}].details is null or a string (actual: ${JSON.stringify(entry.details)})`,
        ).toBe('string');
      }
    });
  }
}
