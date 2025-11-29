/**
 * Error Utility Functions
 *
 * @packageDocumentation
 * @module utils
 *
 * Dependencies: none
 */

import { randomUUID } from 'crypto';

/**
 * Generate Unique Error ID
 *
 * Generates a UUID to uniquely identify each error in JSON:API error responses.
 * Uses crypto.randomUUID() to prevent collisions.
 *
 * @returns Unique error identifier (UUID v4 format)
 *
 * @example
 * ```typescript
 * const errorId = generateErrorId();
 * // e.g., "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateErrorId(): string {
  return randomUUID();
}
