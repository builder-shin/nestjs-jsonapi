/**
 * BeforeAction Class Decorator (Rails-style before_action)
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - reflect-metadata
 * - ../constants: BEFORE_ACTION_METADATA
 * - ../interfaces: ActionHookOptions, ActionHookMetadata
 */

import 'reflect-metadata';
import { BEFORE_ACTION_METADATA } from '../constants';
import { ActionHookOptions, ActionHookMetadata } from '../interfaces';

/**
 * Rails-style before_action decorator
 *
 * Registers a method to be called before action execution.
 * Used for authentication, authorization, record loading, etc.
 *
 * @param methodName - Method name to execute
 * @param options - only/except options
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * // Apply to all actions
 * @BeforeAction('authenticate')
 * export class ArticleController extends JsonApiCrudController {
 *   authenticate() {
 *     // Authentication logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Apply only to specific actions (built-in CRUD + custom)
 * @BeforeAction('setArticle', { only: ['show', 'update', 'delete', 'publish'] })
 * export class ArticleController extends JsonApiCrudController {
 *   setArticle() {
 *     // Record loading logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Exclude specific actions
 * @BeforeAction('logRequest', { except: ['index'] })
 * export class ArticleController extends JsonApiCrudController {
 *   logRequest() {
 *     // Request logging logic
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Register multiple methods at once
 * @BeforeAction('authenticate', 'authorize', 'loadTenant')
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // Combine multiple BeforeActions
 * @BeforeAction('authenticate')
 * @BeforeAction('setArticle', { only: ['show', 'update', 'delete'] })
 * @BeforeAction('authorize', { only: ['update', 'delete'] })
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 */
export function BeforeAction(
  methodName: string,
  options?: ActionHookOptions,
): ClassDecorator;
export function BeforeAction(
  methodName: string,
  ...moreMethodNames: string[]
): ClassDecorator;
export function BeforeAction(
  methodName: string,
  optionsOrMethod?: ActionHookOptions | string,
  ...moreMethodNames: string[]
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    const existing: ActionHookMetadata[] =
      Reflect.getMetadata(BEFORE_ACTION_METADATA, target) || [];

    if (typeof optionsOrMethod === 'string') {
      // Multiple methods passed: @BeforeAction('method1', 'method2')
      const methods = [methodName, optionsOrMethod, ...moreMethodNames];
      methods.forEach((method) => {
        existing.push({ methodName: method, options: {} });
      });
    } else {
      // Single method + options: @BeforeAction('method', { only: [...] })
      existing.push({ methodName, options: optionsOrMethod || {} });
    }

    Reflect.defineMetadata(BEFORE_ACTION_METADATA, existing, target);
  };
}
