/**
 * JSON:API 1.1 스펙에 맞는 타입 정의
 *
 * @packageDocumentation
 * @module interfaces
 * @see https://jsonapi.org/format/1.1/
 */

/**
 * JSON:API 1.1 Document 구조
 *
 * 모든 JSON:API 응답의 최상위 문서 구조를 정의합니다.
 *
 * @template T - 리소스의 attributes 타입
 *
 * @example
 * ```typescript
 * const document: JsonApiDocument<Article> = {
 *   jsonapi: { version: '1.1' },
 *   data: { type: 'articles', id: '1', attributes: { title: 'Hello' } },
 *   meta: { total: 100 }
 * };
 * ```
 */
export interface JsonApiDocument<T = unknown> {
  /** JSON:API 버전 정보 */
  jsonapi: {
    version: '1.1';
  };
  /** 응답 데이터 (단일, 배열, 또는 null) */
  data: JsonApiResource<T> | JsonApiResource<T>[] | null;
  /** 포함된 관련 리소스 */
  included?: JsonApiResource[];
  /** 메타 정보 */
  meta?: JsonApiMeta;
  /** 링크 정보 */
  links?: JsonApiLinks;
}

/**
 * JSON:API Resource Object
 *
 * 개별 리소스를 나타내는 객체입니다.
 *
 * @template T - attributes 타입
 *
 * @example
 * ```typescript
 * const resource: JsonApiResource<Article> = {
 *   type: 'articles',
 *   id: '1',
 *   attributes: { title: 'Hello World', content: '...' },
 *   relationships: {
 *     author: { data: { type: 'users', id: '5' } }
 *   }
 * };
 * ```
 */
export interface JsonApiResource<T = unknown> {
  /** 리소스 타입 (plural kebab-case) */
  type: string;
  /** 리소스 고유 식별자 */
  id: string;
  /** 리소스 속성 */
  attributes?: Partial<T>;
  /** 관계 정보 */
  relationships?: Record<string, JsonApiRelationship>;
  /** 링크 정보 */
  links?: JsonApiLinks;
  /** 메타 정보 */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Relationship
 *
 * 리소스 간의 관계를 나타내는 객체입니다.
 *
 * @example
 * ```typescript
 * // To-One 관계
 * const author: JsonApiRelationship = {
 *   data: { type: 'users', id: '5' }
 * };
 *
 * // To-Many 관계
 * const comments: JsonApiRelationship = {
 *   data: [
 *     { type: 'comments', id: '1' },
 *     { type: 'comments', id: '2' }
 *   ]
 * };
 * ```
 */
export interface JsonApiRelationship {
  /** 관계 데이터 (식별자 또는 식별자 배열) */
  data: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
  /** 링크 정보 */
  links?: JsonApiLinks;
  /** 메타 정보 */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Resource Identifier
 *
 * 리소스를 식별하기 위한 최소 정보 (type + id)
 */
export interface JsonApiResourceIdentifier {
  /** 리소스 타입 */
  type: string;
  /** 리소스 ID */
  id: string;
}

/**
 * JSON:API Links
 *
 * 관련 URL 링크 모음
 */
export interface JsonApiLinks {
  /** 현재 리소스 URL */
  self?: string;
  /** 관련 리소스 URL */
  related?: string;
  /** 첫 번째 페이지 URL */
  first?: string;
  /** 마지막 페이지 URL */
  last?: string;
  /** 이전 페이지 URL (없으면 null) */
  prev?: string | null;
  /** 다음 페이지 URL (없으면 null) */
  next?: string | null;
}

/**
 * JSON:API Meta
 *
 * 비표준 메타 정보를 담는 객체
 */
export interface JsonApiMeta {
  [key: string]: unknown;
}

/**
 * JSON:API Error Object
 *
 * 에러 정보를 나타내는 객체입니다.
 *
 * @example
 * ```typescript
 * const error: JsonApiError = {
 *   id: 'abc123',
 *   status: '404',
 *   code: 'RESOURCE_NOT_FOUND',
 *   title: 'Resource Not Found',
 *   detail: 'The article with id "999" was not found',
 *   source: { parameter: 'id' }
 * };
 * ```
 */
export interface JsonApiError {
  /** 고유 에러 ID */
  id?: string;
  /** HTTP 상태 코드 (문자열) */
  status?: string;
  /** 애플리케이션별 에러 코드 */
  code?: string;
  /** 짧은 에러 제목 */
  title?: string;
  /** 상세 에러 설명 */
  detail?: string;
  /** 에러 발생 위치 */
  source?: {
    /** JSON Pointer to the value in request document */
    pointer?: string;
    /** 문제가 된 쿼리 파라미터 이름 */
    parameter?: string;
    /** 문제가 된 헤더 이름 */
    header?: string;
  };
  /** 메타 정보 */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Error Document
 *
 * 에러 응답의 최상위 문서 구조입니다.
 */
export interface JsonApiErrorDocument {
  /** JSON:API 버전 정보 */
  jsonapi: {
    version: '1.1';
  };
  /** 에러 목록 */
  errors: JsonApiError[];
  /** 메타 정보 */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Request Body (Create/Update)
 *
 * 리소스 생성/수정 요청 본문 구조입니다.
 *
 * @template T - attributes 타입
 *
 * @example
 * ```typescript
 * const createBody: JsonApiRequestBody<Article> = {
 *   data: {
 *     type: 'articles',
 *     attributes: { title: 'New Article' }
 *   }
 * };
 * ```
 */
export interface JsonApiRequestBody<T = unknown> {
  data: {
    /** 리소스 타입 */
    type: string;
    /** 리소스 ID (업데이트 시 필수, 생성 시 선택) */
    id?: string;
    /** 리소스 속성 */
    attributes?: Partial<T>;
    /** 관계 정보 */
    relationships?: Record<string, JsonApiRelationship>;
  };
}

/**
 * JSON:API Bulk Request Body
 *
 * 복수 리소스 생성/수정 요청 본문 구조입니다.
 *
 * @template T - attributes 타입
 */
export interface JsonApiBulkRequestBody<T = unknown> {
  data: Array<{
    /** 리소스 타입 */
    type: string;
    /** 리소스 ID (업데이트 시 필수) */
    id?: string;
    /** 리소스 속성 */
    attributes?: Partial<T>;
    /** 관계 정보 */
    relationships?: Record<string, JsonApiRelationship>;
  }>;
}
