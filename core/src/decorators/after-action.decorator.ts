/**
 * AfterAction Class Decorator (Rails-style after_action)
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - reflect-metadata
 * - ../constants: AFTER_ACTION_METADATA
 * - ../interfaces: ActionHookOptions, ActionHookMetadata
 */

import 'reflect-metadata';
import { AFTER_ACTION_METADATA } from '../constants';
import { ActionHookOptions, ActionHookMetadata } from '../interfaces';

/**
 * Rails-style after_action decorator
 *
 * Registers a method to be called after action execution.
 * Used for logging, cache invalidation, notification sending, etc.
 *
 * @param methodName - Method name to execute
 * @param options - only/except options
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * // Execute after all actions
 * @AfterAction('logActivity')
 * export class ArticleController extends JsonApiCrudController {
 *   logActivity() {
 *     // Activity logging logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Execute except for read operations (only for write operations)
 * @AfterAction('clearCache', { except: ['index', 'show'] })
 * export class ArticleController extends JsonApiCrudController {
 *   clearCache() {
 *     // Cache invalidation logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Execute only for specific actions
 * @AfterAction('sendNotification', { only: ['create', 'publish'] })
 * export class ArticleController extends JsonApiCrudController {
 *   sendNotification() {
 *     // Notification sending logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Register multiple methods at once
 * @AfterAction('logActivity', 'updateStats', 'sendWebhook')
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // Combine multiple AfterActions
 * @AfterAction('logActivity')
 * @AfterAction('clearCache', { except: ['index', 'show'] })
 * @AfterAction('sendNotification', { only: ['create'] })
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 */
export function AfterAction(
  methodName: string,
  options?: ActionHookOptions,
): ClassDecorator;
export function AfterAction(
  methodName: string,
  ...moreMethodNames: string[]
): ClassDecorator;
export function AfterAction(
  methodName: string,
  optionsOrMethod?: ActionHookOptions | string,
  ...moreMethodNames: string[]
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    const existing: ActionHookMetadata[] =
      Reflect.getMetadata(AFTER_ACTION_METADATA, target) || [];

    if (typeof optionsOrMethod === 'string') {
      // Multiple methods passed: @AfterAction('method1', 'method2')
      const methods = [methodName, optionsOrMethod, ...moreMethodNames];
      methods.forEach((method) => {
        existing.push({ methodName: method, options: {} });
      });
    } else {
      // Single method + options: @AfterAction('method', { only: [...] })
      existing.push({ methodName, options: optionsOrMethod || {} });
    }

    Reflect.defineMetadata(AFTER_ACTION_METADATA, existing, target);
  };
}
