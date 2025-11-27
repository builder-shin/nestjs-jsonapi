/**
 * JSON:API 커스텀 액션 데코레이터
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - @nestjs/common: SetMetadata
 * - ../constants: JSON_API_ACTION_METADATA
 */

import { SetMetadata } from '@nestjs/common';
import { JSON_API_ACTION_METADATA } from '../constants';

/**
 * 커스텀 액션 데코레이터
 *
 * 커스텀 액션(예: publish, archive, approve 등)을 정의할 때 사용합니다.
 * 이 데코레이터로 등록된 액션명은 @BeforeAction/@AfterAction의
 * only/except 옵션에서 참조할 수 있습니다.
 *
 * ## 기본 CRUD 액션
 * 다음 액션명은 기본 제공되며 별도 등록 없이 사용 가능합니다:
 * - 'index': GET /resources (목록 조회)
 * - 'show': GET /resources/:id (단일 조회)
 * - 'create': POST /resources (생성)
 * - 'createMany': POST /resources/bulk (대량 생성)
 * - 'update': PATCH /resources/:id (수정)
 * - 'updateMany': PATCH /resources/bulk (대량 수정)
 * - 'upsert': PUT /resources/:id (생성 또는 수정)
 * - 'upsertMany': PUT /resources/bulk (대량 생성 또는 수정)
 * - 'delete': DELETE /resources/:id (삭제)
 * - 'deleteMany': DELETE /resources/bulk (대량 삭제)
 *
 * ## 커스텀 액션 등록
 * 기본 CRUD 외 추가 액션을 정의할 때 @JsonApiAction을 사용합니다.
 * 등록된 커스텀 액션은 only/except에서 기본 액션과 동일하게 참조됩니다.
 *
 * @param actionName - 액션명 (예: 'publish', 'archive', 'approve')
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * // 커스텀 액션 정의
 * @Post(':id/publish')
 * @JsonApiAction('publish')
 * async publish(@Param('id') id: string) {
 *   return this.executeAction('publish', async () => {
 *     // BeforeAction/AfterAction 훅이 자동으로 실행됨
 *     return this.articleService.publish(id);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // only/except에서 커스텀 액션 참조
 * @BeforeAction('loadRecord', { only: ['show', 'update', 'delete', 'publish', 'archive'] })
 * @AfterAction('sendNotification', { only: ['publish'] })
 * @AfterAction('logActivity', { except: ['index', 'show'] })
 * export class ArticleController extends JsonApiCrudController {
 *   // 'publish'와 'archive'는 커스텀 액션이지만
 *   // only/except에서 기본 액션과 동일하게 사용 가능
 * }
 * ```
 *
 * @see BeforeAction - 액션 실행 전 훅
 * @see AfterAction - 액션 실행 후 훅
 * @see executeAction - 커스텀 액션에서 훅 실행을 위한 메서드
 */
export function JsonApiAction(actionName: string): MethodDecorator {
  return SetMetadata(JSON_API_ACTION_METADATA, actionName);
}
