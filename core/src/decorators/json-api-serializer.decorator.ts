/**
 * JSON:API Serializer Class Decorator
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - @nestjs/common: SetMetadata
 * - ../constants: JSON_API_SERIALIZER_OPTIONS
 */

import { SetMetadata } from '@nestjs/common';
import { JSON_API_SERIALIZER_OPTIONS } from '../constants';

/**
 * Serializer class options
 */
export interface JsonApiSerializerOptions {
  /**
   * JSON:API resource type
   * @example 'articles'
   */
  type: string;
}

/**
 * JSON:API Serializer Class Decorator
 *
 * Registers JSON:API resource type information on a Serializer class.
 *
 * @param options - Serializer options
 * @returns ClassDecorator
 *
 * @example
 * ```typescript
 * @JsonApiSerializer({ type: 'articles' })
 * export class ArticleSerializer {
 *   @Attribute()
 *   title: string;
 *
 *   @Attribute({ name: 'created-at' })
 *   createdAt: Date;
 *
 *   @Relationship(() => UserSerializer)
 *   author: UserSerializer;
 * }
 * ```
 */
export function JsonApiSerializer(
  options: JsonApiSerializerOptions,
): ClassDecorator {
  return SetMetadata(JSON_API_SERIALIZER_OPTIONS, options);
}
