/**
 * JSON:API Body 변환/검증 파이프
 *
 * JSON:API 형식의 body에서 attributes와 relationships를 추출하고 DTO로 변환합니다.
 *
 * @packageDocumentation
 * @module pipes
 *
 * 의존성: exceptions/json-api-validation.exception.ts
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JsonApiValidationException } from '../exceptions';

/**
 * JSON:API Body 변환/검증 파이프
 *
 * JSON:API 형식의 요청 body를 처리합니다:
 * 1. `data` 객체 존재 여부 검증
 * 2. `attributes` 추출
 * 3. `relationships`에서 관계 ID 추출
 * 4. 선택적으로 DTO 클래스로 변환 및 검증
 *
 * @example
 * ```typescript
 * // 컨트롤러에서 사용
 * @Post()
 * create(@Body(new JsonApiBodyPipe(CreateArticleDto)) data: CreateArticleDto) {
 *   return this.service.create(data);
 * }
 *
 * // DTO 없이 raw 데이터로 사용
 * @Post()
 * create(@Body(new JsonApiBodyPipe()) data: Record<string, unknown>) {
 *   return this.service.create(data);
 * }
 * ```
 */
@Injectable()
export class JsonApiBodyPipe implements PipeTransform {
  /**
   * @param dtoClass 변환할 DTO 클래스 (선택적)
   */
  constructor(private readonly dtoClass?: new () => any) {}

  /**
   * JSON:API body를 변환
   *
   * @param value 원본 요청 body
   * @param metadata 인자 메타데이터
   * @returns 변환된 데이터 (DTO 인스턴스 또는 raw 객체)
   * @throws BadRequestException - data 객체가 없는 경우
   * @throws JsonApiValidationException - DTO 검증 실패 시
   */
  async transform(value: any, metadata: ArgumentMetadata) {
    // JSON:API body에서 data 추출
    if (!value || !value.data) {
      throw new BadRequestException({
        errors: [
          {
            status: '400',
            title: 'Bad Request',
            detail: 'Request body must contain a "data" object',
            source: { pointer: '/data' },
          },
        ],
      });
    }

    const { data } = value;

    // attributes 추출
    const attributes = data.attributes || {};

    // relationships에서 ID 추출
    const relationships = data.relationships || {};
    const relationData: Record<string, unknown> = {};

    for (const [key, rel] of Object.entries(relationships)) {
      const relValue = rel as any;
      if (relValue?.data) {
        if (Array.isArray(relValue.data)) {
          // To-Many 관계: `${key}Ids` 형식으로 ID 배열 추출
          relationData[`${key}Ids`] = relValue.data.map((r: any) => r.id);
        } else {
          // To-One 관계: `${key}Id` 형식으로 단일 ID 추출
          relationData[`${key}Id`] = relValue.data.id;
        }
      }
    }

    const rawData = { ...attributes, ...relationData };

    // DTO 클래스가 없으면 raw 데이터 반환
    if (!this.dtoClass) {
      return rawData;
    }

    // DTO 인스턴스로 변환
    const dtoInstance = plainToInstance(this.dtoClass, rawData, {
      excludeExtraneousValues: false,
    });

    // class-validator로 검증
    const errors = await validate(dtoInstance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      throw new JsonApiValidationException(errors);
    }

    return dtoInstance;
  }
}
