/**
 * 에러 유틸리티 함수
 *
 * @packageDocumentation
 * @module utils
 *
 * 의존성: 없음
 */

import { randomUUID } from 'crypto';

/**
 * 고유한 에러 ID 생성
 *
 * JSON:API 에러 응답에서 각 에러를 고유하게 식별하기 위한 UUID를 생성합니다.
 * crypto.randomUUID()를 사용하여 충돌을 방지합니다.
 *
 * @returns 고유한 에러 식별자 (UUID v4 형식)
 *
 * @example
 * ```typescript
 * const errorId = generateErrorId();
 * // 예: "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateErrorId(): string {
  return randomUUID();
}
