/**
 * JSON:API serialization service
 *
 * @packageDocumentation
 * @module services
 *
 * Dependencies: constants/metadata.constants.ts, interfaces/*, utils/naming.util.ts
 */

import { Injectable, Type } from '@nestjs/common';
import 'reflect-metadata';
import {
  JsonApiDocument,
  JsonApiResource,
  JsonApiLinks,
  JsonApiMeta,
} from '../interfaces';
import {
  JSON_API_SERIALIZER_OPTIONS,
  JSON_API_ATTRIBUTES,
  JSON_API_RELATIONSHIPS,
} from '../constants';
import { toKebabCase } from '../utils';
import { AttributeMetadata } from '../decorators/attribute.decorator';
import { RelationshipMetadata } from '../decorators/relationship.decorator';

/**
 * Included resource information
 *
 * Passed with relationship name to support accurate serializer matching.
 */
export interface IncludedResource {
  /** Relationship name (e.g., 'comments', 'author') */
  relationName: string;
  /** Actual data */
  data: any;
}

/**
 * Single resource serialization options
 */
export interface SerializeOptions {
  /** Base URL (for link generation) */
  baseUrl?: string;
  /**
   * Included resource array
   * - IncludedResource[] format for accurate type matching
   * - any[] format for existing behavior (backward compatible)
   */
  included?: IncludedResource[] | any[];
  /** Additional meta information */
  meta?: JsonApiMeta;
  /** Sparse Fieldsets - list of fields to select */
  sparseFields?: string[];
}

/**
 * Collection serialization options
 */
export interface SerializeManyOptions extends SerializeOptions {
  /** Pagination information */
  pagination?: {
    offset: number;
    limit: number;
    total: number;
  };
  /**
   * Query parameters to include when generating links (filters, sorts, includes, etc.)
   * Used to maintain existing query conditions in pagination links
   */
  queryParams?: Record<string, string>;
}

/**
 * JSON:API serialization service
 *
 * Converts entities to JSON:API 1.1 document format.
 *
 * @remarks
 * Main features:
 * - Single resource serialization (serializeOne)
 * - Collection serialization (serializeMany)
 * - Null resource serialization (serializeNull)
 * - Relationship resource included handling (circular reference prevention)
 * - Sparse Fieldsets support
 * - Pagination link generation
 *
 * @example
 * ```typescript
 * // Single resource serialization
 * const document = serializerService.serializeOne(article, ArticleSerializer, {
 *   baseUrl: 'https://api.example.com',
 *   included: [{ relationName: 'author', data: article.author }],
 * });
 *
 * // Collection serialization
 * const document = serializerService.serializeMany(articles, ArticleSerializer, {
 *   baseUrl: 'https://api.example.com',
 *   pagination: { offset: 0, limit: 20, total: 100 },
 * });
 * ```
 */
@Injectable()
export class JsonApiSerializerService {
  /**
   * Serialize single resource
   *
   * Supports null data handling - returns data: null per JSON:API 1.1 spec
   *
   * @template T Resource type
   * @param data Data to serialize (nullable)
   * @param serializerClass Serializer class
   * @param options Serialization options
   * @returns JSON:API document
   */
  serializeOne<T>(
    data: T | null,
    serializerClass: Type<any>,
    options: SerializeOptions = {},
  ): JsonApiDocument<T> {
    // Null data handling - check before calling toResource to prevent crash
    if (data === null) {
      return this.serializeNull(options.meta);
    }

    const resource = this.toResource(data, serializerClass, options.sparseFields);
    const links = this.buildLinks(options.baseUrl, resource.type, resource.id);

    const document: JsonApiDocument<T> = {
      jsonapi: { version: '1.1' },
      data: resource,
      links,
    };

    if (options.included && options.included.length > 0) {
      document.included = this.serializeIncluded(
        options.included,
        serializerClass,
      );
    }

    if (options.meta) {
      document.meta = options.meta;
    }

    return document;
  }

  /**
   * Serialize collection
   *
   * @template T Resource type
   * @param data Data array to serialize
   * @param serializerClass Serializer class
   * @param options Serialization options
   * @returns JSON:API document
   */
  serializeMany<T>(
    data: T[],
    serializerClass: Type<any>,
    options: SerializeManyOptions = {},
  ): JsonApiDocument<T> {
    const resources = data.map((item) =>
      this.toResource(item, serializerClass, options.sparseFields),
    );

    const serializerOptions = Reflect.getMetadata(
      JSON_API_SERIALIZER_OPTIONS,
      serializerClass,
    );
    const type = serializerOptions?.type || 'unknown';
    const links = this.buildCollectionLinks(
      options.baseUrl,
      type,
      options.pagination,
      options.queryParams,
    );

    const document: JsonApiDocument<T> = {
      jsonapi: { version: '1.1' },
      data: resources,
      links,
    };

    if (options.included && options.included.length > 0) {
      document.included = this.serializeIncluded(
        options.included,
        serializerClass,
      );
    }

    if (options.pagination) {
      document.meta = {
        ...options.meta,
        page: {
          offset: options.pagination.offset,
          limit: options.pagination.limit,
          total: options.pagination.total,
        },
      };
    } else if (options.meta) {
      document.meta = options.meta;
    }

    return document;
  }

  /**
   * Serialize null resource (for delete, etc.)
   *
   * @param meta Additional meta information
   * @returns JSON:API document (data: null)
   */
  serializeNull(meta?: JsonApiMeta): JsonApiDocument {
    const document: JsonApiDocument = {
      jsonapi: { version: '1.1' },
      data: null,
    };

    if (meta) {
      document.meta = meta;
    }

    return document;
  }

  /**
   * Serialize included array
   *
   * Tracks already processed resources to prevent circular references.
   *
   * @remarks
   * - IncludedResource[] format uses relationship name for accurate serializer matching
   * - any[] format iterates all relationships for matching (backward compatible)
   *
   * @param included Included resource array
   * @param parentSerializerClass Parent Serializer class
   * @returns JSON:API resource array
   */
  private serializeIncluded(
    included: IncludedResource[] | any[],
    parentSerializerClass: Type<any>,
  ): JsonApiResource[] {
    const relationships: RelationshipMetadata[] =
      Reflect.getMetadata(JSON_API_RELATIONSHIPS, parentSerializerClass) || [];

    // Create relationship name → serializer mapping
    const relationSerializerMap = new Map<string, Type<any>>();
    for (const rel of relationships) {
      const name = rel.name || rel.propertyKey;
      relationSerializerMap.set(name, rel.serializerFactory());
    }

    const result: JsonApiResource[] = [];
    // Set for circular reference prevention (tracked as type:id format)
    const seen = new Set<string>();

    for (const item of included) {
      if (!item) continue;

      // Check if IncludedResource format
      const isIncludedResource =
        item &&
        typeof item === 'object' &&
        'relationName' in item &&
        'data' in item;

      if (isIncludedResource) {
        // Accurate matching: find serializer by relationship name
        const { relationName, data } = item as IncludedResource;
        if (!data || !data.id) continue;

        const serializer = relationSerializerMap.get(relationName);
        if (serializer) {
          const serializerOptions = Reflect.getMetadata(
            JSON_API_SERIALIZER_OPTIONS,
            serializer,
          );
          const key = `${serializerOptions?.type || relationName}:${data.id}`;
          // Circular reference prevention: skip already processed resources
          if (!seen.has(key)) {
            seen.add(key);
            result.push(this.toResource(data, serializer));
          }
        }
      } else {
        // Backward compatible: existing any[] approach
        if (!item.id) continue;

        for (const rel of relationships) {
          const relSerializer = rel.serializerFactory();
          const relOptions = Reflect.getMetadata(
            JSON_API_SERIALIZER_OPTIONS,
            relSerializer,
          );

          if (relOptions?.type) {
            const key = `${relOptions.type}:${item.id}`;
            // Circular reference prevention: skip already processed resources
            if (!seen.has(key)) {
              seen.add(key);
              result.push(this.toResource(item, relSerializer));
              break; // Stop at first match
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Convert entity to JSON:API Resource
   *
   * @template T Resource type
   * @param data Data to convert
   * @param serializerClass Serializer class
   * @param sparseFields Sparse Fieldsets (list of fields to select)
   * @returns JSON:API resource
   */
  private toResource<T>(
    data: T,
    serializerClass: Type<any>,
    sparseFields?: string[],
  ): JsonApiResource<T> {
    const serializerOptions = Reflect.getMetadata(
      JSON_API_SERIALIZER_OPTIONS,
      serializerClass,
    );
    const attributes: AttributeMetadata[] =
      Reflect.getMetadata(JSON_API_ATTRIBUTES, serializerClass) || [];
    const relationships: RelationshipMetadata[] =
      Reflect.getMetadata(JSON_API_RELATIONSHIPS, serializerClass) || [];

    const type = serializerOptions?.type || 'unknown';
    const id = String((data as any).id);

    // Extract attributes
    const attrs: Record<string, unknown> = {};
    for (const attr of attributes) {
      if (attr.exclude) continue;

      const name = attr.name || toKebabCase(attr.propertyKey);

      // Apply sparse fieldsets
      if (
        sparseFields &&
        sparseFields.length > 0 &&
        !sparseFields.includes(name)
      ) {
        continue;
      }

      const value = (data as any)[attr.propertyKey];
      if (value !== undefined) {
        // Convert Date objects to ISO 8601 string
        attrs[name] = value instanceof Date ? value.toISOString() : value;
      }
    }

    // Extract relationships
    const rels: Record<string, any> = {};
    for (const rel of relationships) {
      const name = rel.name || toKebabCase(rel.propertyKey);
      const relData = (data as any)[rel.propertyKey];

      if (relData === undefined) continue;

      const relSerializer = rel.serializerFactory();
      const relSerializerOptions = Reflect.getMetadata(
        JSON_API_SERIALIZER_OPTIONS,
        relSerializer,
      );
      const relType = relSerializerOptions?.type || 'unknown';

      if (Array.isArray(relData)) {
        rels[name] = {
          data: relData.map((item: any) => ({
            type: relType,
            id: String(item.id),
          })),
        };
      } else if (relData) {
        rels[name] = {
          data: {
            type: relType,
            id: String(relData.id),
          },
        };
      } else {
        rels[name] = { data: null };
      }
    }

    const resource: JsonApiResource<T> = {
      type,
      id,
      attributes: attrs as Partial<T>,
    };

    if (Object.keys(rels).length > 0) {
      resource.relationships = rels;
    }

    return resource;
  }

  /**
   * Generate single resource links
   *
   * @param baseUrl Base URL
   * @param type Resource type
   * @param id Resource ID
   * @returns JSON:API links object
   */
  private buildLinks(
    baseUrl: string | undefined,
    type: string,
    id: string,
  ): JsonApiLinks {
    if (!baseUrl) {
      return {};
    }
    return {
      self: `${baseUrl}/${type}/${id}`,
    };
  }

  /**
   * Generate collection links (with pagination and query parameters)
   *
   * @param baseUrl Base URL
   * @param type Resource type
   * @param pagination Pagination information
   * @param queryParams Query parameters
   * @returns JSON:API links object
   */
  private buildCollectionLinks(
    baseUrl: string | undefined,
    type: string,
    pagination?: { offset: number; limit: number; total: number },
    queryParams?: Record<string, string>,
  ): JsonApiLinks {
    if (!baseUrl) {
      return {};
    }

    // Generate query string excluding pagination-related parameters
    const buildQueryString = (
      additionalParams?: Record<string, string>,
    ): string => {
      const params = new URLSearchParams();

      // Add existing query parameters (excluding page-related)
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (!key.startsWith('page[')) {
            params.append(key, value);
          }
        });
      }

      // Add additional parameters (pagination)
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
          params.append(key, value);
        });
      }

      const queryString = params.toString();
      return queryString ? `?${queryString}` : '';
    };

    const baseUrlWithType = `${baseUrl}/${type}`;
    const selfQueryString = buildQueryString(
      pagination
        ? {
            'page[offset]': String(pagination.offset),
            'page[limit]': String(pagination.limit),
          }
        : undefined,
    );

    const links: JsonApiLinks = {
      self: `${baseUrlWithType}${selfQueryString}`,
    };

    if (pagination) {
      const { offset, limit, total } = pagination;
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit);

      links.first = `${baseUrlWithType}${buildQueryString({
        'page[offset]': '0',
        'page[limit]': String(limit),
      })}`;

      links.last = `${baseUrlWithType}${buildQueryString({
        'page[offset]': String(Math.max(0, (totalPages - 1) * limit)),
        'page[limit]': String(limit),
      })}`;

      if (currentPage > 0) {
        links.prev = `${baseUrlWithType}${buildQueryString({
          'page[offset]': String(Math.max(0, offset - limit)),
          'page[limit]': String(limit),
        })}`;
      } else {
        links.prev = null;
      }

      if (offset + limit < total) {
        links.next = `${baseUrlWithType}${buildQueryString({
          'page[offset]': String(offset + limit),
          'page[limit]': String(limit),
        })}`;
      } else {
        links.next = null;
      }
    }

    return links;
  }
}
