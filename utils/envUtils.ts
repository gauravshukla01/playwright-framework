// utils/envUtils.ts
import * as dotenv from 'dotenv';

// Load .env file into process.env at import time
dotenv.config();

// ─── Environment variable reader ──────────────────────────────

/**
 * Reads a required environment variable.
 * Throws immediately if the variable is missing or empty —
 * fail fast rather than getting a cryptic error later in the test.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Set it in your .env file — see .env.example for reference.`,
    );
  }
  return value;
}

/**
 * Reads an optional environment variable.
 * Returns the default value if the variable is missing.
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// ─── Typed environment config ─────────────────────────────────
// One place to read all env variables — no process.env scattered
// across the codebase

export const ENV = {
  REQRES_API_KEY:      getRequiredEnv('REQRES_API_KEY'),
  REQRES_BASE_URL:     getOptionalEnv('REQRES_BASE_URL', 'https://reqres.in'),
  BASE_URL_SAUCEDEMO:  getOptionalEnv('BASE_URL_SAUCEDEMO', 'https://www.saucedemo.com'),
  BASE_URL_INTERNET:   getOptionalEnv('BASE_URL_INTERNET', 'https://the-internet.herokuapp.com'),
  APP:                 getOptionalEnv('APP', 'saucedemo'),
};