/**
 * Query Parameter Parsing Helper Functions
 *
 * @packageDocumentation
 * @module utils
 *
 * @dependencies
 * - @nestjs/common: BadRequestException
 * - ../interfaces: FilterOperator, VALID_FILTER_OPERATORS
 */

import { BadRequestException } from '@nestjs/common';
import { FilterOperator, VALID_FILTER_OPERATORS } from '../interfaces';

/**
 * Validate operator
 *
 * @param op - Operator string to validate
 * @returns true if valid FilterOperator
 */
export function isValidOperator(op: string): op is FilterOperator {
  return VALID_FILTER_OPERATORS.includes(op as FilterOperator);
}

/**
 * Field name validation regex
 * - Only allows alphanumeric, underscore, and dot (for nested relations)
 * - Blocks special characters to prevent SQL injection
 */
const VALID_FIELD_NAME_REGEX =
  /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/**
 * Validate field name (SQL/Query injection prevention)
 *
 * @param field - Field name to validate
 * @returns true if valid
 *
 * @example
 * ```typescript
 * isValidFieldName('name'); // true
 * isValidFieldName('author.name'); // true
 * isValidFieldName('user_profile'); // true
 * isValidFieldName('123name'); // false (starts with number)
 * isValidFieldName('name;DROP TABLE'); // false (contains special characters)
 * ```
 */
export function isValidFieldName(field: string): boolean {
  if (!field || field.length > 100) {
    return false;
  }
  return VALID_FIELD_NAME_REGEX.test(field);
}

/**
 * ISO 8601 date string detection regex
 * Example: 2024-01-15, 2024-01-15T10:30:00, 2024-01-15T10:30:00.000Z, 2024-01-15T10:30:00.123456Z
 * Supports 1-6 digits for milliseconds/microseconds
 */
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Check if string is ISO 8601 date format
 */
function isIsoDateString(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

/**
 * Validate if date is valid
 *
 * JavaScript's Date auto-corrects invalid dates (e.g., 2024-02-30 → 2024-03-01).
 * This function compares the date part of the original string with the parsed Date object
 * to check if auto-correction occurred.
 *
 * @param dateString - ISO 8601 format date string
 * @param date - Parsed Date object
 * @returns true if valid date, false if auto-corrected
 *
 * @example
 * ```typescript
 * isValidDate("2024-02-29", new Date("2024-02-29")); // true (leap year)
 * isValidDate("2024-02-30", new Date("2024-02-30")); // false (auto-corrected)
 * isValidDate("2023-02-29", new Date("2023-02-29")); // false (not a leap year)
 * ```
 */
function isValidDate(dateString: string, date: Date): boolean {
  // Extract date part only (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  const [yearStr, monthStr, dayStr] = datePart.split('-');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Compare with actual Date object values
  // getMonth() is 0-based, so +1 is needed
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

/**
 * Convert value to appropriate type (number, date, or original string)
 */
function convertValue(value: string): unknown {
  // Try number conversion
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }

  // Convert ISO date string to Date object
  if (isIsoDateString(value)) {
    const date = new Date(value);
    // Check if valid date (reject both Invalid Date and auto-corrected dates)
    if (!isNaN(date.getTime()) && isValidDate(value, date)) {
      return date;
    }
  }

  // Otherwise return original string
  return value;
}

/**
 * Parse filter value (convert based on operator)
 *
 * @param operator - Filter operator
 * @param value - Filter value
 * @param field - Filter target field name (optional, for error messages)
 * @returns Parsed filter value
 * @throws BadRequestException JSON:API formatted error
 *
 * @example
 * ```typescript
 * parseFilterValue('in', 'admin,user'); // ['admin', 'user']
 * parseFilterValue('between', '100,500'); // [100, 500]
 * parseFilterValue('null', 'true'); // true
 * ```
 */
export function parseFilterValue(
  operator: FilterOperator,
  value: unknown,
  field?: string,
): unknown {
  const strValue = String(value);

  switch (operator) {
    case 'in':
    case 'nin':
      // Convert to comma-separated array, apply type conversion to each value
      return strValue.split(',').map((v) => convertValue(v.trim()));

    case 'between': {
      // Two comma-separated values [start, end]
      const parts = strValue.split(',').map((v) => v.trim());
      if (parts.length !== 2) {
        throw new BadRequestException({
          errors: [
            {
              status: '400',
              code: 'INVALID_FILTER_VALUE',
              title: 'Invalid filter value',
              detail: `The 'between' operator requires exactly 2 comma-separated values, but got ${parts.length}. Example: filter[${field || 'field'}][between]=min,max`,
              source: {
                parameter: field
                  ? `filter[${field}][between]`
                  : 'filter[between]',
              },
            },
          ],
        });
      }
      return parts.map((p) => convertValue(p));
    }

    case 'null': {
      // Convert to boolean
      const lowerValue = strValue.toLowerCase();
      if (lowerValue !== 'true' && lowerValue !== 'false') {
        throw new BadRequestException({
          errors: [
            {
              status: '400',
              code: 'INVALID_FILTER_VALUE',
              title: 'Invalid filter value',
              detail: `The 'null' operator requires 'true' or 'false', but got '${strValue}'`,
              source: {
                parameter: field ? `filter[${field}][null]` : 'filter[null]',
              },
            },
          ],
        });
      }
      return lowerValue === 'true';
    }

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      // Convert to number, date, or string
      return convertValue(strValue);

    default:
      return value;
  }
}

/**
 * Set value at nested field path
 *
 * @param obj - Target object
 * @param path - Field path (dot-separated)
 * @param value - Value to set
 * @param transformKey - Key transformation function (optional)
 *
 * @example
 * ```typescript
 * const obj = {};
 * setNestedValue(obj, 'author.profile.name', { contains: 'John' });
 * // obj = { author: { profile: { name: { contains: 'John' } } } }
 * ```
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
  transformKey: (key: string) => string = (k) => k,
): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = transformKey(parts[i]);
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = transformKey(parts[parts.length - 1]);
  current[lastPart] = value;
}

/**
 * Convert operator to Prisma query condition
 *
 * @param operator - Filter operator
 * @param value - Filter value
 * @returns Prisma where condition object
 *
 * @example
 * ```typescript
 * operatorToPrisma('eq', 'published'); // 'published'
 * operatorToPrisma('ne', 'draft'); // { not: 'draft' }
 * operatorToPrisma('ilike', 'john'); // { contains: 'john', mode: 'insensitive' }
 * operatorToPrisma('between', [100, 500]); // { gte: 100, lte: 500 }
 * ```
 */
export function operatorToPrisma(
  operator: FilterOperator,
  value: unknown,
): unknown {
  switch (operator) {
    case 'eq':
      return value;

    case 'ne':
      return { not: value };

    case 'like':
      return { contains: value };

    case 'ilike':
      return { contains: value, mode: 'insensitive' };

    case 'gt':
      return { gt: value };

    case 'gte':
      return { gte: value };

    case 'lt':
      return { lt: value };

    case 'lte':
      return { lte: value };

    case 'in':
      return { in: value as unknown[] };

    case 'nin':
      return { notIn: value as unknown[] };

    case 'null':
      return value === true ? null : { not: null };

    case 'between': {
      const [min, max] = value as [unknown, unknown];
      return { gte: min, lte: max };
    }

    default:
      return value;
  }
}
