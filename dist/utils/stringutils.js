"use strict";
// utils/stringUtils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomEmail = generateRandomEmail;
exports.isValidEmail = isValidEmail;
exports.maskSensitiveData = maskSensitiveData;
exports.toTitleCase = toTitleCase;
exports.stripWhitespace = stripWhitespace;
exports.randomString = randomString;
exports.randomInt = randomInt;
exports.containsIgnoreCase = containsIgnoreCase;
exports.truncate = truncate;
// ─── Email helpers ────────────────────────────────────────────
/**
 * Generates a unique email address using current timestamp.
 * Useful for registration tests where email must be unique per run.
 * Example output: testuser_1716800000000@test.com
 */
function generateRandomEmail(prefix = 'testuser') {
    return `${prefix}_${Date.now()}@test.com`;
}
/**
 * Checks if a string is a valid email format.
 * Used in assertions to validate email fields.
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// ─── String masking ───────────────────────────────────────────
/**
 * Masks sensitive data for safe logging.
 * Example: maskSensitiveData('secret_sauce') → 'se**********'
 */
function maskSensitiveData(value) {
    if (value.length <= 2)
        return '**';
    return value.slice(0, 2) + '*'.repeat(value.length - 2);
}
// ─── String formatting ────────────────────────────────────────
/**
 * Converts a string to title case.
 * Example: toTitleCase('sauce labs backpack') → 'Sauce Labs Backpack'
 */
function toTitleCase(value) {
    return value
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
/**
 * Removes all whitespace from a string.
 * Useful when comparing UI text that may have extra spaces.
 */
function stripWhitespace(value) {
    return value.replace(/\s+/g, '');
}
// ─── Random data generators ───────────────────────────────────
/**
 * Generates a random string of specified length.
 * Useful for filling free-text fields with unique values.
 * Example: randomString(8) → 'xK9mP2qL'
 */
function randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}
/**
 * Generates a random integer between min and max inclusive.
 * Useful for selecting random items from a list in tests.
 */
function randomInt(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// ─── Assertion helpers ────────────────────────────────────────
/**
 * Checks if a string contains another string, case insensitive.
 * Useful for partial text assertions on UI elements.
 */
function containsIgnoreCase(source, search) {
    return source.toLowerCase().includes(search.toLowerCase());
}
/**
 * Truncates a string to maxLength and appends ellipsis if truncated.
 * Useful when logging long strings in test output.
 */
function truncate(value, maxLength = 50) {
    if (value.length <= maxLength)
        return value;
    return value.slice(0, maxLength) + '...';
}
