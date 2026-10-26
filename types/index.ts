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
  // Populated by Tuum client methods that use parseTuumEnvelope() instead of
  // parseTuumData() — carries the envelope's own errors/validationErrors
  // alongside the unwrapped data, so callers can assert "errors is null" /
  // "validationErrors is null" the way the source Postman scripts did.
  errors?: string[] | null;
  validationErrors?: ValidationErrorEntry[] | null;
}

export interface LoginResponse {
  token: string;
  userId?: string;
}

// ─── Tuum API envelope ──────────────────────────────────────
// Every Tuum microservice (auth-api, person-api, account-api...) wraps
// its payload in this shape: { errors, validationErrors, data }.

export interface ValidationErrorDetail {
  code: string;
  translations: Record<string, string>;
}

export interface ValidationErrorEntry {
  field: string;
  errors: ValidationErrorDetail[];
}

export interface TuumApiEnvelope<T> {
  errors: string[] | null;
  validationErrors: ValidationErrorEntry[] | null;
  data: T;
}

// account-api (and others) wrap list endpoints in this pagination shape,
// nested inside TuumApiEnvelope['data'].
export interface PaginatedResult<T> {
  values: T[];
  pageNumber: number;
  pageSize: number;
  endReached: boolean;
  total?: number;
}

// ─── Test result types ────────────────────────────────────────

export type TestStatus = 'pass' | 'fail' | 'skipped';

export interface TestMetadata {
  testId: string;
  description: string;
  tags: string[];
  status?: TestStatus;
}
