// utils/stringUtils.ts

// ─── Email helpers ────────────────────────────────────────────

/**
 * Generates a unique email address using current timestamp.
 * Useful for registration tests where email must be unique per run.
 * Example output: testuser_1716800000000@test.com
 */
export function generateRandomEmail(prefix: string = 'testuser'): string {
  return `${prefix}_${Date.now()}@test.com`;
}

/**
 * Checks if a string is a valid email format.
 * Used in assertions to validate email fields.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── String masking ───────────────────────────────────────────

/**
 * Masks sensitive data for safe logging.
 * Example: maskSensitiveData('secret_sauce') → 'se**********'
 */
export function maskSensitiveData(value: string): string {
  if (value.length <= 2) return '**';
  return value.slice(0, 2) + '*'.repeat(value.length - 2);
}

// ─── String formatting ────────────────────────────────────────

/**
 * Converts a string to title case.
 * Example: toTitleCase('sauce labs backpack') → 'Sauce Labs Backpack'
 */
export function toTitleCase(value: string): string {
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
export function stripWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}

// ─── Random data generators ───────────────────────────────────

/**
 * Generates a random string of specified length.
 * Useful for filling free-text fields with unique values.
 * Example: randomString(8) → 'xK9mP2qL'
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
    '',
  );
}

/**
 * Generates a random integer between min and max inclusive.
 * Useful for selecting random items from a list in tests.
 */
export function randomInt(min: number = 1, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Assertion helpers ────────────────────────────────────────

/**
 * Checks if a string contains another string, case insensitive.
 * Useful for partial text assertions on UI elements.
 */
export function containsIgnoreCase(source: string, search: string): boolean {
  return source.toLowerCase().includes(search.toLowerCase());
}

/**
 * Truncates a string to maxLength and appends ellipsis if truncated.
 * Useful when logging long strings in test output.
 */
export function truncate(value: string, maxLength: number = 50): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '...';
}
