/**
 * change-case-all 타입 선언
 *
 * @packageDocumentation
 * @module types
 */

declare module 'change-case-all' {
  /**
   * 문자열을 camelCase로 변환
   * @example camelCase('foo-bar') // 'fooBar'
   */
  export function camelCase(input: string): string;

  /**
   * 문자열을 PascalCase로 변환
   * @example pascalCase('foo-bar') // 'FooBar'
   */
  export function pascalCase(input: string): string;

  /**
   * 문자열을 snake_case로 변환
   * @example snakeCase('fooBar') // 'foo_bar'
   */
  export function snakeCase(input: string): string;

  /**
   * 문자열을 param-case (kebab-case)로 변환
   * @example paramCase('fooBar') // 'foo-bar'
   */
  export function paramCase(input: string): string;

  /**
   * 문자열을 CONSTANT_CASE로 변환
   * @example constantCase('fooBar') // 'FOO_BAR'
   */
  export function constantCase(input: string): string;

  /**
   * 문자열을 dot.case로 변환
   * @example dotCase('fooBar') // 'foo.bar'
   */
  export function dotCase(input: string): string;

  /**
   * 문자열을 path/case로 변환
   * @example pathCase('fooBar') // 'foo/bar'
   */
  export function pathCase(input: string): string;

  /**
   * 문자열을 Sentence case로 변환
   * @example sentenceCase('fooBar') // 'Foo bar'
   */
  export function sentenceCase(input: string): string;

  /**
   * 문자열을 Capital Case로 변환
   * @example capitalCase('fooBar') // 'Foo Bar'
   */
  export function capitalCase(input: string): string;

  /**
   * 문자열을 lower case로 변환
   * @example lowerCase('FOO BAR') // 'foo bar'
   */
  export function lowerCase(input: string): string;

  /**
   * 문자열을 UPPER CASE로 변환
   * @example upperCase('foo bar') // 'FOO BAR'
   */
  export function upperCase(input: string): string;

  /**
   * Case 헬퍼 클래스 - 모든 메서드에 접근 가능
   */
  export class Case {
    static camel(input: string): string;
    static pascal(input: string): string;
    static snake(input: string): string;
    static param(input: string): string;
    static constant(input: string): string;
    static dot(input: string): string;
    static path(input: string): string;
    static sentence(input: string): string;
    static capital(input: string): string;
    static lower(input: string): string;
    static upper(input: string): string;
  }
}
