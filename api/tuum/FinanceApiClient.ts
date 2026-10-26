// api/tuum/FinanceApiClient.ts
import { APIRequestContext } from '@playwright/test';
import { TuumBaseApiClient } from './TuumBaseApiClient';
import { getENV } from '../../utils/envUtils';
import { ApiResponse } from '../../types';

export interface LedgerEntryMoney {
  amount: number;
  currencyCode: string;
}

export interface LedgerEntrySource {
  sourceName: string;
  sourceRef: string;
}

// Types below are built from the Postman "Finance event" test-script
// assertions, not a verified OpenAPI spec — no finance-api spec file is
// in this repo yet (confirmed v2.45 is the companion version; file still
// needs to be supplied). Treat field names/nullability as unverified
// until that spec is available to cross-check.
export interface LedgerEntry {
  entryId: string;
  entryNumber: string;
  eventId: string;
  tenantCode: string;
  accountCode: string;
  accountName: string;
  directionCode: 'D' | 'C';
  amount: LedgerEntryMoney;
  reportingAmount: LedgerEntryMoney;
  reportingCcyExchangeRate: number;
  source: LedgerEntrySource;
  details: string | null;
  entryDate: string;
  createdDtime: string;
}

/** A GL account a ledger entry is expected to post to (scenario data, not a response type). */
export interface LedgerGlAccount {
  accountCode: string;
  accountName: string;
}

/** The GL accounts expected on each side of a double-entry ledger pair. */
export interface LedgerGlPair {
  debit: LedgerGlAccount;
  credit: LedgerGlAccount;
}

export class FinanceApiClient extends TuumBaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, getENV().BASE_URL_FINANCE_API);
  }

  /**
   * GET /api/v1/entries/source?sourceName=&sourceRefs=
   * Finds the double-entry ledger pair (debit + credit) posted for a given
   * account-api transaction (sourceRefs = the transaction's accountTransactionId).
   */
  async getLedgerEntriesBySource(
    sourceName: string,
    sourceRefs: string,
  ): Promise<ApiResponse<LedgerEntry[]>> {
    const response = await this.get(
      `/api/v1/entries/source?sourceName=${sourceName}&sourceRefs=${sourceRefs}`,
    );
    const { data, errors, validationErrors } =
      await this.parseTuumEnvelope<LedgerEntry[]>(response);
    return {
      status: response.status(),
      data,
      errors,
      validationErrors,
    };
  }
}
