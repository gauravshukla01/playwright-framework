// utils/allureUtils.ts
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

// ─── Types ────────────────────────────────────────────────────

type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface TestInfo {
  description: string;
  severity: Severity;
  feature: string;
  story: string;
  tags: string[];
  owner?: string;
}

// ─── Test metadata helper ─────────────────────────────────────

/**
 * Sets Allure metadata for a test in one call.
 * Call at the top of every test before any actions.
 */
export async function setTestInfo(options: TestInfo): Promise<void> {
  await allure.description(options.description);
  await allure.severity(options.severity);
  await allure.feature(options.feature);
  await allure.story(options.story);
  await allure.owner(options.owner ?? 'SDET Team');
  for (const tag of options.tags) {
    await allure.tag(tag);
  }
}

// ─── Step helper ──────────────────────────────────────────────

/**
 * Wraps a block of actions in a named Allure step.
 * Use at meaningful boundaries only — not for every single action.
 */
export async function step<T>(name: string, action: () => Promise<T>): Promise<void> {
  await allure.step(name, async () => {
    await action();
  });
}

// ─── Suite-title helper ────────────────────────────────────────

/**
 * Appends the current run's timestamp to a test.describe() title, so when
 * allure-results accumulates across multiple runs of the same spec file,
 * each run's entry in the Allure Suites view is distinguishable at a
 * glance instead of showing several identically-named suites.
 *
 * Reads TEST_RUN_TIMESTAMP (set once in playwright.config.ts, before worker
 * processes are spawned) rather than calling `new Date()` here — Playwright
 * requires describe()/test() titles to match exactly between its main
 * "list" pass and each worker's re-import of the spec file, and two
 * independent `new Date()` calls would differ by a few milliseconds,
 * breaking the worker's test lookup ("Test not found in the worker
 * process"). Falls back to computing one directly if run outside the
 * Playwright test runner (e.g. an ad-hoc script).
 */
export function suiteTitleWithRunTimestamp(title: string): string {
  const raw = process.env.TEST_RUN_TIMESTAMP ?? new Date().toISOString();
  const timestamp = raw.replace('T', ' ').replace('Z', ' UTC');
  return `${title} [${timestamp}]`;
}

// ─── Value-logging helpers ─────────────────────────────────────
// Call from inside a step() block so actual/expected values a test
// compared are visible in the Allure report on pass AND fail, not just
// in a failure diff. Use logValues() for scalars (ids, amounts, codes) —
// renders as a flat key/value table under the step. Use logAttachment()
// for a full object/array (e.g. a whole response body) — renders as an
// expandable JSON blob.
//
// Off by default — a no-op unless ALLURE_LOG_VALUES=true is set for the
// run. A bulk/load run (hundreds of transactions) would otherwise bloat
// every step with parameters/attachments nobody needs that run; set the
// env var only when you actually want to inspect values in the report.

function isValueLoggingEnabled(): boolean {
  return process.env.ALLURE_LOG_VALUES === 'true';
}

/**
 * Attaches scalar values (ids, amounts, codes, etc.) to the current
 * Allure step as parameters, e.g.:
 *   await logValues({ transactionId, expectedAmount: expected.amount });
 * No-op unless ALLURE_LOG_VALUES=true is set for the run.
 */
export async function logValues(values: Record<string, unknown>): Promise<void> {
  if (!isValueLoggingEnabled()) return;
  for (const [key, value] of Object.entries(values)) {
    await allure.parameter(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}

/**
 * Attaches a full object/array (e.g. a response body) to the current
 * Allure step as pretty-printed JSON, e.g.:
 *   await logAttachment('Balances response', response.data);
 * No-op unless ALLURE_LOG_VALUES=true is set for the run.
 */
export async function logAttachment(name: string, content: unknown): Promise<void> {
  if (!isValueLoggingEnabled()) return;
  await allure.attachment(name, JSON.stringify(content, null, 2), 'application/json');
}

/**
 * Always-on (unlike logValues/logAttachment) report of something observed
 * during a run that isn't a pass/fail on its own but should be visible —
 * e.g. how long finance-api took to write ledger entries. Shows as a test
 * annotation in the Playwright HTML report and a text attachment in Allure.
 */
export async function reportObservation(title: string, message: string): Promise<void> {
  test.info().annotations.push({ type: title, description: message });
  await allure.attachment(title, message, 'text/plain');
}

// ─── Predefined tag sets ──────────────────────────────────────
// Keeps tag naming consistent across the team

export const Tags = {
  SMOKE: 'smoke',
  REGRESSION: 'regression',
  NEGATIVE: 'negative',
  LOGIN: 'login',
  CHECKOUT: 'checkout',
  API: 'api',
  TUUM_LOGIN: 'tuum-login',
  TUUM_NOTIFICATIONS: 'tuum-notifications',
  TUUM_LEDGER_ENTRY: 'tuum-ledger-entry',
  TUUM_CREATE_PERSON_ACCOUNT: 'tuum-create-person-account',
  TUUM_IDEMPOTENCY: 'tuum-idempotency',
  TUUM_LEDGER_IMMUTABILITY: 'tuum-ledger-immutability',
} as const;

// ─── Predefined feature names ─────────────────────────────────

export const Features = {
  AUTHENTICATION: 'Authentication',
  CHECKOUT: 'Checkout',
  CART: 'Cart',
  API_AUTH: 'API Authentication',
  DROPWDOWN: 'DropDown',
  TUUM_AUTH: 'Tuum Authentication',
  TUUM_NOTIFICATIONS: 'Tuum Notifications',
  TUUM_LEDGER_ENTRY: 'Tuum Ledger Entry',
  TUUM_CREATE_PERSON_ACCOUNT: 'Tuum Create Person & Account',
  TUUM_IDEMPOTENCY: 'Tuum Exactly-Once Processing (Idempotency)',
  TUUM_LEDGER_IMMUTABILITY: 'Tuum Ledger Immutability (Append-Only)',
} as const;
