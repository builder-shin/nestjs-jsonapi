/**
 * Controller options and action type definitions
 *
 * @packageDocumentation
 * @module interfaces
 */

import { Type } from '@nestjs/common';
import { QueryWhitelistOptions } from './query-options.interface';

/**
 * Default CRUD action types
 */
export type CrudAction =
  | 'index'
  | 'show'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'upsertMany'
  | 'delete'
  | 'deleteMany';

/**
 * Default CRUD action list
 */
export const CRUD_ACTIONS: CrudAction[] = [
  'index',
  'show',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'upsertMany',
  'delete',
  'deleteMany',
];

/**
 * Action type (default CRUD + custom actions)
 *
 * Custom actions can be freely defined as strings.
 *
 * @example
 * ```typescript
 * // Default CRUD
 * only: ['index', 'show', 'create']
 *
 * // Including custom actions
 * only: ['show', 'update', 'delete', 'publish', 'archive']
 * ```
 */
export type ActionType = CrudAction | (string & {});

/**
 * Controller decorator options
 *
 * Configuration object passed to @JsonApiController decorator.
 *
 * @template CreateDto - Create DTO type
 * @template UpdateDto - Update DTO type
 *
 * @example
 * ```typescript
 * @JsonApiController({
 *   model: 'article',
 *   serializer: ArticleSerializer,
 *   dto: {
 *     create: CreateArticleDto,
 *     update: UpdateArticleDto,
 *   },
 *   only: ['index', 'show', 'create', 'update', 'delete'],
 *   type: 'articles',
 * })
 * export class ArticlesController extends JsonApiCrudController {}
 * ```
 */
export interface JsonApiControllerOptions<CreateDto = any, UpdateDto = any> {
  /**
   * Prisma model name (lowercase)
   * @example 'article'
   */
  model: string;

  /**
   * Serializer class
   */
  serializer: Type<any>;

  /**
   * DTO class configuration
   */
  dto?: {
    create?: Type<CreateDto>;
    update?: Type<UpdateDto>;
  };

  /**
   * Actions to enable (use either only or except, not both)
   * Both default CRUD and custom actions can be specified
   */
  only?: ActionType[];

  /**
   * Actions to disable (use either only or except, not both)
   */
  except?: ActionType[];

  /**
   * Resource type name (JSON:API type field)
   * If not specified, model name will be pluralized
   * @example 'articles'
   */
  type?: string;

  /**
   * Query parameter whitelist settings
   *
   * Restricts filter, sort, include, fields query parameters
   * to enhance security and performance.
   *
   * If not configured, all query parameters are allowed (backward compatible).
   *
   * @example
   * ```typescript
   * // Allow only specific filters/sorts/includes
   * query: {
   *   allowedFilters: ['status', 'createdAt'],
   *   allowedSorts: ['createdAt', '-updatedAt'],
   *   allowedIncludes: ['author', 'comments'],
   *   maxIncludeDepth: 2,
   *   onDisallowed: 'error',
   * }
   *
   * // Disable all queries
   * query: {
   *   allowedFilters: [],
   *   allowedSorts: [],
   *   allowedIncludes: [],
   * }
   * ```
   */
  query?: QueryWhitelistOptions;
}

/**
 * Action hook options
 *
 * Configuration passed to @BeforeAction, @AfterAction decorators.
 *
 * @example
 * ```typescript
 * @BeforeAction({ only: ['create', 'update'] })
 * async validateInput() { ... }
 *
 * @AfterAction({ except: ['index'] })
 * async logAction() { ... }
 * ```
 */
export interface ActionHookOptions {
  /**
   * Run only for these actions
   * Both default CRUD and custom action names can be used
   * @example only: ['show', 'update', 'delete', 'publish', 'archive']
   */
  only?: ActionType[];

  /**
   * Do not run for these actions
   * @example except: ['index', 'show']
   */
  except?: ActionType[];
}

/**
 * Action hook metadata
 *
 * Used internally to store hook information.
 */
export interface ActionHookMetadata {
  /** Method name where hook is applied */
  methodName: string;
  /** Hook options */
  options: ActionHookOptions;
}
