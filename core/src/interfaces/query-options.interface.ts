/**
 * Query parameter whitelist options interface
 *
 * Restricts filter, sort, include, fields query parameters
 * in JSON:API requests to enhance security and performance.
 *
 * @packageDocumentation
 * @module interfaces
 */

/**
 * Query parameter whitelist options
 *
 * Restricts disallowed query parameters to prevent:
 * - Filtering on sensitive fields (e.g., password field)
 * - Performance degradation from excessive relationship inclusion
 * - Database load from sorting on non-indexed fields
 *
 * @example
 * ```typescript
 * // Basic usage
 * const options: QueryWhitelistOptions = {
 *   allowedFilters: ['status', 'createdAt', 'author.name'],
 *   allowedSorts: ['createdAt', 'updatedAt', 'title'],
 *   allowedIncludes: ['author', 'comments', 'tags'],
 *   maxIncludeDepth: 2,
 *   onDisallowed: 'error',
 * };
 *
 * // Disable all queries
 * const strictOptions: QueryWhitelistOptions = {
 *   allowedFilters: [],
 *   allowedSorts: [],
 *   allowedIncludes: [],
 * };
 * ```
 */
export interface QueryWhitelistOptions {
  /**
   * Allowed filter field list
   *
   * Explicitly specifies fields that can be used for filtering.
   * Nested fields are supported (e.g., 'author.name').
   *
   * - `undefined`: Allow all filters (default, backward compatible)
   * - Empty array `[]`: Disable all filters
   * - String array: Only allow filtering on specified fields
   *
   * If a parent field is allowed, all child fields are also allowed.
   * Example: allowing 'author' also allows 'author.name', 'author.email', etc.
   *
   * @example ['status', 'createdAt', 'author.name']
   * @default undefined (all filters allowed)
   */
  allowedFilters?: string[];

  /**
   * Allowed sort field list
   *
   * Explicitly specifies fields that can be used for sorting.
   * Recommended to only allow indexed fields for performance.
   *
   * - `undefined`: Allow all sorts (default)
   * - Empty array `[]`: Disable all sorts
   * - String array: Only allow sorting on specified fields
   *
   * @example ['createdAt', 'updatedAt', 'title']
   * @default undefined (all sorts allowed)
   */
  allowedSorts?: string[];

  /**
   * Allowed include relationship list
   *
   * Explicitly specifies relationships that can be included.
   * Recommended to only allow necessary relationships for performance and security.
   *
   * - `undefined`: Allow all includes (default)
   * - Empty array `[]`: Disable all includes
   * - String array: Only allow including specified relationships
   *
   * If a parent relationship is allowed, child relationships are also allowed.
   * Example: allowing 'author' also allows 'author.profile'
   *
   * @example ['author', 'comments', 'tags']
   * @default undefined (all includes allowed)
   */
  allowedIncludes?: string[];

  /**
   * Maximum include nesting depth
   *
   * Limits the maximum nesting level for relationship inclusion.
   * Deep nesting can cause N+1 query problems, so limiting is recommended.
   *
   * - `undefined`: Unlimited (default, use with caution)
   * - `1`: Only allow direct relationships (e.g., 'author')
   * - `2`: Allow 1-level nesting (e.g., 'author.profile')
   * - `n`: Allow n-1 levels of nesting
   *
   * @example 2
   * @default undefined (unlimited)
   */
  maxIncludeDepth?: number;

  /**
   * Allowed sparse fieldsets field list (by type)
   *
   * Restricts returnable fields for each resource type.
   * Used to hide fields containing sensitive information.
   *
   * - `undefined`: Allow all fields (default)
   * - Field array by type: Only allow selecting specified fields
   *
   * @example { articles: ['title', 'content'], users: ['name', 'email'] }
   * @default undefined (all fields allowed)
   */
  allowedFields?: Record<string, string[]>;

  /**
   * Handling method for disallowed query parameters
   *
   * Specifies behavior when a query parameter not in the whitelist is requested.
   *
   * - `'ignore'`: Ignore and proceed (default, backward compatible)
   * - `'error'`: Return 400 Bad Request error
   *
   * 'error' mode is recommended for security-critical APIs.
   *
   * @example 'error'
   * @default 'ignore'
   */
  onDisallowed?: 'ignore' | 'error';
}

/**
 * Query whitelist validation result
 *
 * Return type of parseWithWhitelist method,
 * includes validated parsing result along with warning/error messages.
 *
 * @example
 * ```typescript
 * const result = queryService.parseWithWhitelist(request, whitelist);
 *
 * if (result.errors.length > 0) {
 *   throw new BadRequestException({ errors: result.errors });
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.warn('Ignored query parameters:', result.warnings);
 * }
 *
 * // Use result.parsed to execute query
 * ```
 */
export interface QueryValidationResult {
  /**
   * Parsing result with whitelist applied
   *
   * State with disallowed filters/sorts/includes/fields removed.
   */
  parsed: import('./filter.interface').ParsedQuery;

  /**
   * Warning message list for ignored query parameters
   *
   * Contains information when disallowed parameters were requested
   * in onDisallowed: 'ignore' mode.
   * Can be used for logging or debugging purposes.
   *
   * @example ["Filter field 'password' is not allowed"]
   */
  warnings: string[];

  /**
   * Error message list
   *
   * Contains information when disallowed parameters were requested
   * in onDisallowed: 'error' mode.
   * Should return 400 response if there are errors.
   *
   * @example ["Filter field 'password' is not allowed"]
   */
  errors: string[];
}
