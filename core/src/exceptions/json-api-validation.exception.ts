/**
 * JSON:API Validation Exception and Prisma Error Handling
 *
 * @packageDocumentation
 * @module exceptions
 *
 * Dependencies: utils/error.util.ts, interfaces/json-api.interface.ts
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { JsonApiError } from '../interfaces';
import { generateErrorId } from '../utils';

/**
 * Prisma Error Code Constants
 *
 * Defines major error codes from Prisma.
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export const PRISMA_ERROR_CODES = {
  /** Value too long */
  P2000: 'P2000',
  /** Record does not exist */
  P2001: 'P2001',
  /** Unique constraint violation */
  P2002: 'P2002',
  /** Foreign key constraint violation */
  P2003: 'P2003',
  /** Record not found */
  P2025: 'P2025',
} as const;

/**
 * Handle Prisma Errors
 *
 * Converts Prisma error codes to appropriate HTTP exceptions.
 * All exceptions include JSON:API formatted error responses.
 *
 * @param error Prisma error object
 * @throws Appropriate HTTP exception (ConflictException, BadRequestException, NotFoundException, InternalServerErrorException)
 *
 * @example
 * ```typescript
 * try {
 *   await prisma.user.create({ data });
 * } catch (error) {
 *   if (isPrismaError(error)) {
 *     handlePrismaError(error);
 *   }
 *   throw error;
 * }
 * ```
 */
export function handlePrismaError(error: any): never {
  const code = error?.code;
  const meta = error?.meta;

  switch (code) {
    case PRISMA_ERROR_CODES.P2002: {
      // Unique constraint violation
      const target = meta?.target as string[] | undefined;
      const fields = target?.join(', ') || 'unknown field';
      throw new ConflictException({
        errors: [
          {
            id: generateErrorId(),
            status: '409',
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            title: 'Conflict',
            detail: `A record with this ${fields} already exists`,
            source: target
              ? { pointer: `/data/attributes/${target[0]}` }
              : undefined,
          },
        ],
      });
    }

    case PRISMA_ERROR_CODES.P2003: {
      // Foreign key constraint violation
      const fieldName = meta?.field_name || 'unknown field';
      throw new BadRequestException({
        errors: [
          {
            id: generateErrorId(),
            status: '400',
            code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
            title: 'Bad Request',
            detail: `Invalid reference: ${fieldName} does not exist`,
            source: { pointer: `/data/relationships/${fieldName}` },
          },
        ],
      });
    }

    case PRISMA_ERROR_CODES.P2025:
    case PRISMA_ERROR_CODES.P2001: {
      // Record not found
      const cause = meta?.cause || 'Record not found';
      throw new NotFoundException({
        errors: [
          {
            id: generateErrorId(),
            status: '404',
            code: 'RECORD_NOT_FOUND',
            title: 'Not Found',
            detail: cause,
          },
        ],
      });
    }

    case PRISMA_ERROR_CODES.P2000: {
      // Value too long
      const columnName = meta?.column_name || 'unknown column';
      throw new BadRequestException({
        errors: [
          {
            id: generateErrorId(),
            status: '400',
            code: 'VALUE_TOO_LONG',
            title: 'Bad Request',
            detail: `Value too long for column: ${columnName}`,
            source: { pointer: `/data/attributes/${columnName}` },
          },
        ],
      });
    }

    default: {
      // Unknown Prisma error
      throw new InternalServerErrorException({
        errors: [
          {
            id: generateErrorId(),
            status: '500',
            code: error?.code || 'UNKNOWN_DATABASE_ERROR',
            title: 'Internal Server Error',
            detail: 'An unexpected database error occurred',
          },
        ],
      });
    }
  }
}

/**
 * Check if Error is a Prisma Error
 *
 * Checks if the error object originates from Prisma.
 * Prisma errors have codes starting with 'P'.
 *
 * @param error Error object to check
 * @returns Whether it's a Prisma error
 *
 * @example
 * ```typescript
 * if (isPrismaError(error)) {
 *   handlePrismaError(error);
 * }
 * ```
 */
export function isPrismaError(error: any): boolean {
  return (
    error?.code && typeof error.code === 'string' && error.code.startsWith('P')
  );
}

/**
 * JSON:API Validation Exception
 *
 * Exception class that converts class-validator errors to JSON:API format.
 * Used to handle validation errors from ValidationPipe.
 *
 * @example
 * ```typescript
 * // ValidationPipe configuration
 * app.useGlobalPipes(new ValidationPipe({
 *   exceptionFactory: (errors) => new JsonApiValidationException(errors),
 * }));
 * ```
 */
export class JsonApiValidationException extends BadRequestException {
  /**
   * Array of JSON:API formatted errors
   */
  public readonly jsonApiErrors: JsonApiError[];

  /**
   * @param errors class-validator ValidationError array
   */
  constructor(errors: ValidationError[]) {
    const jsonApiErrors = JsonApiValidationException.toJsonApiErrors(errors);
    super({ errors: jsonApiErrors });
    this.jsonApiErrors = jsonApiErrors;
  }

  /**
   * Convert ValidationError array to JSON:API error format
   *
   * @param errors class-validator ValidationError array
   * @param parentPath Parent path (for nested object handling)
   * @returns JSON:API error array
   */
  private static toJsonApiErrors(
    errors: ValidationError[],
    parentPath: string = '/data/attributes',
  ): JsonApiError[] {
    const result: JsonApiError[] = [];

    for (const error of errors) {
      const pointer = `${parentPath}/${error.property}`;

      if (error.constraints) {
        for (const [code, message] of Object.entries(error.constraints)) {
          result.push({
            id: generateErrorId(),
            status: '400',
            code,
            title: 'Validation Error',
            detail: message,
            source: {
              pointer,
            },
          });
        }
      }

      // Handle nested errors (nested objects/arrays)
      if (error.children && error.children.length > 0) {
        result.push(...this.toJsonApiErrors(error.children, pointer));
      }
    }

    return result;
  }
}
