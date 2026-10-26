// data/tuumLedgerEntryData.ts
// Scenario-driven dataset for the "post ledger entry" API test — sourced
// from testData/tuum/postLedgerEntry.scenarios.json rather than hardcoded,
// so new scenarios can be added without touching TypeScript.

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';

export interface PostLedgerEntryExpected {
  accountId: string;
  amount: number;
  currencyCode: string;
}

export interface PostLedgerEntryScenario {
  description: string;
  personId: string;
  accountId: string;
  transaction: CreateTransactionRequest;
  expected: PostLedgerEntryExpected;
}

export function getLedgerEntryScenarios(): PostLedgerEntryScenario[] {
  return loadScenarios<PostLedgerEntryScenario>('testData/tuum/postLedgerEntry.scenarios.json');
}
