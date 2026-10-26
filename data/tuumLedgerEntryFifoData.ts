// data/tuumLedgerEntryFifoData.ts
// Scenario-driven dataset for the "post ledger entry FIFO ordering" API
// test — one file per scale (10/100/200) so each can be edited/versioned
// independently. All scenarios load into the same spec; use `--grep` on a
// scenario's description (e.g. --grep "100 near-simultaneous") to run just
// one scale instead of all three.

import { loadScenarios } from '../utils/testDataLoader';
import { CreateTransactionRequest } from '../api/tuum/AccountApiClient';

export interface PostLedgerEntryFifoScenario {
  id: string;
  description: string;
  accountId: string;
  gapMs: number;
  // Set this to the real Tuum server's current date before each run — this
  // sandbox's system clock isn't reliable for computing it (confirmed via
  // err.valueDateTooEarlyByRules on a mismatch). Omit to let the server
  // default it instead.
  valueDate?: string;
  transactions: CreateTransactionRequest[];
}

const SCENARIO_FILES = [
  'testData/tuum/postLedgerEntryFifo10.scenarios.json',
  'testData/tuum/postLedgerEntryFifo100.scenarios.json',
  'testData/tuum/postLedgerEntryFifo200.scenarios.json',
];

export function getLedgerEntryFifoScenarios(): PostLedgerEntryFifoScenario[] {
  return SCENARIO_FILES.flatMap((file) => loadScenarios<PostLedgerEntryFifoScenario>(file));
}
