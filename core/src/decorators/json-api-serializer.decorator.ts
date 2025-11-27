/**
 * JSON:API Serializer 클래스 데코레이터
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
 * Serializer 클래스 옵션
 */
export interface JsonApiSerializerOptions {
  /**
   * JSON:API resource type
   * @example 'articles'
   */
  type: string;
}

/**
 * JSON:API Serializer 클래스 데코레이터
 *
 * Serializer 클래스에 JSON:API 리소스 타입 정보를 등록합니다.
 *
 * @param options - Serializer 옵션
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
