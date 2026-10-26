import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Computed once here (before worker processes are spawned) and inherited by
// every worker's env, so suiteTitleWithRunTimestamp() sees the SAME value in
// the main "list" process and in each worker's re-import of a spec file.
// Playwright requires describe()/test() titles to match exactly between
// those two passes — two independent `new Date()` calls would differ by a
// few milliseconds and break the worker's test lookup ("Test not found in
// the worker process").
process.env.TEST_RUN_TIMESTAMP ??= new Date().toISOString();

const getBaseURL = (): string => {
  const app = process.env['APP'];

  if (!app) {
    throw new Error(
      `APP environment variable is not set.\n` +
        `Set it in your .env file or pass it in the command line.\n` +
        `Valid options are: saucedemo, internet, tuumbackoffice`,
    );
  }

  const urlMap: Record<string, string> = {
    saucedemo: process.env['BASE_URL_SAUCEDEMO'] ?? 'https://www.saucedemo.com',
    internet: process.env['BASE_URL_INTERNET'] ?? 'https://the-internet.herokuapp.com',
    tuumbackoffice:
      process.env['BASE_URL_TUUMBACKOFFICE'] ?? 'https://backoffice.cab-dev.tuumplatform.com',
  };

  if (!urlMap[app]) {
    throw new Error(
      `Unknown APP value: "${app}". Valid options are: ${Object.keys(urlMap).join(', ')}`,
    );
  }

  return urlMap[app];
};

// API specs (*.api.spec.ts) never touch a browser, so they run under one
// project only — otherwise each would run once per browser project and post
// its real Tuum transactions three times per run.
const API_SPECS = /\.api\.spec\.ts$/;

export default defineConfig({
  testDir: './tests',
  // Sequential by default: the Tuum FRP specs share an account (ID-1048) and
  // reconcile its balance step by step, so two specs posting to it at the
  // same time would break each other's balance checks. Run in parallel on
  // demand with `npm run test:parallel` (or `--fully-parallel --workers=N`),
  // which override these two settings from the command line.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['allure-playwright']],
  use: {
    baseURL: getBaseURL(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: API_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: API_SPECS,
    },
  ],
});
