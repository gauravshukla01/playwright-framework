// utils/allureUtils.ts
import { allure } from 'allure-playwright';

// ─── Types ────────────────────────────────────────────────────

type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface TestInfo {
  description: string;
  severity:    Severity;
  feature:     string;
  story:       string;
  tags:        string[];
  owner?:      string;
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
export async function step<T>(
  name: string,
  action: () => Promise<T>,
): Promise<void> {
  await allure.step(name, async () => {
    await action();
  });
}

// ─── Predefined tag sets ──────────────────────────────────────
// Keeps tag naming consistent across the team

export const Tags = {
  SMOKE:      'smoke',
  REGRESSION: 'regression',
  NEGATIVE:   'negative',
  LOGIN:      'login',
  CHECKOUT:   'checkout',
  API:        'api',
} as const;

// ─── Predefined feature names ─────────────────────────────────

export const Features = {
  AUTHENTICATION: 'Authentication',
  CHECKOUT:       'Checkout',
  CART:           'Cart',
  API_AUTH:       'API Authentication',
  DROPWDOWN:      'DropDown',
} as const;