"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_USERS = exports.CHECKOUT = exports.USERS = void 0;
// data/users.ts
const types_1 = require("../types");
const envUtils_1 = require("../utils/envUtils");
// ─── Sauce Demo users ─────────────────────────────────────────
exports.USERS = {
    STANDARD: {
        username: 'standard_user',
        password: 'secret_sauce',
        role: types_1.UserRole.STANDARD,
        fullName: 'Standard User',
        isLocked: false,
    },
    LOCKED: {
        username: 'locked_out_user',
        password: 'secret_sauce',
        role: types_1.UserRole.LOCKED,
        fullName: 'Locked Out User',
        isLocked: true,
    },
    PROBLEM: {
        username: 'problem_user',
        password: 'secret_sauce',
        role: types_1.UserRole.PROBLEM,
        fullName: 'Problem User',
        isLocked: false,
    },
    INVALID: {
        username: 'invalid_user',
        password: 'wrong_password',
        role: types_1.UserRole.STANDARD, // role is irrelevant — login will fail
        isLocked: false,
    },
};
exports.CHECKOUT = {
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
exports.API_USERS = {
    VALID: {
        email: (0, envUtils_1.getOptionalEnv)('REQRES_VALID_EMAIL', 'eve.holt@reqres.in'),
        password: (0, envUtils_1.getOptionalEnv)('REQRES_VALID_PASSWORD', 'cityslicka'),
    },
    INVALID: {
        email: 'invalid@test.com',
        password: 'wrongpassword',
    },
};
