// utils/testDataLoader.ts
import * as fs from 'fs';
import * as path from 'path';

// This file lives at playwright-framework/utils/testDataLoader.ts, so the
// project root is one directory up. Resolving from __dirname (rather than
// process.cwd()) means this works the same regardless of how the test was
// launched — terminal, VS Code's Playwright extension, CI, a debugger, etc.
// all set process.cwd() differently, but __dirname never changes.
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Loads and type-casts an array of test scenarios from a JSON file.
 * relativePath is resolved from the project root (playwright-framework/),
 * e.g. loadScenarios<Foo>('testData/tuum/postLedgerEntry.scenarios.json').
 *
 * Fails fast with a clear message if the file is missing, isn't valid JSON,
 * or doesn't contain a top-level array — deeper per-field validation is not
 * done here (deferred, per current framework scope).
 */
export function loadScenarios<T>(relativePath: string): T[] {
  const fullPath = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Test data file not found: ${relativePath}\n` + `Resolved to: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Test data file is not valid JSON: ${relativePath}\n` + `${(error as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Test data file must contain a top-level JSON array: ${relativePath}`);
  }

  return parsed as T[];
}
