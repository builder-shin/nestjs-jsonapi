/**
 * JSON:API Body DTO
 *
 * JSON:API 요청 body의 타입 정의 및 검증
 *
 * @packageDocumentation
 * @module dto
 *
 * 의존성: 없음
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';

/**
 * JSON:API Resource Identifier
 *
 * 리소스를 식별하기 위한 최소 정보 (type + id)
 *
 * @example
 * ```typescript
 * const identifier: ResourceIdentifierDto = {
 *   type: 'users',
 *   id: '1'
 * };
 * ```
 */
export class ResourceIdentifierDto {
  @IsString()
  type!: string;

  @IsString()
  id!: string;
}

/**
 * JSON:API Relationship Data
 *
 * 관계 데이터를 나타내는 DTO
 * To-One, To-Many, 또는 null 관계를 지원합니다.
 *
 * @example
 * ```typescript
 * // To-One 관계
 * const toOne: RelationshipDataDto = {
 *   data: { type: 'users', id: '1' }
 * };
 *
 * // To-Many 관계
 * const toMany: RelationshipDataDto = {
 *   data: [
 *     { type: 'tags', id: '1' },
 *     { type: 'tags', id: '2' }
 *   ]
 * };
 * ```
 */
export class RelationshipDataDto {
  @ValidateNested()
  @Type(() => ResourceIdentifierDto)
  @IsOptional()
  data?: ResourceIdentifierDto | ResourceIdentifierDto[] | null;
}

/**
 * JSON:API Single Resource Body
 *
 * 개별 리소스의 body 구조
 *
 * @example
 * ```typescript
 * const resource: JsonApiResourceDto = {
 *   type: 'articles',
 *   attributes: { title: 'Hello World' },
 *   relationships: {
 *     author: { data: { type: 'users', id: '1' } }
 *   }
 * };
 * ```
 */
export class JsonApiResourceDto {
  /** 리소스 타입 (plural kebab-case) */
  @IsString()
  type!: string;

  /** 리소스 ID (업데이트 시 필수, 생성 시 선택) */
  @IsString()
  @IsOptional()
  id?: string;

  /** 리소스 속성 */
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  /** 관계 정보 */
  @IsObject()
  @IsOptional()
  relationships?: Record<string, RelationshipDataDto>;
}

/**
 * JSON:API Create/Update Request Body
 *
 * 단일 리소스 생성/수정 요청 body
 *
 * @example
 * ```typescript
 * const body: JsonApiBodyDto = {
 *   data: {
 *     type: 'articles',
 *     attributes: { title: 'New Article' }
 *   }
 * };
 * ```
 */
export class JsonApiBodyDto {
  @ValidateNested()
  @Type(() => JsonApiResourceDto)
  data!: JsonApiResourceDto;
}

/**
 * JSON:API Bulk Request Body
 *
 * 복수 리소스 생성 요청 body
 *
 * @example
 * ```typescript
 * const bulkBody: JsonApiBulkBodyDto = {
 *   data: [
 *     { type: 'articles', attributes: { title: 'Article 1' } },
 *     { type: 'articles', attributes: { title: 'Article 2' } }
 *   ]
 * };
 * ```
 */
export class JsonApiBulkBodyDto {
  @ValidateNested({ each: true })
  @Type(() => JsonApiResourceDto)
  @IsArray()
  data!: JsonApiResourceDto[];
}

/**
 * JSON:API Bulk Update/Delete Request Body
 *
 * 조건 기반 대량 수정/삭제 요청 body
 *
 * @example
 * ```typescript
 * // 대량 업데이트
 * const bulkUpdate: JsonApiBulkOperationDto = {
 *   filter: { status: 'draft' },
 *   attributes: { status: 'published' }
 * };
 *
 * // 대량 삭제
 * const bulkDelete: JsonApiBulkOperationDto = {
 *   filter: { createdAt: { lt: '2024-01-01' } }
 * };
 * ```
 */
export class JsonApiBulkOperationDto {
  /** 대상 리소스 필터 조건 */
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  /** 업데이트할 속성 (수정 작업 시) */
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;
}
