/**
 * JSON:API Body Transform/Validation Pipe
 *
 * Extracts attributes and relationships from JSON:API format body and transforms to DTO.
 *
 * @packageDocumentation
 * @module pipes
 *
 * Dependencies: exceptions/json-api-validation.exception.ts
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
 * JSON:API Body Transform/Validation Pipe
 *
 * Processes JSON:API format request body:
 * 1. Validates `data` object existence
 * 2. Extracts `attributes`
 * 3. Extracts relation IDs from `relationships`
 * 4. Optionally transforms to DTO class and validates
 *
 * @example
 * ```typescript
 * // Use in controller
 * @Post()
 * create(@Body(new JsonApiBodyPipe(CreateArticleDto)) data: CreateArticleDto) {
 *   return this.service.create(data);
 * }
 *
 * // Use with raw data without DTO
 * @Post()
 * create(@Body(new JsonApiBodyPipe()) data: Record<string, unknown>) {
 *   return this.service.create(data);
 * }
 * ```
 */
@Injectable()
export class JsonApiBodyPipe implements PipeTransform {
  /**
   * @param dtoClass DTO class to transform to (optional)
   */
  constructor(private readonly dtoClass?: new () => any) {}

  /**
   * Transform JSON:API body
   *
   * @param value Original request body
   * @param metadata Argument metadata
   * @returns Transformed data (DTO instance or raw object)
   * @throws BadRequestException - if data object is missing
   * @throws JsonApiValidationException - if DTO validation fails
   */
  async transform(value: any, _metadata: ArgumentMetadata) {
    // Extract data from JSON:API body
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

    // Extract attributes
    const attributes = data.attributes || {};

    // Extract IDs from relationships
    const relationships = data.relationships || {};
    const relationData: Record<string, unknown> = {};

    for (const [key, rel] of Object.entries(relationships)) {
      const relValue = rel as any;
      if (relValue?.data) {
        if (Array.isArray(relValue.data)) {
          // To-Many relationship: extract ID array as `${key}Ids` format
          relationData[`${key}Ids`] = relValue.data.map((r: any) => r.id);
        } else {
          // To-One relationship: extract single ID as `${key}Id` format
          relationData[`${key}Id`] = relValue.data.id;
        }
      }
    }

    const rawData = { ...attributes, ...relationData };

    // Return raw data if no DTO class
    if (!this.dtoClass) {
      return rawData;
    }

    // Transform to DTO instance
    const dtoInstance = plainToInstance(this.dtoClass, rawData, {
      excludeExtraneousValues: false,
    });

    // Validate with class-validator
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
