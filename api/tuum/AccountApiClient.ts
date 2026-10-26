// api/tuum/AccountApiClient.ts
import { APIRequestContext } from '@playwright/test';
import { TuumBaseApiClient } from './TuumBaseApiClient';
import { getENV } from '../../utils/envUtils';
import { ApiResponse, PaginatedResult } from '../../types';

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface TransactionSource {
  sourceName: string;
  sourceRef: string;
}

// The response includes sourceLink (server-populated, not sent in the
// request) alongside the two fields the request actually sends.
export interface TransactionSourceResponse extends TransactionSource {
  sourceLink: string | null;
}

export interface CreateTransactionRequest {
  transactionTypeCode: string;
  transactionSubtypeCode?: string;
  money: Money;
  valueDate?: string;
  // ISO timestamp of when the transaction happened, taken from the sending
  // machine's clock (the source collection sends {{$isoTimestamp}}). The
  // response echoes it back, so it's asserted against what was sent.
  transactionDTime?: string;
  details?: string;
  source?: TransactionSource;
  paymentServiceProviderCode?: string;
  labels?: string[];
  applyFee?: boolean;
  // Idempotency-safety fields (Standards #10 in the source Postman
  // collection) — generated fresh per request by the flow, so reruns never
  // collide and the response's echo of these can be asserted.
  referenceNumber?: string;
  uniqueIdentifier?: string;
  reversedTransactionId?: string | null;
  // The three fields below aren't part of CreateTransactionV5Json's documented
  // schema (they belong to the custom-booking endpoint) but the source Postman
  // collection sends them here — kept for parity with the existing integration
  // until we confirm whether account-api actually needs/uses them on this call.
  valueDateRule?: string;
  accountClosed?: boolean;
  forceFlag?: boolean;
}

export interface Transaction {
  accountTransactionId: string;
  accountId: string;
  tenantCode: string;
  groupId: string;
  transactionTypeCode: string;
  transactionSubtypeCode?: string | null;
  directionCode: 'IN' | 'OUT';
  currencyCode: string;
  amount: number;
  // The account's balance immediately before this transaction was applied —
  // used to reconcile the FetchBalances response without a separate
  // pre-transaction balance call (FRP1 TC1/TC2).
  initialBalanceAmount: number;
  postingDate: string;
  valueDate: string;
  transactionDTime: string;
  details?: string | null;
  referenceNumber?: string | null;
  uniqueIdentifier?: string | null;
  // null on a reversal (EXT_*_R) — its request body doesn't send them.
  source: TransactionSourceResponse | null;
  paymentServiceProviderCode: string | null;
  labels: string[] | null;
  reversed?: boolean;
  reversedTransactionId?: string | null;
  // reversalTransactionId is a deprecated alias of reversedTransactionId.
  // `reversal` is NOT an alias of `reversed` (observed on cab-dev): it is
  // true when this transaction IS a reversal, while `reversed` is true when
  // this transaction HAS BEEN reversed (see reversedByTransactionId).
  reversal?: boolean;
  reversalTransactionId?: string | null;
  reversedByTransactionId?: string | null;
  // Always-null-when-not-applicable fields for this flow's requests — typed
  // loosely (unverified shape) since the source collection only ever
  // asserts they're null, never inspects their contents.
  contractSource?: unknown;
  merchantInfo?: unknown;
  metaInfo?: unknown;
  endToEndId?: string | null;
  virtualAccountId?: string | null;
  counterparty?: unknown;
  reservationId?: string | null;
  usage?: unknown;
  settlementInfo?: unknown;
  customBookingAllowed?: boolean;
  domainCode?: string | null;
  familyCode?: string | null;
  subFamilyCode?: string | null;
  // Server-assigned, strictly-increasing marker (confirmed populated
  // synchronously on the create response, not just on later reads) —
  // used to verify FIFO ordering of near-simultaneous postings.
  filingCode: string;
  createdDTime: string;
}

export interface Account {
  accountId: string;
  personId: string;
  accountTypeCode: string;
  accountName?: string;
  statusCode: string;
  defaultCurrencyCode: string;
  tenantCode: string;
  accountClassCode?: string;
}

export interface AccountBalance {
  balanceId: string;
  accountId: string;
  tenantCode: string;
  currencyCode: string;
  defaultCurrencyCode: string;
  balanceAmount: number;
  reservedAmount: number;
  overdraftLimitAmount: number;
  availableBalanceAmount: number;
  availableBalanceInDefaultCcy: number;
  negativeBalanceStartDate?: string | null;
}

export interface TransactionType {
  transactionTypeCode: string;
  description?: string;
  directionCode: 'IN' | 'OUT';
}

export interface AccountPerson {
  accountPersonId: string;
  personId: string;
  personName?: string;
  accountPersonType: string;
  accountRightCode: string;
}

// POST /api/v5/accounts's response has no top-level personId (unlike
// findAccountV4's response) — person ownership lives in accountPersons[]
// instead. Confirmed against a real response, not the (undocumented) spec.
export interface CreateAccountResponse {
  accountId: string;
  accountTypeCode: string;
  accountName?: string;
  statusCode: string;
  defaultCurrencyCode: string;
  tenantCode: string;
  accountClassCode?: string;
  accountPersons: AccountPerson[];
}

export interface CreateAccountPersonRequest {
  accountPersonType: string;
  accountRightCode: string;
  personId: string;
  personName?: string;
}

// Matches CreateAccountV5Json — only the fields this framework currently sends.
// NOTE: POST /api/v5/accounts is an undocumented path in our account-api spec
// export (no operationId/response schema wired), so this is built from the
// CreateAccountV5Json component schema alone, not a verified path definition.
export interface CreateAccountRequest {
  accountPersons: CreateAccountPersonRequest[];
  accountClassCode?: string;
  accountName?: string;
  residencyCountryCode: string;
  taxResidencyCountryCode: string;
  tenantCode: string;
  productCode: string;
  currencyCode: string;
  customerGroupCode?: string;
  priceListTypeCode?: string;
  serviceProviderCode?: string;
}

export class AccountApiClient extends TuumBaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, getENV().BASE_URL_ACCOUNT_API);
  }

  // ─── Account endpoints ────────────────────────────────────

  /**
   * GET /api/v5/persons/{personId}/accounts?pageNumber=&pageSize=
   * Lists the accounts belonging to a person.
   */
  async getPersonAccounts(
    personId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
  ): Promise<ApiResponse<PaginatedResult<Account>>> {
    const response = await this.get(
      `/api/v5/persons/${personId}/accounts?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
    const data = await this.parseTuumData<PaginatedResult<Account>>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * GET /api/v4/accounts/{accountId}
   * Finds an account by ID.
   */
  async getAccount(accountId: string): Promise<ApiResponse<Account>> {
    const response = await this.get(`/api/v4/accounts/${accountId}`);
    const data = await this.parseTuumData<Account>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * POST /api/v5/accounts/{accountId}/transactions
   * Creates a ledger entry (transaction) for an account.
   * requestId must be a fresh UUID per call — used as the x-request-id
   * idempotency header so retries don't create duplicate transactions.
   */
  async createTransaction(
    accountId: string,
    requestBody: CreateTransactionRequest,
    requestId: string,
  ): Promise<ApiResponse<Transaction[]>> {
    const response = await this.post(
      `/api/v5/accounts/${accountId}/transactions`,
      { ...requestBody },
      { 'x-request-id': requestId },
    );
    if (response.status() !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG createTransaction non-200 raw body:', await response.text());
    }
    const { data, errors, validationErrors } =
      await this.parseTuumEnvelope<Transaction[]>(response);
    return {
      status: response.status(),
      data,
      errors,
      validationErrors,
    };
  }

  /**
   * POST /api/v5/accounts
   * Creates a new account for one or more account persons.
   * requestId must be a fresh UUID per call — used as the x-request-id
   * idempotency header so retries don't create duplicate accounts.
   */
  async createAccount(
    requestBody: CreateAccountRequest,
    requestId: string,
  ): Promise<ApiResponse<CreateAccountResponse>> {
    const response = await this.post(
      '/api/v5/accounts',
      { ...requestBody },
      { 'x-request-id': requestId },
    );
    const data = await this.parseTuumData<CreateAccountResponse>(response);
    return {
      status: response.status(),
      data,
    };
  }

  /**
   * GET /api/v3/transactions/{transactionId}
   * Finds a transaction by ID.
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    const response = await this.get(`/api/v3/transactions/${transactionId}`);
    const { data, errors, validationErrors } = await this.parseTuumEnvelope<Transaction>(response);
    return {
      status: response.status(),
      data,
      errors,
      validationErrors,
    };
  }

  /**
   * GET /api/v1/accounts/{accountId}/balances
   * Finds an account's balances (per currency).
   */
  async getAccountBalances(accountId: string): Promise<ApiResponse<AccountBalance[]>> {
    const response = await this.get(`/api/v1/accounts/${accountId}/balances`);
    const { data, errors, validationErrors } =
      await this.parseTuumEnvelope<AccountBalance[]>(response);
    return {
      status: response.status(),
      data,
      errors,
      validationErrors,
    };
  }

  /**
   * GET /api/v1/transactions/types/all
   * Finds all valid transaction types.
   */
  async getAllTransactionTypes(): Promise<ApiResponse<TransactionType[]>> {
    const response = await this.get('/api/v1/transactions/types/all');
    const data = await this.parseTuumData<TransactionType[]>(response);
    return {
      status: response.status(),
      data,
    };
  }
}
