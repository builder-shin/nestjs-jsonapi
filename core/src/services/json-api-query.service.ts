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
  QueryWhitelistOptions,
  QueryValidationResult,
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
   * 화이트리스트가 적용된 쿼리 파싱
   *
   * Request에서 쿼리 파라미터를 파싱하고, 화이트리스트 옵션에 따라
   * 허용되지 않은 필터/정렬/include/fields를 검증합니다.
   *
   * @remarks
   * - whitelist가 undefined면 검증을 건너뛰고 기존 parse 동작을 수행합니다 (하위 호환)
   * - onDisallowed: 'ignore' 모드에서는 허용되지 않은 파라미터를 warnings에 기록하고 제거
   * - onDisallowed: 'error' 모드에서는 허용되지 않은 파라미터를 errors에 기록하고 제거
   *
   * @param request Express Request 객체
   * @param whitelist 화이트리스트 옵션 (선택)
   * @returns 검증된 파싱 결과와 경고/에러 메시지
   *
   * @example
   * ```typescript
   * const whitelist: QueryWhitelistOptions = {
   *   allowedFilters: ['status', 'createdAt'],
   *   allowedSorts: ['createdAt', 'title'],
   *   allowedIncludes: ['author'],
   *   maxIncludeDepth: 2,
   *   onDisallowed: 'error',
   * };
   *
   * const { parsed, warnings, errors } = queryService.parseWithWhitelist(
   *   request,
   *   whitelist
   * );
   *
   * if (errors.length > 0) {
   *   throw new BadRequestException({ errors });
   * }
   * ```
   */
  parseWithWhitelist(
    request: Request,
    whitelist?: QueryWhitelistOptions,
  ): QueryValidationResult {
    const parsed = this.parse(request);

    // 화이트리스트가 없으면 검증 스킵 (하위 호환)
    if (!whitelist) {
      return { parsed, warnings: [], errors: [] };
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    const onDisallowed = whitelist.onDisallowed ?? 'ignore';

    // 필터 검증
    if (whitelist.allowedFilters !== undefined) {
      parsed.filter = this.validateFilters(
        parsed.filter,
        whitelist.allowedFilters,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // 정렬 검증
    if (whitelist.allowedSorts !== undefined) {
      parsed.sort = this.validateSorts(
        parsed.sort,
        whitelist.allowedSorts,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // Include 검증
    if (
      whitelist.allowedIncludes !== undefined ||
      whitelist.maxIncludeDepth !== undefined
    ) {
      parsed.include = this.validateIncludes(
        parsed.include,
        whitelist.allowedIncludes,
        whitelist.maxIncludeDepth,
        onDisallowed,
        warnings,
        errors,
      );
    }

    // Fields 검증
    if (whitelist.allowedFields !== undefined) {
      parsed.fields = this.validateFields(
        parsed.fields,
        whitelist.allowedFields,
        onDisallowed,
        warnings,
        errors,
      );
    }

    return { parsed, warnings, errors };
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
  toPrismaOptions(parsed: ParsedQuery, _model: string): Record<string, unknown> {
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

  // ========================================
  // 화이트리스트 검증 메서드
  // ========================================

  /**
   * 필터 조건 검증
   *
   * 허용된 필드 목록을 기반으로 필터 조건을 검증합니다.
   * 중첩 필드의 경우 부모 필드가 허용되면 자식 필드도 허용됩니다.
   *
   * @param filters 파싱된 필터 조건 배열
   * @param allowed 허용된 필터 필드 목록
   * @param onDisallowed 허용되지 않은 필터 처리 방식
   * @param warnings 경고 메시지를 추가할 배열 (ignore 모드)
   * @param errors 에러 메시지를 추가할 배열 (error 모드)
   * @returns 검증을 통과한 필터 조건 배열
   */
  private validateFilters(
    filters: ParsedFilterCondition[],
    allowed: string[],
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): ParsedFilterCondition[] {
    return filters.filter((condition) => {
      const isAllowed = this.isFieldAllowed(condition.field, allowed);

      if (!isAllowed) {
        const message = `Filter field '${condition.field}' is not allowed`;
        if (onDisallowed === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
        return false;
      }
      return true;
    });
  }

  /**
   * 정렬 조건 검증
   *
   * 허용된 필드 목록을 기반으로 정렬 조건을 검증합니다.
   *
   * @param sorts 파싱된 정렬 조건 배열
   * @param allowed 허용된 정렬 필드 목록
   * @param onDisallowed 허용되지 않은 정렬 처리 방식
   * @param warnings 경고 메시지를 추가할 배열 (ignore 모드)
   * @param errors 에러 메시지를 추가할 배열 (error 모드)
   * @returns 검증을 통과한 정렬 조건 배열
   */
  private validateSorts(
    sorts: { field: string; order: 'asc' | 'desc' }[],
    allowed: string[],
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): { field: string; order: 'asc' | 'desc' }[] {
    return sorts.filter((sort) => {
      const isAllowed = allowed.includes(sort.field);

      if (!isAllowed) {
        const message = `Sort field '${sort.field}' is not allowed`;
        if (onDisallowed === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Include 관계 검증
   *
   * 허용된 관계 목록과 최대 깊이를 기반으로 include를 검증합니다.
   * 부모 관계가 허용되면 자식 관계도 허용됩니다.
   *
   * @param includes 파싱된 include 배열
   * @param allowed 허용된 include 관계 목록 (undefined면 깊이만 검증)
   * @param maxDepth 최대 include 깊이 (undefined면 무제한)
   * @param onDisallowed 허용되지 않은 include 처리 방식
   * @param warnings 경고 메시지를 추가할 배열 (ignore 모드)
   * @param errors 에러 메시지를 추가할 배열 (error 모드)
   * @returns 검증을 통과한 include 배열
   */
  private validateIncludes(
    includes: string[],
    allowed: string[] | undefined,
    maxDepth: number | undefined,
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): string[] {
    return includes.filter((include) => {
      // 깊이 체크
      if (maxDepth !== undefined) {
        const depth = include.split('.').length;
        if (depth > maxDepth) {
          const message = `Include '${include}' exceeds max depth of ${maxDepth}`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
          return false;
        }
      }

      // 허용 목록 체크
      if (allowed !== undefined) {
        const isAllowed = this.isIncludeAllowed(include, allowed);
        if (!isAllowed) {
          const message = `Include '${include}' is not allowed`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sparse fieldsets 검증
   *
   * 타입별로 허용된 필드 목록을 기반으로 fields를 검증합니다.
   * 특정 타입에 대한 설정이 없으면 해당 타입의 모든 필드를 허용합니다.
   *
   * @param fields 파싱된 fields 객체 (타입별 필드 배열)
   * @param allowed 타입별 허용된 필드 목록
   * @param onDisallowed 허용되지 않은 필드 처리 방식
   * @param warnings 경고 메시지를 추가할 배열 (ignore 모드)
   * @param errors 에러 메시지를 추가할 배열 (error 모드)
   * @returns 검증을 통과한 fields 객체
   */
  private validateFields(
    fields: Record<string, string[]>,
    allowed: Record<string, string[]>,
    onDisallowed: 'ignore' | 'error',
    warnings: string[],
    errors: string[],
  ): Record<string, string[]> {
    const validated: Record<string, string[]> = {};

    for (const [type, fieldList] of Object.entries(fields)) {
      const allowedFields = allowed[type];

      if (!allowedFields) {
        // 해당 타입에 대한 설정 없음 → 모두 허용
        validated[type] = fieldList;
        continue;
      }

      validated[type] = fieldList.filter((field) => {
        const isAllowed = allowedFields.includes(field);
        if (!isAllowed) {
          const message = `Field '${field}' for type '${type}' is not allowed`;
          if (onDisallowed === 'error') {
            errors.push(message);
          } else {
            warnings.push(message);
          }
        }
        return isAllowed;
      });
    }

    return validated;
  }

  /**
   * 필드 허용 여부 확인 (중첩 필드 지원)
   *
   * 중첩 필드의 경우 부모 필드가 허용되면 자식 필드도 허용됩니다.
   *
   * @example
   * ```typescript
   * // allowed: ['author', 'author.name', 'status']
   * isFieldAllowed('author.name', allowed)   // true (정확히 일치)
   * isFieldAllowed('author.email', allowed)  // true ('author'가 허용됨)
   * isFieldAllowed('comments.author', allowed) // false
   * ```
   *
   * @param field 확인할 필드명
   * @param allowed 허용된 필드 목록
   * @returns 허용 여부
   */
  private isFieldAllowed(field: string, allowed: string[]): boolean {
    // 정확히 일치
    if (allowed.includes(field)) return true;

    // 중첩 필드: 부모 필드가 허용되면 자식도 허용
    // 예: 'author'가 허용되면 'author.name', 'author.email' 등 모두 허용
    const parts = field.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (allowed.includes(parent)) return true;
    }

    return false;
  }

  /**
   * Include 허용 여부 확인 (중첩 관계 지원)
   *
   * 중첩 관계의 경우 부모 관계가 허용되면 자식 관계도 허용됩니다.
   *
   * @example
   * ```typescript
   * // allowed: ['author', 'comments']
   * isIncludeAllowed('author', allowed)          // true
   * isIncludeAllowed('author.profile', allowed)  // true (author가 허용됨)
   * isIncludeAllowed('tags', allowed)            // false
   * ```
   *
   * @param include 확인할 include 관계
   * @param allowed 허용된 include 관계 목록
   * @returns 허용 여부
   */
  private isIncludeAllowed(include: string, allowed: string[]): boolean {
    // 정확히 일치
    if (allowed.includes(include)) return true;

    // 중첩: 부모가 허용되면 자식도 허용
    const parts = include.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      if (allowed.includes(parent)) return true;
    }

    return false;
  }
}
