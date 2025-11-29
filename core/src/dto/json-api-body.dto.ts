/**
 * JSON:API Body DTO
 *
 * Type definitions and validation for JSON:API request body
 *
 * @packageDocumentation
 * @module dto
 *
 * Dependencies: none
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
 * Minimum information required to identify a resource (type + id)
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
 * DTO representing relationship data
 * Supports To-One, To-Many, or null relationships.
 *
 * @example
 * ```typescript
 * // To-One relationship
 * const toOne: RelationshipDataDto = {
 *   data: { type: 'users', id: '1' }
 * };
 *
 * // To-Many relationship
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
 * Body structure for individual resources
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
  /** Resource type (plural kebab-case) */
  @IsString()
  type!: string;

  /** Resource ID (required for update, optional for create) */
  @IsString()
  @IsOptional()
  id?: string;

  /** Resource attributes */
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;

  /** Relationship information */
  @IsObject()
  @IsOptional()
  relationships?: Record<string, RelationshipDataDto>;
}

/**
 * JSON:API Create/Update Request Body
 *
 * Request body for single resource creation/modification
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
 * Request body for multiple resource creation
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
 * Request body for condition-based bulk update/delete
 *
 * @example
 * ```typescript
 * // Bulk update
 * const bulkUpdate: JsonApiBulkOperationDto = {
 *   filter: { status: 'draft' },
 *   attributes: { status: 'published' }
 * };
 *
 * // Bulk delete
 * const bulkDelete: JsonApiBulkOperationDto = {
 *   filter: { createdAt: { lt: '2024-01-01' } }
 * };
 * ```
 */
export class JsonApiBulkOperationDto {
  /** Target resource filter conditions */
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  /** Attributes to update (for update operations) */
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;
}
