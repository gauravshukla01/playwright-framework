// data/tuumFrp2Data.ts
// Scenario-driven datasets for FRP2 (Exactly-Once Processing Idempotency):
//   TC1 — duplicate debit/credit is not posted twice
//         (testData/tuum/frp2ExactlyOnceIdempotency.scenarios.json)
//   TC2 — new transactions with a unique x-request-id are posted
//         (testData/tuum/frp2UniqueRequestId.scenarios.json)
// valueDate, transactionDTime, x-request-id, referenceNumber,
// uniqueIdentifier and sourceRef are NOT in the JSON — the spec generates
// them at run time (today/now/fresh UUIDs).

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';

export interface Frp2ExpectedTransaction {
  // Can't be derived from the request body alone — a transactionTypeCode
  // doesn't say which direction it maps to.
  directionCode: 'IN' | 'OUT';
}

export interface Frp2TransactionCase {
  transaction: CreateTransactionRequest;
  expected: Frp2ExpectedTransaction;
}

export interface Frp2DuplicateScenario extends Frp2TransactionCase {
  id: string;
  description: string;
  accountId: string;
}

export interface Frp2UniqueRequestIdScenario {
  id: string;
  description: string;
  accountId: string;
  transactions: Frp2TransactionCase[];
}

/**
 * Fails fast (before anything is posted) if a scenario is missing the
 * values every request needs — the TS equivalent of the collection-level
 * pre-request warning for empty {{accountId}} / {{amount}} / {{currencyCode}}.
 */
function assertRequiredFields(
  scenarioId: string,
  accountId: string,
  transaction: CreateTransactionRequest,
): void {
  const missing: string[] = [];
  if (!accountId) missing.push('accountId');
  if (typeof transaction?.money?.amount !== 'number') missing.push('transaction.money.amount');
  if (!transaction?.money?.currencyCode) missing.push('transaction.money.currencyCode');
  if (!transaction?.transactionTypeCode) missing.push('transaction.transactionTypeCode');
  if (missing.length > 0) {
    throw new Error(
      `FRP2 scenario "${scenarioId}" is missing required field(s): ${missing.join(', ')}`,
    );
  }
}

export function getFrp2DuplicateScenarios(): Frp2DuplicateScenario[] {
  const scenarios = loadScenarios<Frp2DuplicateScenario>(
    'testData/tuum/frp2ExactlyOnceIdempotency.scenarios.json',
  );
  for (const scenario of scenarios) {
    assertRequiredFields(scenario.id, scenario.accountId, scenario.transaction);
  }
  return scenarios;
}

export function getFrp2UniqueRequestIdScenarios(): Frp2UniqueRequestIdScenario[] {
  const scenarios = loadScenarios<Frp2UniqueRequestIdScenario>(
    'testData/tuum/frp2UniqueRequestId.scenarios.json',
  );
  for (const scenario of scenarios) {
    if (!Array.isArray(scenario.transactions) || scenario.transactions.length === 0) {
      throw new Error(`FRP2 scenario "${scenario.id}" must have a non-empty "transactions" array`);
    }
    scenario.transactions.forEach((entry, index) =>
      assertRequiredFields(
        `${scenario.id} transactions[${index}]`,
        scenario.accountId,
        entry.transaction,
      ),
    );
  }
  return scenarios;
}
