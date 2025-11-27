/**
 * ID 변환 유틸리티 함수
 *
 * @packageDocumentation
 * @module utils
 *
 * 의존성: interfaces (IdType)
 */

import { BadRequestException } from '@nestjs/common';
import { IdType } from '../interfaces';

/**
 * UUID v4 형식 정규식
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * CUID v1 형식 정규식
 * - 'c'로 시작하고 총 25자 (c + 24자)
 */
const CUID_V1_REGEX = /^c[a-z0-9]{24}$/;

/**
 * CUID v2 형식 정규식
 * - 소문자 알파벳과 숫자로 구성된 24자 (기본 길이)
 * - 첫 글자는 반드시 소문자 알파벳
 */
const CUID_V2_REGEX = /^[a-z][a-z0-9]{23}$/;

/**
 * CUID 검증 함수 (v1, v2 모두 지원)
 *
 * @param id 검증할 ID 문자열
 * @returns CUID 형식 여부
 */
function isValidCuid(id: string): boolean {
  return CUID_V1_REGEX.test(id) || CUID_V2_REGEX.test(id);
}

/**
 * ID 타입에 따라 문자열 ID를 적절한 타입으로 변환
 *
 * JSON:API에서는 ID가 항상 문자열로 전달되지만,
 * 데이터베이스에서는 다양한 타입을 사용할 수 있습니다.
 * 이 함수는 ID 타입 설정에 따라 적절한 변환을 수행합니다.
 *
 * @param id 입력 ID (문자열)
 * @param idType ID 타입 설정
 * @returns 변환된 ID (string 또는 number)
 * @throws BadRequestException 유효하지 않은 ID 형식
 *
 * @example
 * ```typescript
 * // 숫자 ID
 * convertId('123', 'number'); // 123
 *
 * // UUID
 * convertId('550e8400-e29b-41d4-a716-446655440000', 'uuid');
 *
 * // 자동 감지
 * convertId('123', 'auto'); // 123 (숫자로 변환)
 * convertId('abc123', 'auto'); // 'abc123' (문자열 유지)
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
      // 숫자로 변환 가능하면 숫자로
      const numId = Number(id);
      if (!Number.isNaN(numId) && Number.isInteger(numId) && numId > 0) {
        return numId;
      }
      // UUID 형식이면 그대로
      if (UUID_REGEX.test(id)) {
        return id;
      }
      // CUID 형식이면 그대로
      if (isValidCuid(id)) {
        return id;
      }
      // 기본값으로 문자열 반환
      return id;
    }

    case 'string':
    default:
      return id;
  }
}

/**
 * ID를 문자열로 변환 (직렬화용)
 *
 * JSON:API 응답에서는 ID가 항상 문자열이어야 합니다.
 * 이 함수는 숫자 ID를 문자열로 변환합니다.
 *
 * @param id 입력 ID (string 또는 number)
 * @returns 문자열 ID
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
 * ID 배열 변환
 *
 * 여러 ID를 한 번에 변환할 때 사용합니다.
 *
 * @param ids ID 문자열 배열
 * @param idType ID 타입 설정
 * @returns 변환된 ID 배열
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
