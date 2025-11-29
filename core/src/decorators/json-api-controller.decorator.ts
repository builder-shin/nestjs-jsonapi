/**
 * JSON:API Controller Decorator
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - @nestjs/common: SetMetadata, applyDecorators
 * - ../interfaces: JsonApiControllerOptions
 * - ../constants: JSON_API_CONTROLLER_OPTIONS
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { JsonApiControllerOptions } from '../interfaces';
import { JSON_API_CONTROLLER_OPTIONS } from '../constants';

/**
 * JSON:API Controller Decorator
 *
 * Registers JSON:API configuration on a controller.
 * Use with JsonApiCrudController to auto-generate CRUD endpoints.
 *
 * @param options - Controller options
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * @Controller('articles')
 * @JsonApiController({
 *   model: 'article',
 *   serializer: ArticleSerializer,
 *   dto: {
 *     create: CreateArticleDto,
 *     update: UpdateArticleDto,
 *   },
 *   only: ['index', 'show', 'create', 'update', 'delete'],
 * })
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // Custom resource type specification
 * @Controller('posts')
 * @JsonApiController({
 *   model: 'article',
 *   serializer: ArticleSerializer,
 *   type: 'blog-posts',  // Value used for JSON:API type field
 * })
 * export class PostsController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // Exclude specific actions
 * @Controller('comments')
 * @JsonApiController({
 *   model: 'comment',
 *   serializer: CommentSerializer,
 *   except: ['delete', 'deleteMany'],  // Disable deletion
 * })
 * export class CommentsController extends JsonApiCrudController {}
 * ```
 */
export function JsonApiController(
  options: JsonApiControllerOptions,
): ClassDecorator {
  return applyDecorators(SetMetadata(JSON_API_CONTROLLER_OPTIONS, options));
}
