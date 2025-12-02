/**
 * Server Config API 응답 타입 정의
 *
 * 프론트엔드 개발자가 리소스 메타정보를 조회할 수 있는 API 응답 타입입니다.
 *
 * @packageDocumentation
 * @module interfaces
 */

import { IdType } from './module-options.interface';

/**
 * DTO 검증 규칙
 *
 * detailLevel이 'full'일 때 DTO 필드별 검증 규칙을 제공합니다.
 *
 * @example
 * ```typescript
 * const titleRule: ValidationRule = {
 *   required: true,
 *   type: 'string',
 *   maxLength: 200,
 *   minLength: 1,
 * };
 * ```
 */
export interface ValidationRule {
  /** 필수 여부 */
  required?: boolean;
  /** 타입 (string, number, boolean, array, object 등) */
  type?: string;
  /** 최대 길이 (문자열) */
  maxLength?: number;
  /** 최소 길이 (문자열) */
  minLength?: number;
  /** 최소값 (숫자) */
  min?: number;
  /** 최대값 (숫자) */
  max?: number;
  /** 정규식 패턴 */
  pattern?: string;
}

/**
 * 리소스 메타 정보
 *
 * 개별 리소스(컨트롤러)의 설정 정보를 담습니다.
 *
 * @example
 * ```typescript
 * const articleConfig: ResourceConfigInfo = {
 *   model: 'article',
 *   type: 'articles',
 *   idType: 'uuid',
 *   enabledActions: ['index', 'show', 'create', 'update', 'delete'],
 *   pagination: { defaultLimit: 20, maxLimit: 100 },
 *   query: {
 *     allowedFilters: ['status', 'authorId'],
 *     allowedSorts: ['createdAt', '-updatedAt'],
 *     allowedIncludes: ['author', 'comments'],
 *   },
 *   relationships: {
 *     author: { type: 'users', cardinality: 'one' },
 *     comments: { type: 'comments', cardinality: 'many' },
 *   },
 * };
 * ```
 */
export interface ResourceConfigInfo {
  /** Prisma 모델명 */
  model: string;

  /** JSON:API 리소스 타입 */
  type: string;

  /** ID 타입 */
  idType: IdType;

  /** 활성화된 액션 목록 */
  enabledActions: string[];

  /**
   * 쿼리 설정 (detailLevel: standard 이상)
   *
   * 기존 QueryWhitelistOptions 인터페이스 필드를 반영합니다.
   */
  query?: {
    /** 허용된 필터 필드 목록 */
    allowedFilters?: string[];
    /** 허용된 정렬 필드 목록 */
    allowedSorts?: string[];
    /** 허용된 include 관계 목록 */
    allowedIncludes?: string[];
    /** 최대 include 깊이 */
    maxIncludeDepth?: number;
    /** 허용된 sparse fieldsets (리소스 타입별 필드 목록) */
    allowedFields?: Record<string, string[]>;
    /**
     * 허용되지 않은 쿼리 파라미터 처리 방식
     * - 'ignore': 무시하고 진행 (기본값, 하위 호환)
     * - 'error': 400 Bad Request 오류 반환
     */
    onDisallowed?: 'ignore' | 'error';
  };

  /** 페이지네이션 설정 */
  pagination: {
    /** 기본 페이지 크기 */
    defaultLimit: number;
    /** 최대 페이지 크기 */
    maxLimit: number;
  };

  /**
   * 관계 정보
   *
   * 키: 관계 필드명
   * 값: 관계 대상 타입과 카디널리티
   */
  relationships?: Record<
    string,
    {
      /** 관계 대상의 JSON:API 리소스 타입 */
      type: string;
      /** 관계 카디널리티 ('one' 또는 'many') */
      cardinality: 'one' | 'many';
    }
  >;

  /**
   * DTO 검증 규칙 (detailLevel: full)
   *
   * create/update DTO의 필드별 검증 규칙을 제공합니다.
   */
  validation?: {
    /** Create DTO 검증 규칙 */
    create?: Record<string, ValidationRule>;
    /** Update DTO 검증 규칙 */
    update?: Record<string, ValidationRule>;
  };
}

/**
 * Server Config API 전체 응답
 *
 * GET /server-config API의 응답 형식입니다.
 *
 * @example
 * ```typescript
 * const response: ServerConfigResponse = {
 *   version: '1.0.0',
 *   global: {
 *     baseUrl: 'https://api.example.com',
 *     idType: 'string',
 *     pagination: { defaultLimit: 20, maxLimit: 100 },
 *   },
 *   resources: [
 *     { model: 'article', type: 'articles', ... },
 *     { model: 'user', type: 'users', ... },
 *   ],
 * };
 * ```
 */
export interface ServerConfigResponse {
  /** API 버전 */
  version: string;

  /** 글로벌 설정 */
  global: {
    /** API 기본 URL */
    baseUrl?: string;
    /** 전역 ID 타입 */
    idType: IdType;
    /** 전역 페이지네이션 설정 */
    pagination: {
      /** 기본 페이지 크기 */
      defaultLimit: number;
      /** 최대 페이지 크기 */
      maxLimit: number;
    };
  };

  /** 등록된 리소스 목록 */
  resources: ResourceConfigInfo[];
}
