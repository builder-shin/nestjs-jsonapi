/**
 * JSON:API Custom Action Decorator
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
 * Custom Action Decorator
 *
 * Used to define custom actions (e.g., publish, archive, approve).
 * Action names registered with this decorator can be referenced
 * in @BeforeAction/@AfterAction's only/except options.
 *
 * ## Built-in CRUD Actions
 * The following action names are provided by default and can be used without registration:
 * - 'index': GET /resources (list query)
 * - 'show': GET /resources/:id (single query)
 * - 'create': POST /resources (create)
 * - 'createMany': POST /resources/bulk (bulk create)
 * - 'update': PATCH /resources/:id (update)
 * - 'updateMany': PATCH /resources/bulk (bulk update)
 * - 'upsert': PUT /resources/:id (create or update)
 * - 'upsertMany': PUT /resources/bulk (bulk create or update)
 * - 'delete': DELETE /resources/:id (delete)
 * - 'deleteMany': DELETE /resources/bulk (bulk delete)
 *
 * ## Custom Action Registration
 * Use @JsonApiAction to define additional actions beyond basic CRUD.
 * Registered custom actions can be referenced in only/except like built-in actions.
 *
 * @param actionName - Action name (e.g., 'publish', 'archive', 'approve')
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * // Define custom action
 * @Post(':id/publish')
 * @JsonApiAction('publish')
 * async publish(@Param('id') id: string) {
 *   return this.executeAction('publish', async () => {
 *     // BeforeAction/AfterAction hooks are automatically executed
 *     return this.articleService.publish(id);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Reference custom actions in only/except
 * @BeforeAction('loadRecord', { only: ['show', 'update', 'delete', 'publish', 'archive'] })
 * @AfterAction('sendNotification', { only: ['publish'] })
 * @AfterAction('logActivity', { except: ['index', 'show'] })
 * export class ArticleController extends JsonApiCrudController {
 *   // 'publish' and 'archive' are custom actions but
 *   // can be used in only/except like built-in actions
 * }
 * ```
 *
 * @see BeforeAction - Hook executed before action
 * @see AfterAction - Hook executed after action
 * @see executeAction - Method for executing hooks in custom actions
 */
export function JsonApiAction(actionName: string): MethodDecorator {
  return SetMetadata(JSON_API_ACTION_METADATA, actionName);
}
