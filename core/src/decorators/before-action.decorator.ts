/**
 * BeforeAction 클래스 데코레이터 (Rails 스타일 before_action)
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
 * Rails 스타일 before_action 데코레이터
 *
 * 액션 실행 전에 호출될 메서드를 등록합니다.
 * 인증, 권한 검사, 레코드 로드 등에 사용됩니다.
 *
 * @param methodName - 실행할 메서드명
 * @param options - only/except 옵션
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * // 모든 액션에 적용
 * @BeforeAction('authenticate')
 * export class ArticleController extends JsonApiCrudController {
 *   authenticate() {
 *     // 인증 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 특정 액션에만 적용 (기본 CRUD + 커스텀)
 * @BeforeAction('setArticle', { only: ['show', 'update', 'delete', 'publish'] })
 * export class ArticleController extends JsonApiCrudController {
 *   setArticle() {
 *     // 레코드 로드 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 특정 액션 제외
 * @BeforeAction('logRequest', { except: ['index'] })
 * export class ArticleController extends JsonApiCrudController {
 *   logRequest() {
 *     // 요청 로깅 로직
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 여러 메서드 한번에 등록
 * @BeforeAction('authenticate', 'authorize', 'loadTenant')
 * export class ArticleController extends JsonApiCrudController {}
 * ```
 *
 * @example
 * ```typescript
 * // 여러 BeforeAction 조합
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
      // 여러 메서드 전달: @BeforeAction('method1', 'method2')
      const methods = [methodName, optionsOrMethod, ...moreMethodNames];
      methods.forEach((method) => {
        existing.push({ methodName: method, options: {} });
      });
    } else {
      // 단일 메서드 + 옵션: @BeforeAction('method', { only: [...] })
      existing.push({ methodName, options: optionsOrMethod || {} });
    }

    Reflect.defineMetadata(BEFORE_ACTION_METADATA, existing, target);
  };
}
