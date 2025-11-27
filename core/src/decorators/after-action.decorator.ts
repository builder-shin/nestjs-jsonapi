/**
 * AfterAction 클래스 데코레이터 (Rails 스타일 after_action)
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
 * Rails 스타일 after_action 데코레이터
 *
 * 액션 실행 후에 호출될 메서드를 등록합니다.
 * 로깅, 캐시 무효화, 알림 전송 등에 사용됩니다.
 *
 * @param methodName - 실행할 메서드명
 * @param options - only/except 옵션
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * // 모든 액션 후 실행
 * @AfterAction('logActivity')
 * export class ArticleController extends JsonApiCrudController {
 *   logActivity() {
 *     // 활동 로깅 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 조회 제외하고 실행 (변경 작업에만)
 * @AfterAction('clearCache', { except: ['index', 'show'] })
 * export class ArticleController extends JsonApiCrudController {
 *   clearCache() {
 *     // 캐시 무효화 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 특정 액션에만 실행
 * @AfterAction('sendNotification', { only: ['create', 'publish'] })
 * export class ArticleController extends JsonApiCrudController {
 *   sendNotification() {
 *     // 알림 전송 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 여러 메서드 한번에 등록
 * @AfterAction('logActivity', 'updateStats', 'sendWebhook')
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // 여러 AfterAction 조합
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
  return (target: Function) => {
    const existing: ActionHookMetadata[] =
      Reflect.getMetadata(AFTER_ACTION_METADATA, target) || [];

    if (typeof optionsOrMethod === 'string') {
      // 여러 메서드 전달: @AfterAction('method1', 'method2')
      const methods = [methodName, optionsOrMethod, ...moreMethodNames];
      methods.forEach((method) => {
        existing.push({ methodName: method, options: {} });
      });
    } else {
      // 단일 메서드 + 옵션: @AfterAction('method', { only: [...] })
      existing.push({ methodName, options: optionsOrMethod || {} });
    }

    Reflect.defineMetadata(AFTER_ACTION_METADATA, existing, target);
  };
}
