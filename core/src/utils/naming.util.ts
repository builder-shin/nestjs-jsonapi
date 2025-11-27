/**
 * 문자열 변환 유틸리티 함수
 *
 * @packageDocumentation
 * @module utils
 *
 * @dependencies
 * - change-case: camelCase, kebabCase 변환
 * - pluralize: 단수/복수 변환
 */

import { camelCase, kebabCase } from 'change-case';
import pluralizeLib from 'pluralize';

/**
 * camelCase를 kebab-case로 변환
 *
 * @param str - 변환할 문자열
 * @returns kebab-case 문자열
 *
 * @example
 * ```typescript
 * toKebabCase('createdAt'); // 'created-at'
 * toKebabCase('userProfile'); // 'user-profile'
 * ```
 */
export function toKebabCase(str: string): string {
  return kebabCase(str);
}

/**
 * kebab-case 또는 snake_case를 camelCase로 변환
 *
 * @param str - 변환할 문자열
 * @returns camelCase 문자열
 *
 * @example
 * ```typescript
 * toCamelCase('created-at'); // 'createdAt'
 * toCamelCase('created_at'); // 'createdAt'
 * toCamelCase('user_profile'); // 'userProfile'
 * ```
 */
export function toCamelCase(str: string): string {
  return camelCase(str);
}

/**
 * 단어를 복수형으로 변환
 *
 * @param word - 변환할 단어
 * @returns 복수형 단어
 *
 * @example
 * ```typescript
 * pluralize('article'); // 'articles'
 * pluralize('category'); // 'categories'
 * pluralize('person'); // 'people'
 * pluralize('child'); // 'children'
 * ```
 */
export function pluralize(word: string): string {
  return pluralizeLib.plural(word);
}

/**
 * 단어를 단수형으로 변환
 *
 * @param word - 변환할 단어
 * @returns 단수형 단어
 *
 * @example
 * ```typescript
 * singularize('articles'); // 'article'
 * singularize('categories'); // 'category'
 * singularize('people'); // 'person'
 * singularize('children'); // 'child'
 * ```
 */
export function singularize(word: string): string {
  return pluralizeLib.singular(word);
}
