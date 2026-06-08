// types/index.ts

// ─── User types ───────────────────────────────────────────────

export interface UserCredentials {
  username: string;
  password: string;
}

export interface TestUser extends UserCredentials {
  role: UserRole;
  fullName?: string; // optional — not all users have a display name in tests
  isLocked?: boolean; // optional — flags locked out accounts
}

// ─── Enums ────────────────────────────────────────────────────

export enum UserRole {
  STANDARD = 'standard_user',
  LOCKED = 'locked_out_user',
  PROBLEM = 'problem_user',
  ADMIN = 'admin',
}

export enum Environment {
  DEV = 'dev',
  STAGING = 'staging',
  PROD = 'prod',
}

// ─── API types ────────────────────────────────────────────────

export interface ApiResponse<T> {
  status: number;
  data: T;
  message?: string;
}

export interface LoginResponse {
  token: string;
  userId?: string;
}

// ─── Test result types ────────────────────────────────────────

export type TestStatus = 'pass' | 'fail' | 'skipped';

export interface TestMetadata {
  testId: string;
  description: string;
  tags: string[];
  status?: TestStatus;
}
