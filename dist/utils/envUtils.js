"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
exports.getRequiredEnv = getRequiredEnv;
exports.getOptionalEnv = getOptionalEnv;
// utils/envUtils.ts
const dotenv = __importStar(require("dotenv"));
// Load .env file into process.env at import time
dotenv.config();
// ─── Environment variable reader ──────────────────────────────
/**
 * Reads a required environment variable.
 * Throws immediately if the variable is missing or empty —
 * fail fast rather than getting a cryptic error later in the test.
 */
function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}\n` +
            `Set it in your .env file — see .env.example for reference.`);
    }
    return value;
}
/**
 * Reads an optional environment variable.
 * Returns the default value if the variable is missing.
 */
function getOptionalEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
// ─── Typed environment config ─────────────────────────────────
// One place to read all env variables — no process.env scattered
// across the codebase
exports.ENV = {
    REQRES_API_KEY: getRequiredEnv('REQRES_API_KEY'),
    REQRES_BASE_URL: getOptionalEnv('REQRES_BASE_URL', 'https://reqres.in'),
    BASE_URL_SAUCEDEMO: getOptionalEnv('BASE_URL_SAUCEDEMO', 'https://www.saucedemo.com'),
    BASE_URL_INTERNET: getOptionalEnv('BASE_URL_INTERNET', 'https://the-internet.herokuapp.com'),
    APP: getOptionalEnv('APP', 'saucedemo'),
};
