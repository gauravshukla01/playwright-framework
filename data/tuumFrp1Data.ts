// data/tuumFrp1Data.ts
// Scenario-driven dataset for FRP1 (Sub-Second Real-Time Posting with Precise
// Timestamps and FIFO) TC1 (single debit) and TC2 (single credit) — sourced
// from testData/tuum/frp1SubSecondPostingFifo.scenarios.json.
//
// Transaction type codes, directions and the expected GL accounts of the
// finance-api ledger pair live in the JSON so more transaction types can be
// added there without code changes.

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';
import { LedgerGlPair } from '../api/tuum/FinanceApiClient';

// Same restriction as FRP3 (todoList.md P4): only USD is exercised for now —
// other currencies are rejected up front rather than after real postings.
const SUPPORTED_CURRENCY = 'USD';

export interface Frp1ExpectedTransaction {
  // The request body doesn't say which direction a transactionTypeCode maps
  // to, so it's authored here once (amount/currencyCode are read directly
  // off `transaction.money`).
  directionCode: 'IN' | 'OUT';
  // GL accounts the finance-api ledger pair must post to for this
  // transactionTypeCode (debit side and credit side).
  ledger: LedgerGlPair;
}

export interface Frp1Scenario {
  id: string;
  description: string;
  personId: string;
  accountId: string;
  transaction: CreateTransactionRequest;
  expected: Frp1ExpectedTransaction;
}

/** Fails fast (before anything is posted) if a scenario is incomplete or unsupported. */
function assertScenarioIsUsable(scenario: Frp1Scenario): void {
  const missing: string[] = [];
  if (!scenario.accountId) missing.push('accountId');
  if (!scenario.transaction?.transactionTypeCode) missing.push('transaction.transactionTypeCode');
  if (typeof scenario.transaction?.money?.amount !== 'number')
    missing.push('transaction.money.amount');
  if (!scenario.transaction?.money?.currencyCode) missing.push('transaction.money.currencyCode');
  if (!scenario.expected?.directionCode) missing.push('expected.directionCode');
  for (const side of ['debit', 'credit'] as const) {
    const account = scenario.expected?.ledger?.[side];
    if (!account?.accountCode) missing.push(`expected.ledger.${side}.accountCode`);
    if (!account?.accountName) missing.push(`expected.ledger.${side}.accountName`);
  }
  if (missing.length > 0) {
    throw new Error(
      `FRP1 scenario "${scenario.id}" is missing required field(s): ${missing.join(', ')}`,
    );
  }
  if (scenario.transaction.money.currencyCode !== SUPPORTED_CURRENCY) {
    throw new Error(
      `FRP1 scenarios support ${SUPPORTED_CURRENCY} only for now (todoList.md P4) — ` +
        `"${scenario.id}" uses ${scenario.transaction.money.currencyCode}`,
    );
  }
}

export function getFrp1Scenarios(): Frp1Scenario[] {
  const scenarios = loadScenarios<Frp1Scenario>(
    'testData/tuum/frp1SubSecondPostingFifo.scenarios.json',
  );
  scenarios.forEach(assertScenarioIsUsable);
  return scenarios;
}
