/**
 * 필터 연산자 및 쿼리 파싱 결과 타입 정의
 *
 * @packageDocumentation
 * @module interfaces
 */

/**
 * 지원하는 필터 연산자
 *
 * @example
 * - eq: 같음 (기본값) - filter[status]=published
 * - ne: 같지 않음 - filter[status][ne]=draft
 * - like: LIKE 검색 (대소문자 구분) - filter[name][like]=준원
 * - ilike: LIKE 검색 (대소문자 무시) - filter[name][ilike]=john
 * - gt: 초과 - filter[age][gt]=18
 * - gte: 이상 - filter[age][gte]=18
 * - lt: 미만 - filter[price][lt]=1000
 * - lte: 이하 - filter[price][lte]=1000
 * - in: 배열 내 포함 - filter[role][in]=admin,user
 * - nin: 배열 내 미포함 - filter[status][nin]=deleted,archived
 * - null: null 여부 - filter[deletedAt][null]=true
 * - between: 범위 - filter[price][between]=100,500
 */
export type FilterOperator =
  | 'eq' // 같음 (기본값)
  | 'ne' // 같지 않음
  | 'like' // LIKE 검색 (대소문자 구분)
  | 'ilike' // LIKE 검색 (대소문자 무시)
  | 'gt' // 초과
  | 'gte' // 이상
  | 'lt' // 미만
  | 'lte' // 이하
  | 'in' // 배열 내 포함
  | 'nin' // 배열 내 미포함
  | 'null' // null 여부 (true/false)
  | 'between'; // 범위 (시작,끝)

/**
 * 유효한 필터 연산자 목록
 */
export const VALID_FILTER_OPERATORS: FilterOperator[] = [
  'eq',
  'ne',
  'like',
  'ilike',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'null',
  'between',
];

/**
 * 파싱된 필터 조건
 */
export interface ParsedFilterCondition {
  /**
   * 필터 대상 필드 (중첩 가능: author.name)
   */
  field: string;

  /**
   * 필터 연산자
   */
  operator: FilterOperator;

  /**
   * 필터 값
   * - in/nin: string[]
   * - between: [min, max]
   * - null: boolean
   * - 기타: string | number
   */
  value: unknown;
}

/**
 * 파싱된 쿼리 전체 구조
 */
export interface ParsedQuery {
  /** 필터 조건 목록 */
  filter: ParsedFilterCondition[];
  /** 정렬 조건 목록 */
  sort: { field: string; order: 'asc' | 'desc' }[];
  /** 페이지네이션 설정 */
  page: { offset: number; limit: number };
  /** 포함할 관계 목록 */
  include: string[];
  /** 타입별 선택 필드 */
  fields: Record<string, string[]>;
}

/**
 * Prisma where 절 매핑
 */
export const PRISMA_OPERATOR_MAP: Record<FilterOperator, string> = {
  eq: '', // 직접 값 할당
  ne: 'not',
  like: 'contains',
  ilike: 'contains', // + mode: 'insensitive'
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  in: 'in',
  nin: 'notIn',
  null: '', // 특수 처리
  between: '', // gte + lte 조합
};
