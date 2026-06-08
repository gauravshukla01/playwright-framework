"use strict";
// types/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = exports.UserRole = void 0;
// ─── Enums ────────────────────────────────────────────────────
var UserRole;
(function (UserRole) {
    UserRole["STANDARD"] = "standard_user";
    UserRole["LOCKED"] = "locked_out_user";
    UserRole["PROBLEM"] = "problem_user";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var Environment;
(function (Environment) {
    Environment["DEV"] = "dev";
    Environment["STAGING"] = "staging";
    Environment["PROD"] = "prod";
})(Environment || (exports.Environment = Environment = {}));
