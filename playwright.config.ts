import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const getBaseURL = (): string => {
  const app = process.env['APP'] ?? 'saucedemo';
  const urlMap: Record<string, string> = {
    saucedemo: process.env['BASE_URL_SAUCEDEMO'] ?? 'https://www.saucedemo.com',
    internet:  process.env['BASE_URL_INTERNET']  ?? 'https://the-internet.herokuapp.com',
  };
  return urlMap[app] ?? 'https://www.saucedemo.com';
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['allure-playwright'],
  ],
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
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});