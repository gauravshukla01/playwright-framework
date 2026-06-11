// utils/envUtils.ts
import * as dotenv from 'dotenv';

dotenv.config();

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

export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// ─── Typed environment config ─────────────────────────────────
// Changed from a plain object to a function — values are only
// read when getENV() is actually called, not at import time

export function getENV() {
  return {
    REQRES_API_KEY:     getRequiredEnv('REQRES_API_KEY'),
    REQRES_BASE_URL:    getOptionalEnv('REQRES_BASE_URL', 'https://reqres.in'),
    BASE_URL_SAUCEDEMO: getOptionalEnv('BASE_URL_SAUCEDEMO', 'https://www.saucedemo.com'),
    BASE_URL_INTERNET:  getOptionalEnv('BASE_URL_INTERNET', 'https://the-internet.herokuapp.com'),
    APP:                getOptionalEnv('APP', 'saucedemo'),
  };
}