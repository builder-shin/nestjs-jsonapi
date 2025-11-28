/**
 * 쿼리 파라미터 유효성 검증 예외
 *
 * @packageDocumentation
 * @module exceptions
 *
 * 의존성: @nestjs/common
 */

import { BadRequestException } from '@nestjs/common';

/**
 * 쿼리 유효성 검증 에러 인터페이스
 *
 * JSON:API 스펙을 준수하는 에러 형식을 정의합니다.
 *
 * @example
 * ```typescript
 * const error: QueryValidationError = {
 *   status: '400',
 *   code: 'DISALLOWED_FILTER',
 *   title: 'Disallowed Filter',
 *   detail: "Filter on field 'password' is not allowed",
 *   source: { parameter: 'filter[password]' },
 * };
 * ```
 */
export interface QueryValidationError {
  /** HTTP 상태 코드 (문자열) */
  status: string;
  /** 애플리케이션 특정 에러 코드 */
  code: string;
  /** 에러 제목 (간략한 설명) */
  title: string;
  /** 에러 상세 설명 */
  detail: string;
  /** 에러 소스 정보 (선택) */
  source?: {
    /** 문제가 된 쿼리 파라미터 */
    parameter: string;
  };
}

/**
 * 쿼리 파라미터 유효성 검증 예외
 *
 * 화이트리스트에 없는 쿼리 파라미터 사용 시 발생하는 예외입니다.
 * JSON:API 형식의 에러 응답을 반환합니다.
 *
 * @example
 * ```typescript
 * // 단일 에러
 * throw new JsonApiQueryException([
 *   JsonApiQueryException.disallowedFilter('password'),
 * ]);
 *
 * // 복수 에러
 * throw new JsonApiQueryException([
 *   JsonApiQueryException.disallowedFilter('password'),
 *   JsonApiQueryException.disallowedSort('secret'),
 * ]);
 * ```
 */
export class JsonApiQueryException extends BadRequestException {
  /**
   * @param errors 쿼리 유효성 검증 에러 배열
   */
  constructor(errors: QueryValidationError[]) {
    super({
      errors,
    });
  }

  /**
   * 허용되지 않은 필터 필드 에러 생성
   *
   * @param field 허용되지 않은 필터 필드명
   * @returns QueryValidationError 객체
   *
   * @example
   * ```typescript
   * JsonApiQueryException.disallowedFilter('password');
   * // {
   * //   status: '400',
   * //   code: 'DISALLOWED_FILTER',
   * //   title: 'Disallowed Filter',
   * //   detail: "Filter on field 'password' is not allowed",
   * //   source: { parameter: 'filter[password]' },
   * // }
   * ```
   */
  static disallowedFilter(field: string): QueryValidationError {
    return {
      status: '400',
      code: 'DISALLOWED_FILTER',
      title: 'Disallowed Filter',
      detail: `Filter on field '${field}' is not allowed`,
      source: { parameter: `filter[${field}]` },
    };
  }

  /**
   * 허용되지 않은 정렬 필드 에러 생성
   *
   * @param field 허용되지 않은 정렬 필드명
   * @returns QueryValidationError 객체
   *
   * @example
   * ```typescript
   * JsonApiQueryException.disallowedSort('secret');
   * // {
   * //   status: '400',
   * //   code: 'DISALLOWED_SORT',
   * //   title: 'Disallowed Sort',
   * //   detail: "Sort on field 'secret' is not allowed",
   * //   source: { parameter: 'sort' },
   * // }
   * ```
   */
  static disallowedSort(field: string): QueryValidationError {
    return {
      status: '400',
      code: 'DISALLOWED_SORT',
      title: 'Disallowed Sort',
      detail: `Sort on field '${field}' is not allowed`,
      source: { parameter: 'sort' },
    };
  }

  /**
   * 허용되지 않은 include 관계 에러 생성
   *
   * @param relation 허용되지 않은 관계명
   * @returns QueryValidationError 객체
   *
   * @example
   * ```typescript
   * JsonApiQueryException.disallowedInclude('secrets');
   * // {
   * //   status: '400',
   * //   code: 'DISALLOWED_INCLUDE',
   * //   title: 'Disallowed Include',
   * //   detail: "Include of relation 'secrets' is not allowed",
   * //   source: { parameter: 'include' },
   * // }
   * ```
   */
  static disallowedInclude(relation: string): QueryValidationError {
    return {
      status: '400',
      code: 'DISALLOWED_INCLUDE',
      title: 'Disallowed Include',
      detail: `Include of relation '${relation}' is not allowed`,
      source: { parameter: 'include' },
    };
  }

  /**
   * include 최대 깊이 초과 에러 생성
   *
   * @param relation 깊이를 초과한 관계 경로
   * @param maxDepth 허용된 최대 깊이
   * @returns QueryValidationError 객체
   *
   * @example
   * ```typescript
   * JsonApiQueryException.includeDepthExceeded('author.posts.comments', 2);
   * // {
   * //   status: '400',
   * //   code: 'INCLUDE_DEPTH_EXCEEDED',
   * //   title: 'Include Depth Exceeded',
   * //   detail: "Include 'author.posts.comments' exceeds maximum depth of 2",
   * //   source: { parameter: 'include' },
   * // }
   * ```
   */
  static includeDepthExceeded(
    relation: string,
    maxDepth: number,
  ): QueryValidationError {
    return {
      status: '400',
      code: 'INCLUDE_DEPTH_EXCEEDED',
      title: 'Include Depth Exceeded',
      detail: `Include '${relation}' exceeds maximum depth of ${maxDepth}`,
      source: { parameter: 'include' },
    };
  }

  /**
   * 허용되지 않은 sparse fieldset 필드 에러 생성
   *
   * @param field 허용되지 않은 필드명
   * @param type 리소스 타입
   * @returns QueryValidationError 객체
   *
   * @example
   * ```typescript
   * JsonApiQueryException.disallowedField('password', 'users');
   * // {
   * //   status: '400',
   * //   code: 'DISALLOWED_FIELD',
   * //   title: 'Disallowed Field',
   * //   detail: "Field 'password' for type 'users' is not allowed",
   * //   source: { parameter: 'fields[users]' },
   * // }
   * ```
   */
  static disallowedField(field: string, type: string): QueryValidationError {
    return {
      status: '400',
      code: 'DISALLOWED_FIELD',
      title: 'Disallowed Field',
      detail: `Field '${field}' for type '${type}' is not allowed`,
      source: { parameter: `fields[${type}]` },
    };
  }
}
