/**
 * JSON:API Attribute Property Decorator
 *
 * @packageDocumentation
 * @module decorators
 *
 * @dependencies
 * - reflect-metadata
 * - ../constants: JSON_API_ATTRIBUTES
 */

import 'reflect-metadata';
import { JSON_API_ATTRIBUTES } from '../constants';

/**
 * Attribute decorator options
 */
export interface AttributeOptions {
  /**
   * Attribute name to use in JSON:API response
   * If not specified, property name is converted to kebab-case
   */
  name?: string;

  /**
   * Whether to exclude this attribute during serialization
   * @default false
   */
  exclude?: boolean;
}

/**
 * Attribute metadata (for internal storage)
 */
export interface AttributeMetadata extends AttributeOptions {
  /** Original property key */
  propertyKey: string;
}

/**
 * JSON:API Attribute Decorator
 *
 * Defines a resource attribute.
 * Included in the JSON:API attributes object during serialization.
 *
 * @param options - Attribute options
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * // Basic usage (property name -> automatic kebab-case conversion)
 * @Attribute()
 * title: string;
 *
 * // Custom attribute name specification
 * @Attribute({ name: 'is-published' })
 * isPublished: boolean;
 *
 * // Exclude from serialization
 * @Attribute({ exclude: true })
 * password: string;
 * ```
 */
export function Attribute(options: AttributeOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    const constructor = target.constructor;
    const existingAttributes: AttributeMetadata[] =
      Reflect.getMetadata(JSON_API_ATTRIBUTES, constructor) || [];

    existingAttributes.push({
      propertyKey: String(propertyKey),
      ...options,
    });

    Reflect.defineMetadata(JSON_API_ATTRIBUTES, existingAttributes, constructor);
  };
}
