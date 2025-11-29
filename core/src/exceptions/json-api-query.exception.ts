/**
 * Query Parameter Validation Exception
 *
 * @packageDocumentation
 * @module exceptions
 *
 * Dependencies: @nestjs/common
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Query Validation Error Interface
 *
 * Defines error format compliant with JSON:API spec.
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
  /** HTTP status code (as string) */
  status: string;
  /** Application-specific error code */
  code: string;
  /** Error title (brief description) */
  title: string;
  /** Error detail description */
  detail: string;
  /** Error source information (optional) */
  source?: {
    /** Query parameter that caused the error */
    parameter: string;
  };
}

/**
 * Query Parameter Validation Exception
 *
 * Exception thrown when using query parameters not in the whitelist.
 * Returns JSON:API formatted error response.
 *
 * @example
 * ```typescript
 * // Single error
 * throw new JsonApiQueryException([
 *   JsonApiQueryException.disallowedFilter('password'),
 * ]);
 *
 * // Multiple errors
 * throw new JsonApiQueryException([
 *   JsonApiQueryException.disallowedFilter('password'),
 *   JsonApiQueryException.disallowedSort('secret'),
 * ]);
 * ```
 */
export class JsonApiQueryException extends BadRequestException {
  /**
   * @param errors Query validation error array
   */
  constructor(errors: QueryValidationError[]) {
    super({
      errors,
    });
  }

  /**
   * Create disallowed filter field error
   *
   * @param field Disallowed filter field name
   * @returns QueryValidationError object
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
   * Create disallowed sort field error
   *
   * @param field Disallowed sort field name
   * @returns QueryValidationError object
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
   * Create disallowed include relation error
   *
   * @param relation Disallowed relation name
   * @returns QueryValidationError object
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
   * Create include maximum depth exceeded error
   *
   * @param relation Relation path that exceeded depth
   * @param maxDepth Allowed maximum depth
   * @returns QueryValidationError object
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
   * Create disallowed sparse fieldset field error
   *
   * @param field Disallowed field name
   * @param type Resource type
   * @returns QueryValidationError object
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
