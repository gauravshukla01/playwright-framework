// data/tuumFrp3Data.ts
// Scenario-driven dataset for FRP3 (Ledger Immutability — Append-Only) TC1:
// a transaction is reversed via API and the reversal must be an equal and
// opposite, linked, offsetting entry — sourced from
// testData/tuum/frp3LedgerImmutability.scenarios.json.
// FRP3 TC2 (reversal with fee) is deferred — not working on the Tuum side yet.
//
// Transaction type codes, directions and expected GL accounts live in the
// JSON so more variations can be added there without code changes.
// valueDate, transactionDTime and all ids/keys are generated at run time.

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';
import { LedgerGlPair } from '../api/tuum/FinanceApiClient';

// The reversal-ledger check asserts reportingCcyExchangeRate === 1, which
// only holds for USD here (see todoList.md P4) — other currencies are
// rejected up front rather than failing confusingly after real postings.
const SUPPORTED_CURRENCY = 'USD';

export interface Frp3Expected {
  directionCode: 'IN' | 'OUT';
  reversalDirectionCode: 'IN' | 'OUT';
  ledger: {
    original: LedgerGlPair;
    reversal: LedgerGlPair;
  };
}

export interface Frp3Scenario {
  id: string;
  description: string;
  accountId: string;
  transaction: CreateTransactionRequest;
  reversal: { transactionTypeCode: string };
  expected: Frp3Expected;
}

/** Fails fast (before anything is posted) if a scenario is incomplete or unsupported. */
function assertScenarioIsUsable(scenario: Frp3Scenario): void {
  const missing: string[] = [];
  if (!scenario.accountId) missing.push('accountId');
  if (!scenario.transaction?.transactionTypeCode) missing.push('transaction.transactionTypeCode');
  if (typeof scenario.transaction?.money?.amount !== 'number')
    missing.push('transaction.money.amount');
  if (!scenario.transaction?.money?.currencyCode) missing.push('transaction.money.currencyCode');
  if (!scenario.reversal?.transactionTypeCode) missing.push('reversal.transactionTypeCode');
  if (!scenario.expected?.directionCode) missing.push('expected.directionCode');
  if (!scenario.expected?.reversalDirectionCode) missing.push('expected.reversalDirectionCode');
  for (const pair of ['original', 'reversal'] as const) {
    for (const side of ['debit', 'credit'] as const) {
      const account = scenario.expected?.ledger?.[pair]?.[side];
      if (!account?.accountCode) missing.push(`expected.ledger.${pair}.${side}.accountCode`);
      if (!account?.accountName) missing.push(`expected.ledger.${pair}.${side}.accountName`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `FRP3 scenario "${scenario.id}" is missing required field(s): ${missing.join(', ')}`,
    );
  }
  if (scenario.transaction.money.currencyCode !== SUPPORTED_CURRENCY) {
    throw new Error(
      `FRP3 scenarios support ${SUPPORTED_CURRENCY} only for now (todoList.md P4) — ` +
        `"${scenario.id}" uses ${scenario.transaction.money.currencyCode}`,
    );
  }
}

export function getFrp3Scenarios(): Frp3Scenario[] {
  const scenarios = loadScenarios<Frp3Scenario>(
    'testData/tuum/frp3LedgerImmutability.scenarios.json',
  );
  scenarios.forEach(assertScenarioIsUsable);
  return scenarios;
}
