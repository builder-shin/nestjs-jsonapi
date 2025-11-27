/**
 * JSON:API 검증 예외 및 Prisma 에러 처리
 *
 * @packageDocumentation
 * @module exceptions
 *
 * 의존성: utils/error.util.ts, interfaces/json-api.interface.ts
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
 * Prisma 에러 코드 상수
 *
 * Prisma에서 발생하는 주요 에러 코드를 정의합니다.
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export const PRISMA_ERROR_CODES = {
  /** 값이 너무 긴 경우 */
  P2000: 'P2000',
  /** 레코드가 존재하지 않음 */
  P2001: 'P2001',
  /** Unique constraint 위반 */
  P2002: 'P2002',
  /** Foreign key constraint 위반 */
  P2003: 'P2003',
  /** 레코드를 찾을 수 없음 */
  P2025: 'P2025',
} as const;

/**
 * Prisma 에러 처리
 *
 * Prisma 에러 코드에 따라 적절한 HTTP 예외로 변환합니다.
 * 모든 예외는 JSON:API 형식의 에러 응답을 포함합니다.
 *
 * @param error Prisma 에러 객체
 * @throws 적절한 HTTP 예외 (ConflictException, BadRequestException, NotFoundException, InternalServerErrorException)
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
      // Unique constraint 위반
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
      // Foreign key constraint 위반
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
      // 레코드를 찾을 수 없음
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
      // 값이 너무 긺
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
      // 알 수 없는 Prisma 에러
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
 * Prisma 에러 여부 확인
 *
 * 에러 객체가 Prisma에서 발생한 에러인지 확인합니다.
 * Prisma 에러는 'P'로 시작하는 코드를 가집니다.
 *
 * @param error 확인할 에러 객체
 * @returns Prisma 에러 여부
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
 * JSON:API 검증 예외
 *
 * class-validator 에러를 JSON:API 형식으로 변환하는 예외 클래스입니다.
 * ValidationPipe에서 발생한 검증 에러를 처리할 때 사용합니다.
 *
 * @example
 * ```typescript
 * // ValidationPipe 설정
 * app.useGlobalPipes(new ValidationPipe({
 *   exceptionFactory: (errors) => new JsonApiValidationException(errors),
 * }));
 * ```
 */
export class JsonApiValidationException extends BadRequestException {
  /**
   * JSON:API 형식의 에러 배열
   */
  public readonly jsonApiErrors: JsonApiError[];

  /**
   * @param errors class-validator ValidationError 배열
   */
  constructor(errors: ValidationError[]) {
    const jsonApiErrors = JsonApiValidationException.toJsonApiErrors(errors);
    super({ errors: jsonApiErrors });
    this.jsonApiErrors = jsonApiErrors;
  }

  /**
   * ValidationError 배열을 JSON:API 에러 형식으로 변환
   *
   * @param errors class-validator ValidationError 배열
   * @param parentPath 상위 경로 (중첩 객체 처리용)
   * @returns JSON:API 에러 배열
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

      // 중첩된 에러 처리 (중첩 객체/배열)
      if (error.children && error.children.length > 0) {
        result.push(...this.toJsonApiErrors(error.children, pointer));
      }
    }

    return result;
  }
}
