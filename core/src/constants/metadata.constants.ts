/**
 * JSON:API 모듈 메타데이터 상수
 *
 * @packageDocumentation
 * @module constants
 */

// 모듈 옵션
export const JSON_API_MODULE_OPTIONS = Symbol('JSON_API_MODULE_OPTIONS');

// Prisma 서비스 토큰
export const PRISMA_SERVICE_TOKEN = Symbol('PRISMA_SERVICE_TOKEN');

// 컨트롤러/Serializer 메타데이터
export const JSON_API_CONTROLLER_OPTIONS = Symbol(
  'JSON_API_CONTROLLER_OPTIONS',
);
export const JSON_API_SERIALIZER_OPTIONS = Symbol('JSON_API_SERIALIZER_OPTIONS');
export const JSON_API_ATTRIBUTES = Symbol('JSON_API_ATTRIBUTES');
export const JSON_API_RELATIONSHIPS = Symbol('JSON_API_RELATIONSHIPS');

// 액션 훅 메타데이터
export const JSON_API_ACTION_METADATA = Symbol('JSON_API_ACTION_METADATA');
export const BEFORE_ACTION_METADATA = Symbol('BEFORE_ACTION_METADATA');
export const AFTER_ACTION_METADATA = Symbol('AFTER_ACTION_METADATA');
