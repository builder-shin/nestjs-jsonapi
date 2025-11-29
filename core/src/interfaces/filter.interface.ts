/**
 * Filter operator and query parsing result type definitions
 *
 * @packageDocumentation
 * @module interfaces
 */

/**
 * Supported filter operators
 *
 * @example
 * - eq: Equals (default) - filter[status]=published
 * - ne: Not equals - filter[status][ne]=draft
 * - like: LIKE search (case-sensitive) - filter[name][like]=John
 * - ilike: LIKE search (case-insensitive) - filter[name][ilike]=john
 * - gt: Greater than - filter[age][gt]=18
 * - gte: Greater than or equal - filter[age][gte]=18
 * - lt: Less than - filter[price][lt]=1000
 * - lte: Less than or equal - filter[price][lte]=1000
 * - in: Included in array - filter[role][in]=admin,user
 * - nin: Not included in array - filter[status][nin]=deleted,archived
 * - null: Is null check - filter[deletedAt][null]=true
 * - between: Range - filter[price][between]=100,500
 */
export type FilterOperator =
  | 'eq' // Equals (default)
  | 'ne' // Not equals
  | 'like' // LIKE search (case-sensitive)
  | 'ilike' // LIKE search (case-insensitive)
  | 'gt' // Greater than
  | 'gte' // Greater than or equal
  | 'lt' // Less than
  | 'lte' // Less than or equal
  | 'in' // Included in array
  | 'nin' // Not included in array
  | 'null' // Is null check (true/false)
  | 'between'; // Range (start,end)

/**
 * Valid filter operators list
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
 * Parsed filter condition
 */
export interface ParsedFilterCondition {
  /**
   * Filter target field (nestable: author.name)
   */
  field: string;

  /**
   * Filter operator
   */
  operator: FilterOperator;

  /**
   * Filter value
   * - in/nin: string[]
   * - between: [min, max]
   * - null: boolean
   * - others: string | number
   */
  value: unknown;
}

/**
 * Parsed query full structure
 */
export interface ParsedQuery {
  /** Filter condition list */
  filter: ParsedFilterCondition[];
  /** Sort condition list */
  sort: { field: string; order: 'asc' | 'desc' }[];
  /** Pagination settings */
  page: { offset: number; limit: number };
  /** Relationships to include */
  include: string[];
  /** Selected fields by type */
  fields: Record<string, string[]>;
}

/**
 * Prisma where clause mapping
 */
export const PRISMA_OPERATOR_MAP: Record<FilterOperator, string> = {
  eq: '', // Direct value assignment
  ne: 'not',
  like: 'contains',
  ilike: 'contains', // + mode: 'insensitive'
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  in: 'in',
  nin: 'notIn',
  null: '', // Special handling
  between: '', // gte + lte combination
};
