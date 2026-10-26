// data/tuumFrp1Data.ts
// Scenario-driven dataset for FRP1 (Sub-Second Real-Time Posting with Precise
// Timestamps and FIFO) TC1 (single debit) and TC2 (single credit) — sourced
// from testData/tuum/frp1SubSecondPostingFifo.scenarios.json.

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';

export interface Frp1ExpectedTransaction {
  // The only thing that can't be derived from `transaction` itself — the
  // request body doesn't say which direction a transactionTypeCode maps
  // to, so it's authored here once rather than duplicated with amount/
  // currencyCode (which are now read directly off `transaction.money`).
  directionCode: 'IN' | 'OUT';
}

export interface Frp1Scenario {
  id: string;
  description: string;
  personId: string;
  accountId: string;
  transaction: CreateTransactionRequest;
  expected: Frp1ExpectedTransaction;
}

export function getFrp1Scenarios(): Frp1Scenario[] {
  return loadScenarios<Frp1Scenario>('testData/tuum/frp1SubSecondPostingFifo.scenarios.json');
}
