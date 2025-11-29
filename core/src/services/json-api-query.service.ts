/**
 * JSON:API query parsing service
 *
 * @packageDocumentation
 * @module services
 *
 * Dependencies: constants/metadata.constants.ts, interfaces/*, utils/*
 */

import { Injectable, Inject } from '@nestjs/common';
import { Request } from 'express';
import { JSON_API_MODULE_OPTIONS } from '../constants';
import {
  JsonApiModuleOptions,
  ParsedQuery,
  ParsedFilterCondition,
  FilterOperator,
  QueryWhitelistOptions,
  QueryValidationResult,
} from '../interfaces';
import {
  toCamelCase,
  isValidOperator,
  isValidFieldName,
  parseFilterValue,
  setNestedValue,
  operatorToPrisma,
} from '../utils';

/**
 * JSON:API query parsing service
 *
 * Parses URL query parameters and converts them to Prisma query options.
 *
 * @remarks
 * Supports 12 filter operators:
 * - eq: Equals (default)
 * - ne: Not equals
 * - like: LIKE search (case-sensitive)
 * - ilike: LIKE search (case-insensitive)
 * - gt: Greater than
 * - gte: Greater than or equal
 * - lt: Less than
 * - lte: Less than or equal
 * - in: Included in array
 * - nin: Not included in array
 * - null: Is null check
 * - between: Range
 *
 * @example
 * ```typescript
 * // URL: /articles?filter[status]=published&filter[views][gte]=100&sort=-createdAt&page[limit]=20
 *
 * const parsed = queryService.parse(request);
 * const prismaOptions = queryService.toPrismaOptions(parsed, 'article');
 *
 * // prismaOptions:
 * // {
 * //   where: { status: 'published', views: { gte: 100 } },
 * //   orderBy: [{ createdAt: 'desc' }],
 * //   skip: 0,
 * //   take: 20
 * // }
 * ```
 */
@Injectable()
export class JsonApiQueryService {
  constructor(
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly options: JsonApiModuleOptions,
  ) {}

  /**
   * Parse JSON:API query parameters from Request
   *
   * @param request Express Request object
   * @returns Parsed query structure
   */
  parse(request: Request): ParsedQuery {
    const query = request.query;

    return {
      filter: this.parseFilter(query.filter),
      sort: this.parseSort(query.sort as string),
      page: this.parsePage(query.page),
      include: this.parseInclude(query.include as string),
      fields: this.parseFields(query.fields),
    };
  }

  /**
   * Parse query with whitelist applied
   *
   * Parses query parameters from Request and validates against whitelist options
   * for disallowed filters/sorts/includes/fields.
   *
   * @remarks
   * - If whitelist is undefined, skips validation and performs existing parse behavior (backward compatible)
   * - In onDisallowed: 'ignore' mode, records disallowed parameters in warnings and removes them
   * - In onDisallowed: 'error' mode, records disallowed parameters in errors and removes them
   *
   * @param request Express Request object
   * @param whitelist Whitelist options (optional)
   * @returns Validated parsing result with warning/error messages
   *
   * @example
   * ```typescript
   * const whitelist: QueryWhitelistOptions = {
   *   allowedFilters: ['status', 'createdAt'],
   *   allowedSorts: ['createdAt', 'title'],
   *   allowedIncludes: ['author'],
   *   maxIncludeDepth: 2,
   *   onDisallowed: 'error',
   * };
   *
   * const { parsed, warnings, errors } = queryService.parseWithWhitelist(
   *   request,
   *   whitelist
   * );
   *
   * if (errors.length > 0) {
   *   throw new BadRequestException({ errors });
   * }
   * ```
   */
  parseWithWhitelist(
    request: Request,
    whitelist?: QueryWhitelistOptions,
  ): QueryValidationResult {
    const parsed = this.parse(request);

    // Skip validation if no whitelist (backward compatible)
    if (!whitelist) {
      return { parsed, warnings: [], errors: [] };
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    const onDisallowed = whitelist.onDisallowed ?? 'ignore';

    // Filter validation
    if (whitelist.allowedFilters !== undefined) {
      parsed.filter = this.validateFilters(
        parsed.filter,
        whitelist.allowedFilters,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // Sort validation
    if (whitelist.allowedSorts !== undefined) {
      parsed.sort = this.validateSorts(
        parsed.sort,
        whitelist.allowedSorts,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // Include validation
    if (
      whitelist.allowedIncludes !== undefined ||
      whitelist.maxIncludeDepth !== undefined
    ) {
      parsed.include = this.validateIncludes(
        parsed.include,
        whitelist.allowedIncludes,
        whitelist.maxIncludeDepth,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // Fields validation
    if (whitelist.allowedFields !== undefined) {
      parsed.fields = this.validateFields(
        parsed.fields,
        whitelist.allowedFields,
        onDisallowed,
        warnings,
        errors,
      );
    }

    return { parsed, warnings, errors };
  }

  /**
   * Parse filter parameters
   *
   * Supported formats:
   * - Simple filter: ?filter[field]=value (default eq operator)
   * - Operator filter: ?filter[field][operator]=value
   *
   * @example
   * ?filter[status]=published                    → status eq 'published'
   * ?filter[name][like]=John                     → name LIKE '%John%'
   * ?filter[age][gte]=18                         → age >= 18
   * ?filter[role][in]=admin,user                 → role IN ['admin', 'user']
   * ?filter[deletedAt][null]=true                → deletedAt IS NULL
   * ?filter[price][between]=100,500              → price BETWEEN 100 AND 500
   * ?filter[author.name][like]=John              → author.name LIKE '%John%'
   *
   * @param filter Filter object from query
   * @returns Parsed filter condition array
   */
  private parseFilter(filter: unknown): ParsedFilterCondition[] {
    const conditions: ParsedFilterCondition[] = [];

    if (!filter || typeof filter !== 'object') {
      return conditions;
    }

    const filterObj = filter as Record<string, unknown>;

    for (const [field, value] of Object.entries(filterObj)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Field name validation (injection prevention)
      if (!isValidFieldName(field)) {
        // Invalid field names are ignored (minimize security error information exposure)
        continue;
      }

      // Value is object: filter[field][operator]=value
      if (typeof value === 'object' && !Array.isArray(value)) {
        const operatorObj = value as Record<string, unknown>;

        for (const [op, opValue] of Object.entries(operatorObj)) {
          if (isValidOperator(op)) {
            conditions.push({
              field,
              operator: op as FilterOperator,
              // Pass field for error message inclusion
              value: parseFilterValue(op as FilterOperator, opValue, field),
            });
          }
        }
      } else {
        // Simple value: filter[field]=value (default eq operator)
        conditions.push({
          field,
          operator: 'eq',
          value,
        });
      }
    }

    return conditions;
  }

  /**
   * Parse sort parameters
   *
   * @example ?sort=-createdAt,title (- prefix means DESC)
   *
   * @param sort Sort string
   * @returns Sort condition array
   */
  private parseSort(
    sort: string | undefined,
  ): { field: string; order: 'asc' | 'desc' }[] {
    if (!sort) {
      return [];
    }

    return sort
      .split(',')
      .map((field) => {
        const trimmed = field.trim();
        const isDesc = trimmed.startsWith('-');
        const fieldName = isDesc ? trimmed.substring(1) : trimmed;

        // Field name validation (injection prevention)
        if (!isValidFieldName(fieldName)) {
          return null;
        }

        return {
          field: fieldName,
          order: isDesc ? ('desc' as const) : ('asc' as const),
        };
      })
      .filter(
        (item): item is { field: string; order: 'asc' | 'desc' } =>
          item !== null,
      );
  }

  /**
   * Parse pagination parameters
   *
   * @example ?page[offset]=0&page[limit]=20
   *
   * @param page Page object
   * @returns Pagination settings
   */
  private parsePage(page: unknown): { offset: number; limit: number } {
    const { defaultLimit, maxLimit } = this.options.pagination;

    if (!page || typeof page !== 'object') {
      return { offset: 0, limit: defaultLimit };
    }

    const pageObj = page as Record<string, string>;
    const offset = Math.max(0, parseInt(pageObj.offset, 10) || 0);
    let limit = parseInt(pageObj.limit, 10) || defaultLimit;
    limit = Math.min(Math.max(1, limit), maxLimit);

    return { offset, limit };
  }

  /**
   * Parse include parameters (relationship inclusion)
   *
   * @example ?include=comments,author.profile
   *
   * @param include Include string
   * @returns Array of relationships to include
   */
  private parseInclude(include: string | undefined): string[] {
    if (!include) {
      return [];
    }
    return include
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Parse sparse fieldsets
   *
   * @example ?fields[articles]=title,content&fields[comments]=body
   *
   * @param fields Fields object
   * @returns Map of selected fields by type
   */
  private parseFields(fields: unknown): Record<string, string[]> {
    if (!fields || typeof fields !== 'object') {
      return {};
    }

    const result: Record<string, string[]> = {};
    for (const [type, fieldList] of Object.entries(
      fields as Record<string, string>,
    )) {
      if (typeof fieldList === 'string') {
        result[type] = fieldList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return result;
  }

  /**
   * Convert ParsedQuery to Prisma findMany options
   *
   * @param parsed Parsed query structure
   * @param model Prisma model name (currently unused, for future extension)
   * @returns Prisma findMany options
   */
  toPrismaOptions(parsed: ParsedQuery, _model: string): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    // Filter → where
    if (parsed.filter.length > 0) {
      options.where = this.filterToPrismaWhere(parsed.filter);
    }

    // Sort → orderBy
    if (parsed.sort.length > 0) {
      options.orderBy = parsed.sort.map(({ field, order }) => ({
        [toCamelCase(field)]: order,
      }));
    }

    // Page → skip, take
    options.skip = parsed.page.offset;
    options.take = parsed.page.limit;

    // Include → include
    if (parsed.include.length > 0) {
      options.include = this.includeToPrismaInclude(parsed.include);
    }

    return options;
  }

  /**
   * Convert filter conditions to Prisma where clause
   *
   * @param conditions Parsed filter condition array
   * @returns Prisma where object
   */
  filterToPrismaWhere(
    conditions: ParsedFilterCondition[],
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const prismaCondition = operatorToPrisma(operator, value);

      // Nested relationship handling (e.g., author.name → { author: { name: condition } })
      if (field.includes('.')) {
        setNestedValue(where, field, prismaCondition, toCamelCase);
      } else {
        const camelField = toCamelCase(field);

        // Merge if multiple conditions exist for the same field
        if (where[camelField] && typeof where[camelField] === 'object') {
          where[camelField] = {
            ...(where[camelField] as object),
            ...(prismaCondition as object),
          };
        } else {
          where[camelField] = prismaCondition;
        }
      }
    }

    return where;
  }

  /**
   * Convert include array to Prisma include object
   *
   * @example
   * // Simple relationship
   * ['comments'] → { comments: true }
   *
   * // Nested relationship
   * ['author.profile'] → { author: { include: { profile: true } } }
   *
   * // Deep nesting
   * ['author.profile.avatar'] → { author: { include: { profile: { include: { avatar: true } } } } }
   *
   * // Composite relationships
   * ['comments', 'author.profile'] → { comments: true, author: { include: { profile: true } } }
   *
   * @param includes Include string array
   * @returns Prisma include object
   */
  includeToPrismaInclude(includes: string[]): Record<string, boolean | object> {
    const result: Record<string, boolean | object> = {};

    for (const include of includes) {
      if (include.includes('.')) {
        // Nested relationship handling
        const parts = include.split('.');
        this.setNestedInclude(result, parts.map(toCamelCase));
      } else {
        const part = toCamelCase(include);
        // Maintain if already set as nested object
        if (!result[part]) {
          result[part] = true;
        }
      }
    }

    return result;
  }

  /**
   * Recursively create nested include structure
   *
   * @param obj Target object
   * @param parts Path array (e.g., ['author', 'profile', 'avatar'])
   */
  private setNestedInclude(
    obj: Record<string, boolean | object>,
    parts: string[],
  ): void {
    const [current, ...rest] = parts;

    if (rest.length === 0) {
      // Last part: maintain if already object, otherwise set to true
      if (!obj[current] || obj[current] === true) {
        obj[current] = true;
      }
      return;
    }

    // Middle part: create include structure
    if (!obj[current] || obj[current] === true) {
      obj[current] = { include: {} };
    }

    // Recursive call to handle next level
    const nested = obj[current] as { include: Record<string, boolean | object> };
    this.setNestedInclude(nested.include, rest);
  }

  // ========================================
  // Whitelist validation methods
  // ========================================

  /**
   * Validate filter conditions
   *
   * Validates filter conditions based on allowed field list.
   * For nested fields, child fields are allowed if parent field is allowed.
   *
   * @param filters Parsed filter condition array
   * @param allowed Allowed filter field list
   * @param onDisallowed Handling method for disallowed filters
   * @param warnings Array to add warning messages (ignore mode)
   * @param errors Array to add error messages (error mode)
   * @returns Filter condition array that passed validation
   */
  private validateFilters(
    filters: ParsedFilterCondition[],
    allowed: string[],
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): ParsedFilterCondition[] {
    return filters.filter((condition) => {
      const isAllowed = this.isFieldAllowed(condition.field, allowed);

      if (!isAllowed) {
        const message = `Filter field '${condition.field}' is not allowed`;
        if (onDisallowed === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Validate sort conditions
   *
   * Validates sort conditions based on allowed field list.
   *
   * @param sorts Parsed sort condition array
   * @param allowed Allowed sort field list
   * @param onDisallowed Handling method for disallowed sorts
   * @param warnings Array to add warning messages (ignore mode)
   * @param errors Array to add error messages (error mode)
   * @returns Sort condition array that passed validation
   */
  private validateSorts(
    sorts: { field: string; order: 'asc' | 'desc' }[],
    allowed: string[],
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): { field: string; order: 'asc' | 'desc' }[] {
    return sorts.filter((sort) => {
      const isAllowed = allowed.includes(sort.field);

      if (!isAllowed) {
        const message = `Sort field '${sort.field}' is not allowed`;
        if (onDisallowed === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Validate include relationships
   *
   * Validates includes based on allowed relationship list and max depth.
   * Child relationships are allowed if parent relationship is allowed.
   *
   * @param includes Parsed include array
   * @param allowed Allowed include relationship list (undefined means only validate depth)
   * @param maxDepth Maximum include depth (undefined means unlimited)
   * @param onDisallowed Handling method for disallowed includes
   * @param warnings Array to add warning messages (ignore mode)
   * @param errors Array to add error messages (error mode)
   * @returns Include array that passed validation
   */
  private validateIncludes(
    includes: string[],
    allowed: string[] | undefined,
    maxDepth: number | undefined,
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): string[] {
    return includes.filter((include) => {
      // Depth check
      if (maxDepth !== undefined) {
        const depth = include.split('.').length;
        if (depth > maxDepth) {
          const message = `Include '${include}' exceeds max depth of ${maxDepth}`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
          return false;
        }
      }

      // Allowed list check
      if (allowed !== undefined) {
        const isAllowed = this.isIncludeAllowed(include, allowed);
        if (!isAllowed) {
          const message = `Include '${include}' is not allowed`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Validate sparse fieldsets
   *
   * Validates fields based on allowed field list per type.
   * If no configuration exists for a specific type, all fields for that type are allowed.
   *
   * @param fields Parsed fields object (field array by type)
   * @param allowed Allowed field list by type
   * @param onDisallowed Handling method for disallowed fields
   * @param warnings Array to add warning messages (ignore mode)
   * @param errors Array to add error messages (error mode)
   * @returns Fields object that passed validation
   */
  private validateFields(
    fields: Record<string, string[]>,
    allowed: Record<string, string[]>,
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): Record<string, string[]> {
    const validated: Record<string, string[]> = {};

    for (const [type, fieldList] of Object.entries(fields)) {
      const allowedFields = allowed[type];

      if (!allowedFields) {
        // No configuration for this type → allow all
        validated[type] = fieldList;
        continue;
      }

      validated[type] = fieldList.filter((field) => {
        const isAllowed = allowedFields.includes(field);
        if (!isAllowed) {
          const message = `Field '${field}' for type '${type}' is not allowed`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
        }
        return isAllowed;
      });
    }

    return validated;
  }

  /**
   * Check if field is allowed (supports nested fields)
   *
   * For nested fields, child fields are allowed if parent field is allowed.
   *
   * @example
   * ```typescript
   * // allowed: ['author', 'author.name', 'status']
   * isFieldAllowed('author.name', allowed)   // true (exact match)
   * isFieldAllowed('author.email', allowed)  // true ('author' is allowed)
   * isFieldAllowed('comments.author', allowed) // false
   * ```
   *
   * @param field Field name to check
   * @param allowed Allowed field list
   * @returns Whether allowed
   */
  private isFieldAllowed(field: string, allowed: string[]): boolean {
    // Exact match
    if (allowed.includes(field)) return true;

    // Nested field: child is allowed if parent is allowed
    // e.g., if 'author' is allowed, 'author.name', 'author.email' etc. are all allowed
    const parts = field.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (allowed.includes(parent)) return true;
    }

    return false;
  }

  /**
   * Check if include is allowed (supports nested relationships)
   *
   * For nested relationships, child relationships are allowed if parent is allowed.
   *
   * @example
   * ```typescript
   * // allowed: ['author', 'comments']
   * isIncludeAllowed('author', allowed)          // true
   * isIncludeAllowed('author.profile', allowed)  // true (author is allowed)
   * isIncludeAllowed('tags', allowed)            // false
   * ```
   *
   * @param include Include relationship to check
   * @param allowed Allowed include relationship list
   * @returns Whether allowed
   */
  private isIncludeAllowed(include: string, allowed: string[]): boolean {
    // Exact match
    if (allowed.includes(include)) return true;

    // Nested: child is allowed if parent is allowed
    const parts = include.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (allowed.includes(parent)) return true;
    }

    return false;
  }
}
