/**
 * 쿼리 파라미터 파싱 헬퍼 함수
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
 * 연산자 유효성 검증
 *
 * @param op - 검증할 연산자 문자열
 * @returns 유효한 FilterOperator이면 true
 */
export function isValidOperator(op: string): op is FilterOperator {
  return VALID_FILTER_OPERATORS.includes(op as FilterOperator);
}

/**
 * 필드명 유효성 검증 정규식
 * - 알파벳, 숫자, 밑줄, 점(중첩 관계)만 허용
 * - SQL 인젝션 방지를 위한 특수문자 차단
 */
const VALID_FIELD_NAME_REGEX =
  /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

/**
 * 필드명 유효성 검증 (SQL/Query 인젝션 방지)
 *
 * @param field - 검증할 필드명
 * @returns 유효하면 true
 *
 * @example
 * ```typescript
 * isValidFieldName('name'); // true
 * isValidFieldName('author.name'); // true
 * isValidFieldName('user_profile'); // true
 * isValidFieldName('123name'); // false (숫자로 시작)
 * isValidFieldName('name;DROP TABLE'); // false (특수문자 포함)
 * ```
 */
export function isValidFieldName(field: string): boolean {
  if (!field || field.length > 100) {
    return false;
  }
  return VALID_FIELD_NAME_REGEX.test(field);
}

/**
 * ISO 8601 날짜 문자열 감지 정규식
 * 예: 2024-01-15, 2024-01-15T10:30:00, 2024-01-15T10:30:00.000Z, 2024-01-15T10:30:00.123456Z
 * 밀리초/마이크로초는 1-6자리까지 지원
 */
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * ISO 8601 날짜 문자열인지 확인
 */
function isIsoDateString(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

/**
 * 유효한 날짜인지 검증
 *
 * JavaScript의 Date는 잘못된 날짜를 자동 보정합니다 (예: 2024-02-30 → 2024-03-01).
 * 이 함수는 원본 문자열의 날짜 부분과 파싱된 Date 객체의 날짜를 비교하여
 * 자동 보정이 발생했는지 확인합니다.
 *
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @param date - 파싱된 Date 객체
 * @returns 유효한 날짜이면 true, 자동 보정이 발생했으면 false
 *
 * @example
 * ```typescript
 * isValidDate("2024-02-29", new Date("2024-02-29")); // true (윤년)
 * isValidDate("2024-02-30", new Date("2024-02-30")); // false (자동 보정됨)
 * isValidDate("2023-02-29", new Date("2023-02-29")); // false (윤년 아님)
 * ```
 */
function isValidDate(dateString: string, date: Date): boolean {
  // 날짜 부분만 추출 (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  const [yearStr, monthStr, dayStr] = datePart.split('-');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Date 객체의 실제 값과 비교
  // getMonth()는 0-based이므로 +1 필요
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

/**
 * 값을 적절한 타입으로 변환 (숫자, 날짜, 또는 원본 문자열)
 */
function convertValue(value: string): unknown {
  // 숫자 변환 시도
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }

  // ISO 날짜 문자열인 경우 Date 객체로 변환
  if (isIsoDateString(value)) {
    const date = new Date(value);
    // 유효한 날짜인지 확인 (Invalid Date 및 자동 보정된 날짜 모두 거부)
    if (!isNaN(date.getTime()) && isValidDate(value, date)) {
      return date;
    }
  }

  // 그 외에는 원본 문자열 반환
  return value;
}

/**
 * 필터 값 파싱 (연산자에 따라 변환)
 *
 * @param operator - 필터 연산자
 * @param value - 필터 값
 * @param field - 필터 대상 필드명 (에러 메시지용, 선택적)
 * @returns 파싱된 필터 값
 * @throws BadRequestException JSON:API 형식의 에러
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
      // 쉼표로 구분된 배열로 변환, 각 값은 타입 변환 적용
      return strValue.split(',').map((v) => convertValue(v.trim()));

    case 'between': {
      // 쉼표로 구분된 두 값 [시작, 끝]
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
      // boolean으로 변환
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
      // 숫자, 날짜, 또는 문자열로 변환
      return convertValue(strValue);

    default:
      return value;
  }
}

/**
 * 중첩된 필드 경로에 값 설정
 *
 * @param obj - 대상 객체
 * @param path - 필드 경로 (점으로 구분)
 * @param value - 설정할 값
 * @param transformKey - 키 변환 함수 (선택)
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
 * 연산자를 Prisma 쿼리 조건으로 변환
 *
 * @param operator - 필터 연산자
 * @param value - 필터 값
 * @returns Prisma where 조건 객체
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
