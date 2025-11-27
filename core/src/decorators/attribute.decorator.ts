/**
 * JSON:API Attribute 프로퍼티 데코레이터
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
 * Attribute 데코레이터 옵션
 */
export interface AttributeOptions {
  /**
   * JSON:API 응답에서 사용할 속성명
   * 미지정시 프로퍼티명을 kebab-case로 변환
   */
  name?: string;

  /**
   * 직렬화 시 해당 속성 제외 여부
   * @default false
   */
  exclude?: boolean;
}

/**
 * Attribute 메타데이터 (내부 저장용)
 */
export interface AttributeMetadata extends AttributeOptions {
  /** 원본 프로퍼티 키 */
  propertyKey: string;
}

/**
 * JSON:API Attribute 데코레이터
 *
 * 리소스의 속성(attribute)을 정의합니다.
 * 직렬화 시 JSON:API attributes 객체에 포함됩니다.
 *
 * @param options - 속성 옵션
 * @returns PropertyDecorator
 *
 * @example
 * ```typescript
 * // 기본 사용 (프로퍼티명 → kebab-case 자동 변환)
 * @Attribute()
 * title: string;
 *
 * // 커스텀 속성명 지정
 * @Attribute({ name: 'is-published' })
 * isPublished: boolean;
 *
 * // 직렬화에서 제외
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
