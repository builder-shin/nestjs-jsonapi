/**
 * JSON:API 쿼리 파싱 서비스
 *
 * @packageDocumentation
 * @module services
 *
 * 의존성: constants/metadata.constants.ts, interfaces/*, utils/*
 */

import { Injectable, Inject } from '@nestjs/common';
import { Request } from 'express';
import { JSON_API_MODULE_OPTIONS } from '../constants';
import {
  JsonApiModuleOptions,
  ParsedQuery,
  ParsedFilterCondition,
  FilterOperator,
} from '../interfaces';
import {
  toCamelCase,
  isValidOperator,
  isValidFieldName,
  parseFilterValue,
  setNestedValue,
  operatorToPrisma,
} from '../utils';

/**
 * JSON:API 쿼리 파싱 서비스
 *
 * URL 쿼리 파라미터를 파싱하여 Prisma 쿼리 옵션으로 변환합니다.
 *
 * @remarks
 * 지원하는 12개 필터 연산자:
 * - eq: 같음 (기본값)
 * - ne: 같지 않음
 * - like: LIKE 검색 (대소문자 구분)
 * - ilike: LIKE 검색 (대소문자 무시)
 * - gt: 초과
 * - gte: 이상
 * - lt: 미만
 * - lte: 이하
 * - in: 배열 내 포함
 * - nin: 배열 내 미포함
 * - null: null 여부
 * - between: 범위
 *
 * @example
 * ```typescript
 * // URL: /articles?filter[status]=published&filter[views][gte]=100&sort=-createdAt&page[limit]=20
 *
 * const parsed = queryService.parse(request);
 * const prismaOptions = queryService.toPrismaOptions(parsed, 'article');
 *
 * // prismaOptions:
 * // {
 * //   where: { status: 'published', views: { gte: 100 } },
 * //   orderBy: [{ createdAt: 'desc' }],
 * //   skip: 0,
 * //   take: 20
 * // }
 * ```
 */
@Injectable()
export class JsonApiQueryService {
  constructor(
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly options: JsonApiModuleOptions,
  ) {}

  /**
   * Request에서 JSON:API 쿼리 파라미터 파싱
   *
   * @param request Express Request 객체
   * @returns 파싱된 쿼리 구조
   */
  parse(request: Request): ParsedQuery {
    const query = request.query;

    return {
      filter: this.parseFilter(query.filter),
      sort: this.parseSort(query.sort as string),
      page: this.parsePage(query.page),
      include: this.parseInclude(query.include as string),
      fields: this.parseFields(query.fields),
    };
  }

  /**
   * 필터 파라미터 파싱
   *
   * 지원 형식:
   * - 단순 필터: ?filter[field]=value (기본 eq 연산자)
   * - 연산자 필터: ?filter[field][operator]=value
   *
   * @example
   * ?filter[status]=published                    → status eq 'published'
   * ?filter[name][like]=준원                      → name LIKE '%준원%'
   * ?filter[age][gte]=18                         → age >= 18
   * ?filter[role][in]=admin,user                 → role IN ['admin', 'user']
   * ?filter[deletedAt][null]=true                → deletedAt IS NULL
   * ?filter[price][between]=100,500              → price BETWEEN 100 AND 500
   * ?filter[author.name][like]=John              → author.name LIKE '%John%'
   *
   * @param filter 쿼리의 filter 객체
   * @returns 파싱된 필터 조건 배열
   */
  private parseFilter(filter: unknown): ParsedFilterCondition[] {
    const conditions: ParsedFilterCondition[] = [];

    if (!filter || typeof filter !== 'object') {
      return conditions;
    }

    const filterObj = filter as Record<string, unknown>;

    for (const [field, value] of Object.entries(filterObj)) {
      if (value === null || value === undefined) {
        continue;
      }

      // 필드명 유효성 검증 (인젝션 방지)
      if (!isValidFieldName(field)) {
        // 유효하지 않은 필드명은 무시 (보안상 에러 정보 노출 최소화)
        continue;
      }

      // 값이 객체인 경우: filter[field][operator]=value
      if (typeof value === 'object' && !Array.isArray(value)) {
        const operatorObj = value as Record<string, unknown>;

        for (const [op, opValue] of Object.entries(operatorObj)) {
          if (isValidOperator(op)) {
            conditions.push({
              field,
              operator: op as FilterOperator,
              // field를 전달하여 에러 메시지에 포함
              value: parseFilterValue(op as FilterOperator, opValue, field),
            });
          }
        }
      } else {
        // 단순 값인 경우: filter[field]=value (기본 eq 연산자)
        conditions.push({
          field,
          operator: 'eq',
          value,
        });
      }
    }

    return conditions;
  }

  /**
   * 정렬 파라미터 파싱
   *
   * @example ?sort=-createdAt,title (- prefix는 DESC)
   *
   * @param sort 정렬 문자열
   * @returns 정렬 조건 배열
   */
  private parseSort(
    sort: string | undefined,
  ): { field: string; order: 'asc' | 'desc' }[] {
    if (!sort) {
      return [];
    }

    return sort
      .split(',')
      .map((field) => {
        const trimmed = field.trim();
        const isDesc = trimmed.startsWith('-');
        const fieldName = isDesc ? trimmed.substring(1) : trimmed;

        // 필드명 유효성 검증 (인젝션 방지)
        if (!isValidFieldName(fieldName)) {
          return null;
        }

        return {
          field: fieldName,
          order: isDesc ? ('desc' as const) : ('asc' as const),
        };
      })
      .filter(
        (item): item is { field: string; order: 'asc' | 'desc' } =>
          item !== null,
      );
  }

  /**
   * 페이지네이션 파라미터 파싱
   *
   * @example ?page[offset]=0&page[limit]=20
   *
   * @param page 페이지 객체
   * @returns 페이지네이션 설정
   */
  private parsePage(page: unknown): { offset: number; limit: number } {
    const { defaultLimit, maxLimit } = this.options.pagination;

    if (!page || typeof page !== 'object') {
      return { offset: 0, limit: defaultLimit };
    }

    const pageObj = page as Record<string, string>;
    const offset = Math.max(0, parseInt(pageObj.offset, 10) || 0);
    let limit = parseInt(pageObj.limit, 10) || defaultLimit;
    limit = Math.min(Math.max(1, limit), maxLimit);

    return { offset, limit };
  }

  /**
   * Include 파라미터 파싱 (관계 포함)
   *
   * @example ?include=comments,author.profile
   *
   * @param include include 문자열
   * @returns 포함할 관계 배열
   */
  private parseInclude(include: string | undefined): string[] {
    if (!include) {
      return [];
    }
    return include
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Sparse Fieldsets 파싱
   *
   * @example ?fields[articles]=title,content&fields[comments]=body
   *
   * @param fields fields 객체
   * @returns 타입별 선택 필드 맵
   */
  private parseFields(fields: unknown): Record<string, string[]> {
    if (!fields || typeof fields !== 'object') {
      return {};
    }

    const result: Record<string, string[]> = {};
    for (const [type, fieldList] of Object.entries(
      fields as Record<string, string>,
    )) {
      if (typeof fieldList === 'string') {
        result[type] = fieldList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return result;
  }

  /**
   * ParsedQuery를 Prisma findMany 옵션으로 변환
   *
   * @param parsed 파싱된 쿼리 구조
   * @param model Prisma 모델명 (현재 미사용, 향후 확장용)
   * @returns Prisma findMany 옵션
   */
  toPrismaOptions(parsed: ParsedQuery, model: string): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    // Filter → where
    if (parsed.filter.length > 0) {
      options.where = this.filterToPrismaWhere(parsed.filter);
    }

    // Sort → orderBy
    if (parsed.sort.length > 0) {
      options.orderBy = parsed.sort.map(({ field, order }) => ({
        [toCamelCase(field)]: order,
      }));
    }

    // Page → skip, take
    options.skip = parsed.page.offset;
    options.take = parsed.page.limit;

    // Include → include
    if (parsed.include.length > 0) {
      options.include = this.includeToPrismaInclude(parsed.include);
    }

    return options;
  }

  /**
   * 필터 조건들을 Prisma where 절로 변환
   *
   * @param conditions 파싱된 필터 조건 배열
   * @returns Prisma where 객체
   */
  filterToPrismaWhere(
    conditions: ParsedFilterCondition[],
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const prismaCondition = operatorToPrisma(operator, value);

      // 중첩 관계 처리 (예: author.name → { author: { name: condition } })
      if (field.includes('.')) {
        setNestedValue(where, field, prismaCondition, toCamelCase);
      } else {
        const camelField = toCamelCase(field);

        // 같은 필드에 여러 조건이 있을 경우 병합
        if (where[camelField] && typeof where[camelField] === 'object') {
          where[camelField] = {
            ...(where[camelField] as object),
            ...(prismaCondition as object),
          };
        } else {
          where[camelField] = prismaCondition;
        }
      }
    }

    return where;
  }

  /**
   * Include 배열을 Prisma include 객체로 변환
   *
   * @example
   * // 단순 관계
   * ['comments'] → { comments: true }
   *
   * // 중첩 관계
   * ['author.profile'] → { author: { include: { profile: true } } }
   *
   * // 깊은 중첩
   * ['author.profile.avatar'] → { author: { include: { profile: { include: { avatar: true } } } } }
   *
   * // 복합 관계
   * ['comments', 'author.profile'] → { comments: true, author: { include: { profile: true } } }
   *
   * @param includes include 문자열 배열
   * @returns Prisma include 객체
   */
  includeToPrismaInclude(includes: string[]): Record<string, boolean | object> {
    const result: Record<string, boolean | object> = {};

    for (const include of includes) {
      if (include.includes('.')) {
        // 중첩 관계 처리
        const parts = include.split('.');
        this.setNestedInclude(result, parts.map(toCamelCase));
      } else {
        const part = toCamelCase(include);
        // 이미 중첩 객체로 설정되어 있으면 유지
        if (!result[part]) {
          result[part] = true;
        }
      }
    }

    return result;
  }

  /**
   * 중첩된 include 구조를 재귀적으로 생성
   *
   * @param obj 대상 객체
   * @param parts 경로 배열 (예: ['author', 'profile', 'avatar'])
   */
  private setNestedInclude(
    obj: Record<string, boolean | object>,
    parts: string[],
  ): void {
    const [current, ...rest] = parts;

    if (rest.length === 0) {
      // 마지막 부분: 이미 객체면 유지, 아니면 true로 설정
      if (!obj[current] || obj[current] === true) {
        obj[current] = true;
      }
      return;
    }

    // 중간 부분: include 구조 생성
    if (!obj[current] || obj[current] === true) {
      obj[current] = { include: {} };
    }

    // 재귀 호출로 다음 레벨 처리
    const nested = obj[current] as { include: Record<string, boolean | object> };
    this.setNestedInclude(nested.include, rest);
  }
}
