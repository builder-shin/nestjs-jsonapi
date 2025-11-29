/**
 * ID Conversion Utility Functions
 *
 * @packageDocumentation
 * @module utils
 *
 * Dependencies: interfaces (IdType)
 */

import { BadRequestException } from '@nestjs/common';
import { IdType } from '../interfaces';

/**
 * UUID v4 format regex
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * CUID v1 format regex
 * - Starts with 'c' and total 25 characters (c + 24 chars)
 */
const CUID_V1_REGEX = /^c[a-z0-9]{24}$/;

/**
 * CUID v2 format regex
 * - 24 lowercase letters and numbers (default length)
 * - First character must be lowercase letter
 */
const CUID_V2_REGEX = /^[a-z][a-z0-9]{23}$/;

/**
 * CUID validation function (supports both v1 and v2)
 *
 * @param id ID string to validate
 * @returns Whether it's CUID format
 */
function isValidCuid(id: string): boolean {
  return CUID_V1_REGEX.test(id) || CUID_V2_REGEX.test(id);
}

/**
 * Convert string ID to appropriate type based on ID type setting
 *
 * In JSON:API, IDs are always passed as strings,
 * but databases can use various types.
 * This function performs appropriate conversion based on ID type setting.
 *
 * @param id Input ID (string)
 * @param idType ID type setting
 * @returns Converted ID (string or number)
 * @throws BadRequestException for invalid ID format
 *
 * @example
 * ```typescript
 * // Number ID
 * convertId('123', 'number'); // 123
 *
 * // UUID
 * convertId('550e8400-e29b-41d4-a716-446655440000', 'uuid');
 *
 * // Auto-detect
 * convertId('123', 'auto'); // 123 (converted to number)
 * convertId('abc123', 'auto'); // 'abc123' (kept as string)
 * ```
 */
export function convertId(
  id: string,
  idType: IdType = 'string',
): string | number {
  switch (idType) {
    case 'number': {
      const numId = Number(id);
      if (Number.isNaN(numId) || !Number.isInteger(numId)) {
        throw new BadRequestException({
          errors: [
            {
              status: '400',
              code: 'INVALID_ID_FORMAT',
              title: 'Invalid ID format',
              detail: `ID "${id}" is not a valid integer`,
              source: { parameter: 'id' },
            },
          ],
        });
      }
      return numId;
    }

    case 'uuid':
      if (!UUID_REGEX.test(id)) {
        throw new BadRequestException({
          errors: [
            {
              status: '400',
              code: 'INVALID_ID_FORMAT',
              title: 'Invalid ID format',
              detail: `ID "${id}" is not a valid UUID`,
              source: { parameter: 'id' },
            },
          ],
        });
      }
      return id;

    case 'cuid':
      if (!isValidCuid(id)) {
        throw new BadRequestException({
          errors: [
            {
              status: '400',
              code: 'INVALID_ID_FORMAT',
              title: 'Invalid ID format',
              detail: `ID "${id}" is not a valid CUID`,
              source: { parameter: 'id' },
            },
          ],
        });
      }
      return id;

    case 'auto': {
      // Convert to number if possible
      const numId = Number(id);
      if (!Number.isNaN(numId) && Number.isInteger(numId) && numId > 0) {
        return numId;
      }
      // Keep as is if UUID format
      if (UUID_REGEX.test(id)) {
        return id;
      }
      // Keep as is if CUID format
      if (isValidCuid(id)) {
        return id;
      }
      // Return string as default
      return id;
    }

    case 'string':
    default:
      return id;
  }
}

/**
 * Convert ID to string (for serialization)
 *
 * In JSON:API responses, IDs must always be strings.
 * This function converts numeric IDs to strings.
 *
 * @param id Input ID (string or number)
 * @returns String ID
 *
 * @example
 * ```typescript
 * stringifyId(123); // '123'
 * stringifyId('abc'); // 'abc'
 * ```
 */
export function stringifyId(id: string | number): string {
  return String(id);
}

/**
 * Convert ID array
 *
 * Used to convert multiple IDs at once.
 *
 * @param ids ID string array
 * @param idType ID type setting
 * @returns Converted ID array
 *
 * @example
 * ```typescript
 * convertIds(['1', '2', '3'], 'number'); // [1, 2, 3]
 * ```
 */
export function convertIds(
  ids: string[],
  idType: IdType = 'string',
): (string | number)[] {
  return ids.map((id) => convertId(id, idType));
}
