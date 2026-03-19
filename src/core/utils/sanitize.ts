/**
 * src/core/utils/sanitize.ts — Input sanitization utilities.
 *
 * All user-facing strings should go through sanitizeInput() with maxLength.
 */

/**
 * Sanitizes a user-facing string by trimming whitespace and enforcing maxLength.
 * Returns empty string for null/undefined inputs.
 */
export function sanitizeInput(input: string | null | undefined, maxLength: number): string {
  if (!input) return '';
  return input.trim().slice(0, maxLength);
}
