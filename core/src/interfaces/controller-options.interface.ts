/**
 * Controller options and action type definitions
 *
 * @packageDocumentation
 * @module interfaces
 */

import { Type } from '@nestjs/common';
import { QueryWhitelistOptions } from './query-options.interface';
import { IdType } from './module-options.interface';

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
 * 관계 정의 옵션
 *
 * @JsonApiController 데코레이터에서 사용됩니다.
 *
 * @example
 * ```typescript
 * const authorRelation: RelationshipDefinition = {
 *   type: 'users',
 *   many: false,
 * };
 * ```
 */
export interface RelationshipDefinition {
  /**
   * 관계 대상의 JSON:API 리소스 타입명
   * @example 'users', 'comments'
   */
  type: string;

  /**
   * true이면 to-many 관계, false/undefined이면 to-one 관계
   * @default false
   */
  many?: boolean;
}

/**
 * JsonApiControllerOptions의 relationships 필드 타입
 *
 * 키: 관계 필드명 (예: 'author', 'comments')
 * 값: 관계 정의
 *
 * @example
 * ```typescript
 * const relationships: RelationshipsConfig = {
 *   author: { type: 'users', many: false },
 *   comments: { type: 'comments', many: true },
 * };
 * ```
 */
export type RelationshipsConfig = Record<string, RelationshipDefinition>;

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

  // ========== 신규 필드 (추가) ==========

  /**
   * 관계 정의
   *
   * Server Config API에서 관계 정보를 노출할 때 사용합니다.
   * 미지정 시 Server Config 응답에서 relationships가 undefined로 반환됩니다.
   *
   * @example
   * ```typescript
   * relationships: {
   *   author: { type: 'users', many: false },
   *   comments: { type: 'comments', many: true },
   *   tags: { type: 'tags', many: true },
   * }
   * ```
   */
  relationships?: RelationshipsConfig;

  /**
   * ID 타입
   *
   * 컨트롤러별 ID 타입을 지정합니다.
   * 미지정 시 모듈 전역 설정(moduleOptions.idType)을 사용합니다.
   *
   * @example 'uuid'
   */
  idType?: IdType;

  /**
   * API 경로
   *
   * 컨트롤러의 API 경로를 지정합니다.
   * 미지정 시 type 또는 모델명 복수형을 사용합니다.
   *
   * 참고: 이 필드는 @Controller() 데코레이터와 별개입니다.
   * 기존 코드에서는 @Controller() 데코레이터를 별도로 적용해야 합니다.
   *
   * @example 'blog-posts'
   */
  path?: string;
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
