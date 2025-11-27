/**
 * JSON:API 직렬화 서비스
 *
 * @packageDocumentation
 * @module services
 *
 * 의존성: constants/metadata.constants.ts, interfaces/*, utils/naming.util.ts
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
 * Included 리소스 정보
 *
 * 관계명과 함께 전달하여 정확한 serializer 매칭을 지원합니다.
 */
export interface IncludedResource {
  /** 관계명 (예: 'comments', 'author') */
  relationName: string;
  /** 실제 데이터 */
  data: any;
}

/**
 * 단일 리소스 직렬화 옵션
 */
export interface SerializeOptions {
  /** 기본 URL (링크 생성용) */
  baseUrl?: string;
  /**
   * Included 리소스 배열
   * - IncludedResource[] 형태로 전달하면 정확한 타입 매칭
   * - any[] 형태로 전달하면 기존 방식으로 동작 (하위 호환)
   */
  included?: IncludedResource[] | any[];
  /** 추가 메타 정보 */
  meta?: JsonApiMeta;
  /** Sparse Fieldsets - 선택할 필드 목록 */
  sparseFields?: string[];
}

/**
 * 컬렉션 직렬화 옵션
 */
export interface SerializeManyOptions extends SerializeOptions {
  /** 페이지네이션 정보 */
  pagination?: {
    offset: number;
    limit: number;
    total: number;
  };
  /**
   * 링크 생성 시 포함할 쿼리 파라미터 (필터, 정렬, include 등)
   * 페이지네이션 링크에 기존 쿼리 조건을 유지하기 위해 사용
   */
  queryParams?: Record<string, string>;
}

/**
 * JSON:API 직렬화 서비스
 *
 * 엔티티를 JSON:API 1.1 문서 형식으로 변환합니다.
 *
 * @remarks
 * 주요 기능:
 * - 단일 리소스 직렬화 (serializeOne)
 * - 컬렉션 직렬화 (serializeMany)
 * - null 리소스 직렬화 (serializeNull)
 * - 관계 리소스 included 처리 (순환 참조 방지)
 * - Sparse Fieldsets 지원
 * - 페이지네이션 링크 생성
 *
 * @example
 * ```typescript
 * // 단일 리소스 직렬화
 * const document = serializerService.serializeOne(article, ArticleSerializer, {
 *   baseUrl: 'https://api.example.com',
 *   included: [{ relationName: 'author', data: article.author }],
 * });
 *
 * // 컬렉션 직렬화
 * const document = serializerService.serializeMany(articles, ArticleSerializer, {
 *   baseUrl: 'https://api.example.com',
 *   pagination: { offset: 0, limit: 20, total: 100 },
 * });
 * ```
 */
@Injectable()
export class JsonApiSerializerService {
  /**
   * 단일 리소스 직렬화
   *
   * null 데이터 처리 지원 - JSON:API 1.1 명세에 따라 data: null 반환
   *
   * @template T 리소스 타입
   * @param data 직렬화할 데이터 (null 가능)
   * @param serializerClass Serializer 클래스
   * @param options 직렬화 옵션
   * @returns JSON:API 문서
   */
  serializeOne<T>(
    data: T | null,
    serializerClass: Type<any>,
    options: SerializeOptions = {},
  ): JsonApiDocument<T> {
    // null 데이터 처리 - toResource 호출 전에 체크하여 크래시 방지
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
   * 컬렉션 직렬화
   *
   * @template T 리소스 타입
   * @param data 직렬화할 데이터 배열
   * @param serializerClass Serializer 클래스
   * @param options 직렬화 옵션
   * @returns JSON:API 문서
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
   * null 리소스 직렬화 (삭제 등)
   *
   * @param meta 추가 메타 정보
   * @returns JSON:API 문서 (data: null)
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
   * included 배열 직렬화
   *
   * 순환 참조 방지를 위해 이미 처리된 리소스를 추적합니다.
   *
   * @remarks
   * - IncludedResource[] 형태면 관계명으로 정확한 serializer 매칭
   * - any[] 형태면 모든 relationship을 순회하여 매칭 (하위 호환)
   *
   * @param included included 리소스 배열
   * @param parentSerializerClass 부모 Serializer 클래스
   * @returns JSON:API 리소스 배열
   */
  private serializeIncluded(
    included: IncludedResource[] | any[],
    parentSerializerClass: Type<any>,
  ): JsonApiResource[] {
    const relationships: RelationshipMetadata[] =
      Reflect.getMetadata(JSON_API_RELATIONSHIPS, parentSerializerClass) || [];

    // 관계명 → serializer 매핑 생성
    const relationSerializerMap = new Map<string, Type<any>>();
    for (const rel of relationships) {
      const name = rel.name || rel.propertyKey;
      relationSerializerMap.set(name, rel.serializerFactory());
    }

    const result: JsonApiResource[] = [];
    // 순환 참조 방지를 위한 Set (type:id 형식으로 추적)
    const seen = new Set<string>();

    for (const item of included) {
      if (!item) continue;

      // IncludedResource 형태인지 확인
      const isIncludedResource =
        item &&
        typeof item === 'object' &&
        'relationName' in item &&
        'data' in item;

      if (isIncludedResource) {
        // 정확한 매칭: 관계명으로 serializer 찾기
        const { relationName, data } = item as IncludedResource;
        if (!data || !data.id) continue;

        const serializer = relationSerializerMap.get(relationName);
        if (serializer) {
          const serializerOptions = Reflect.getMetadata(
            JSON_API_SERIALIZER_OPTIONS,
            serializer,
          );
          const key = `${serializerOptions?.type || relationName}:${data.id}`;
          // 순환 참조 방지: 이미 처리된 리소스는 건너뜀
          if (!seen.has(key)) {
            seen.add(key);
            result.push(this.toResource(data, serializer));
          }
        }
      } else {
        // 하위 호환: 기존 any[] 방식
        if (!item.id) continue;

        for (const rel of relationships) {
          const relSerializer = rel.serializerFactory();
          const relOptions = Reflect.getMetadata(
            JSON_API_SERIALIZER_OPTIONS,
            relSerializer,
          );

          if (relOptions?.type) {
            const key = `${relOptions.type}:${item.id}`;
            // 순환 참조 방지: 이미 처리된 리소스는 건너뜀
            if (!seen.has(key)) {
              seen.add(key);
              result.push(this.toResource(item, relSerializer));
              break; // 첫 번째 매칭에서 중단
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * 엔티티를 JSON:API Resource로 변환
   *
   * @template T 리소스 타입
   * @param data 변환할 데이터
   * @param serializerClass Serializer 클래스
   * @param sparseFields Sparse Fieldsets (선택할 필드 목록)
   * @returns JSON:API 리소스
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

    // Attributes 추출
    const attrs: Record<string, unknown> = {};
    for (const attr of attributes) {
      if (attr.exclude) continue;

      const name = attr.name || toKebabCase(attr.propertyKey);

      // Sparse fieldsets 적용
      if (
        sparseFields &&
        sparseFields.length > 0 &&
        !sparseFields.includes(name)
      ) {
        continue;
      }

      const value = (data as any)[attr.propertyKey];
      if (value !== undefined) {
        // Date 객체는 ISO 8601 문자열로 변환
        attrs[name] = value instanceof Date ? value.toISOString() : value;
      }
    }

    // Relationships 추출
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
   * 단일 리소스 링크 생성
   *
   * @param baseUrl 기본 URL
   * @param type 리소스 타입
   * @param id 리소스 ID
   * @returns JSON:API 링크 객체
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
   * 컬렉션 링크 생성 (페이지네이션 및 쿼리 파라미터 포함)
   *
   * @param baseUrl 기본 URL
   * @param type 리소스 타입
   * @param pagination 페이지네이션 정보
   * @param queryParams 쿼리 파라미터
   * @returns JSON:API 링크 객체
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

    // 페이지네이션 관련 파라미터를 제외한 쿼리 스트링 생성
    const buildQueryString = (
      additionalParams?: Record<string, string>,
    ): string => {
      const params = new URLSearchParams();

      // 기존 쿼리 파라미터 추가 (page 관련 제외)
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (!key.startsWith('page[')) {
            params.append(key, value);
          }
        });
      }

      // 추가 파라미터 (페이지네이션) 추가
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
