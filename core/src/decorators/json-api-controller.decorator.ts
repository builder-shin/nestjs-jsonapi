/**
 * JSON:API 컨트롤러 데코레이터
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
 * JSON:API 컨트롤러 데코레이터
 *
 * 컨트롤러에 JSON:API 설정을 등록합니다.
 * JsonApiCrudController와 함께 사용하여 자동 CRUD 엔드포인트를 생성합니다.
 *
 * @param options - 컨트롤러 옵션
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
 * // 커스텀 리소스 타입 지정
 * @Controller('posts')
 * @JsonApiController({
 *   model: 'article',
 *   serializer: ArticleSerializer,
 *   type: 'blog-posts',  // JSON:API type 필드에 사용될 값
 * })
 * export class PostsController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // 특정 액션 제외
 * @Controller('comments')
 * @JsonApiController({
 *   model: 'comment',
 *   serializer: CommentSerializer,
 *   except: ['delete', 'deleteMany'],  // 삭제 비활성화
 * })
 * export class CommentsController extends JsonApiCrudController {}
 * ```
 */
export function JsonApiController(
  options: JsonApiControllerOptions,
): ClassDecorator {
  return applyDecorators(SetMetadata(JSON_API_CONTROLLER_OPTIONS, options));
}
