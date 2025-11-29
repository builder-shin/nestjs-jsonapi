/**
 * JSON:API Query DTO
 *
 * Type definitions and validation for JSON:API query parameters
 *
 * @packageDocumentation
 * @module dto
 *
 * Dependencies: none
 */

import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Pagination Parameters DTO
 *
 * @description
 * Maximum limit validation is performed at the service level (JsonApiQueryService.parsePage)
 * rather than the DTO level. This ensures synchronization with the module options
 * `pagination.maxLimit` setting, eliminating the need to modify the DTO when configuration changes.
 *
 * @see JsonApiQueryService.parsePage - maxLimit validation logic
 * @see JsonApiModuleOptions.pagination.maxLimit - configuration value
 *
 * @example
 * ```typescript
 * // URL: ?page[offset]=0&page[limit]=20
 * const page: PageDto = { offset: 0, limit: 20 };
 * ```
 */
export class PageDto {
  /**
   * Start position (0-based)
   *
   * @remarks
   * Uses offset-based pagination.
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'page[offset] must be an integer' })
  @Min(0, { message: 'page[offset] must be 0 or greater' })
  offset?: number;

  /**
   * Page size (number of results)
   *
   * @remarks
   * Maximum value is limited at the service level by `pagination.maxLimit` module option.
   * Requests exceeding this value are automatically adjusted to maxLimit (no error thrown).
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'page[limit] must be an integer' })
  @Min(1, { message: 'page[limit] must be 1 or greater' })
  limit?: number;
}

/**
 * JSON:API Query Parameters DTO
 *
 * DTO for URL query parameter validation
 * Defines query parameters according to JSON:API 1.1 specification.
 *
 * @example
 * ```typescript
 * // URL: ?filter[status]=published&sort=-createdAt&page[limit]=10&include=author
 * const query: JsonApiQueryDto = {
 *   filter: { status: 'published' },
 *   sort: '-createdAt',
 *   page: { limit: 10 },
 *   include: 'author'
 * };
 * ```
 */
export class JsonApiQueryDto {
  /**
   * Filter parameter
   *
   * @description
   * Condition object for resource filtering
   * Supports various operators: eq, ne, gt, gte, lt, lte, in, contains, etc.
   *
   * @example filter[status]=published&filter[age][gte]=18
   */
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  /**
   * Sort parameter
   *
   * @description
   * Valid format: comma-separated field names
   * - Field name prefixed with `-` for descending order
   * - No prefix for ascending order
   *
   * @example sort=-createdAt,title
   */
  @IsString()
  @IsOptional()
  @Matches(/^-?[a-zA-Z_][a-zA-Z0-9_]*(,-?[a-zA-Z_][a-zA-Z0-9_]*)*$/, {
    message:
      'Invalid sort parameter format. Example: sort=-createdAt,title',
  })
  sort?: string;

  /**
   * Pagination parameter
   *
   * @description
   * Supports offset/limit based pagination.
   *
   * @example page[offset]=0&page[limit]=20
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => PageDto)
  page?: PageDto;

  /**
   * Relationship include parameter
   *
   * @description
   * Valid format: comma-separated relationship paths
   * - Use dot (.) to express nested relationships
   *
   * @example include=comments,author.profile
   */
  @IsString()
  @IsOptional()
  @Matches(
    /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*(,[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)*$/,
    {
      message:
        'Invalid include parameter format. Example: include=comments,author.profile',
    },
  )
  include?: string;

  /**
   * Sparse Fieldsets parameter
   *
   * @description
   * Specifies which fields to return per resource type.
   * Useful for reducing network bandwidth.
   *
   * @example fields[articles]=title,content
   */
  @IsObject()
  @IsOptional()
  fields?: Record<string, string>;
}
