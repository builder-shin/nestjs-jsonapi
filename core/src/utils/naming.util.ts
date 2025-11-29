/**
 * String Conversion Utility Functions
 *
 * @packageDocumentation
 * @module utils
 *
 * @dependencies
 * - change-case-all: camelCase, kebabCase conversion (CJS/ESM compatible)
 * - pluralize: singular/plural conversion
 */

import { camelCase, paramCase } from 'change-case-all';
import pluralizeLib from 'pluralize';

/**
 * Convert camelCase to kebab-case
 *
 * @param str - String to convert
 * @returns kebab-case string
 *
 * @example
 * ```typescript
 * toKebabCase('createdAt'); // 'created-at'
 * toKebabCase('userProfile'); // 'user-profile'
 * ```
 */
export function toKebabCase(str: string): string {
  return paramCase(str);
}

/**
 * Convert kebab-case or snake_case to camelCase
 *
 * @param str - String to convert
 * @returns camelCase string
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
 * Convert word to plural form
 *
 * @param word - Word to convert
 * @returns Plural word
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
 * Convert word to singular form
 *
 * @param word - Word to convert
 * @returns Singular word
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
