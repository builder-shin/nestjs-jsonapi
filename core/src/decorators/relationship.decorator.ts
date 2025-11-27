/**
 * JSON:API Relationship 프로퍼티 데코레이터
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - reflect-metadata
 * - @nestjs/common: Type
 * - ../constants: JSON_API_RELATIONSHIPS
 */

import 'reflect-metadata';
import { Type } from '@nestjs/common';
import { JSON_API_RELATIONSHIPS } from '../constants';

/**
 * Relationship 데코레이터 옵션
 */
export interface RelationshipOptions {
  /**
   * JSON:API 응답에서 사용할 관계명
   * 미지정시 프로퍼티명을 kebab-case로 변환
   */
  name?: string;

  /**
   * 관계 타입 (hasOne | hasMany)
   * 미지정시 타입 추론으로 자동 결정
   */
  type?: 'hasOne' | 'hasMany';
}

/**
 * Relationship 메타데이터 (내부 저장용)
 */
export interface RelationshipMetadata extends RelationshipOptions {
  /** 원본 프로퍼티 키 */
  propertyKey: string;
  /** 관련 Serializer를 반환하는 팩토리 함수 */
  serializerFactory: () => Type<any>;
}

/**
 * JSON:API Relationship 데코레이터
 *
 * 리소스 간의 관계(relationship)를 정의합니다.
 * 직렬화 시 JSON:API relationships 객체에 포함됩니다.
 *
 * @param serializerFactory - 관계된 Serializer를 반환하는 팩토리 함수
 * @param options - 관계 옵션
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * // To-One 관계
 * @Relationship(() => UserSerializer)
 * author: UserSerializer;
 *
 * // To-Many 관계
 * @Relationship(() => CommentSerializer)
 * comments: CommentSerializer[];
 *
 * // 커스텀 관계명 지정
 * @Relationship(() => UserSerializer, { name: 'created-by' })
 * user: UserSerializer;
 *
 * // 명시적 관계 타입 지정
 * @Relationship(() => TagSerializer, { type: 'hasMany' })
 * tags: TagSerializer[];
 * ```
 */
export function Relationship(
  serializerFactory: () => Type<any>,
  options: RelationshipOptions = {},
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    const constructor = target.constructor;
    const existingRelationships: RelationshipMetadata[] =
      Reflect.getMetadata(JSON_API_RELATIONSHIPS, constructor) || [];

    existingRelationships.push({
      propertyKey: String(propertyKey),
      serializerFactory,
      ...options,
    });

    Reflect.defineMetadata(
      JSON_API_RELATIONSHIPS,
      existingRelationships,
      constructor,
    );
  };
}
