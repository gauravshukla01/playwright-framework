// data/users.ts
import { TestUser, UserRole } from '../types';
import { getOptionalEnv } from '../utils/envUtils';

// ─── Sauce Demo users ─────────────────────────────────────────

export const USERS: Record<string, TestUser> = {
  STANDARD: {
    username: 'standard_user',
    password: 'secret_sauce',
    role: UserRole.STANDARD,
    fullName: 'Standard User',
    isLocked: false,
  },

  LOCKED: {
    username: 'locked_out_user',
    password: 'secret_sauce',
    role: UserRole.LOCKED,
    fullName: 'Locked Out User',
    isLocked: true,
  },

  PROBLEM: {
    username: 'problem_user',
    password: 'secret_sauce',
    role: UserRole.PROBLEM,
    fullName: 'Problem User',
    isLocked: false,
  },

  INVALID: {
    username: 'invalid_user',
    password: 'wrong_password',
    role: UserRole.STANDARD, // role is irrelevant — login will fail
    isLocked: false,
  },
};

// ─── Checkout form data ───────────────────────────────────────

export interface CheckoutDetails {
  firstName: string;
  lastName: string;
  postCode: string;
}

export const CHECKOUT: Record<string, CheckoutDetails> = {
  VALID: {
    firstName: 'Test',
    lastName: 'User',
    postCode: 'SW1A 1AA',
  },

  MISSING_FIRSTNAME: {
    firstName: '',
    lastName: 'User',
    postCode: 'SW1A 1AA',
  },

  MISSING_POSTCODE: {
    firstName: 'Test',
    lastName: 'User',
    postCode: '',
  },
};
// ─── API test credentials (reqres.in) ─────────────────────────

export interface ApiCredentials {
  email:    string;
  password: string;
}

export interface ApiCredentials {
  email:    string;
  password: string;
}

export const API_USERS = {
  VALID: {
    email:    getOptionalEnv('REQRES_VALID_EMAIL', 'eve.holt@reqres.in'),
    password: getOptionalEnv('REQRES_VALID_PASSWORD', 'cityslicka'),
  } as ApiCredentials,

  INVALID: {
    email:    'invalid@test.com',
    password: 'wrongpassword',
  } as ApiCredentials,
};