/**
 * JSON:API Relationship Property Decorator
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
 * Relationship decorator options
 */
export interface RelationshipOptions {
  /**
   * Relationship name to use in JSON:API response
   * If not specified, property name is converted to kebab-case
   */
  name?: string;

  /**
   * Relationship type (hasOne | hasMany)
   * If not specified, automatically determined by type inference
   */
  type?: 'hasOne' | 'hasMany';
}

/**
 * Relationship metadata (for internal storage)
 */
export interface RelationshipMetadata extends RelationshipOptions {
  /** Original property key */
  propertyKey: string;
  /** Factory function that returns the related Serializer */
  serializerFactory: () => Type<any>;
}

/**
 * JSON:API Relationship Decorator
 *
 * Defines a relationship between resources.
 * Included in the JSON:API relationships object during serialization.
 *
 * @param serializerFactory - Factory function that returns the related Serializer
 * @param options - Relationship options
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * // To-One relationship
 * @Relationship(() => UserSerializer)
 * author: UserSerializer;
 *
 * // To-Many relationship
 * @Relationship(() => CommentSerializer)
 * comments: CommentSerializer[];
 *
 * // Custom relationship name specification
 * @Relationship(() => UserSerializer, { name: 'created-by' })
 * user: UserSerializer;
 *
 * // Explicit relationship type specification
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
