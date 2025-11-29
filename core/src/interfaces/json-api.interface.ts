/**
 * Type definitions conforming to JSON:API 1.1 specification
 *
 * @packageDocumentation
 * @module interfaces
 * @see https://jsonapi.org/format/1.1/
 */

/**
 * JSON:API 1.1 Document structure
 *
 * Defines the top-level document structure for all JSON:API responses.
 *
 * @template T - Resource attributes type
 *
 * @example
 * ```typescript
 * const document: JsonApiDocument<Article> = {
 *   jsonapi: { version: '1.1' },
 *   data: { type: 'articles', id: '1', attributes: { title: 'Hello' } },
 *   meta: { total: 100 }
 * };
 * ```
 */
export interface JsonApiDocument<T = unknown> {
  /** JSON:API version information */
  jsonapi: {
    version: '1.1';
  };
  /** Response data (single, array, or null) */
  data: JsonApiResource<T> | JsonApiResource<T>[] | null;
  /** Included related resources */
  included?: JsonApiResource[];
  /** Meta information */
  meta?: JsonApiMeta;
  /** Links information */
  links?: JsonApiLinks;
}

/**
 * JSON:API Resource Object
 *
 * Object representing an individual resource.
 *
 * @template T - Attributes type
 *
 * @example
 * ```typescript
 * const resource: JsonApiResource<Article> = {
 *   type: 'articles',
 *   id: '1',
 *   attributes: { title: 'Hello World', content: '...' },
 *   relationships: {
 *     author: { data: { type: 'users', id: '5' } }
 *   }
 * };
 * ```
 */
export interface JsonApiResource<T = unknown> {
  /** Resource type (plural kebab-case) */
  type: string;
  /** Resource unique identifier */
  id: string;
  /** Resource attributes */
  attributes?: Partial<T>;
  /** Relationship information */
  relationships?: Record<string, JsonApiRelationship>;
  /** Links information */
  links?: JsonApiLinks;
  /** Meta information */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Relationship
 *
 * Object representing relationships between resources.
 *
 * @example
 * ```typescript
 * // To-One relationship
 * const author: JsonApiRelationship = {
 *   data: { type: 'users', id: '5' }
 * };
 *
 * // To-Many relationship
 * const comments: JsonApiRelationship = {
 *   data: [
 *     { type: 'comments', id: '1' },
 *     { type: 'comments', id: '2' }
 *   ]
 * };
 * ```
 */
export interface JsonApiRelationship {
  /** Relationship data (identifier or array of identifiers) */
  data: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
  /** Links information */
  links?: JsonApiLinks;
  /** Meta information */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Resource Identifier
 *
 * Minimum information to identify a resource (type + id)
 */
export interface JsonApiResourceIdentifier {
  /** Resource type */
  type: string;
  /** Resource ID */
  id: string;
}

/**
 * JSON:API Links
 *
 * Collection of related URL links
 */
export interface JsonApiLinks {
  /** Current resource URL */
  self?: string;
  /** Related resource URL */
  related?: string;
  /** First page URL */
  first?: string;
  /** Last page URL */
  last?: string;
  /** Previous page URL (null if none) */
  prev?: string | null;
  /** Next page URL (null if none) */
  next?: string | null;
}

/**
 * JSON:API Meta
 *
 * Object containing non-standard meta information
 */
export interface JsonApiMeta {
  [key: string]: unknown;
}

/**
 * JSON:API Error Object
 *
 * Object representing error information.
 *
 * @example
 * ```typescript
 * const error: JsonApiError = {
 *   id: 'abc123',
 *   status: '404',
 *   code: 'RESOURCE_NOT_FOUND',
 *   title: 'Resource Not Found',
 *   detail: 'The article with id "999" was not found',
 *   source: { parameter: 'id' }
 * };
 * ```
 */
export interface JsonApiError {
  /** Unique error ID */
  id?: string;
  /** HTTP status code (as string) */
  status?: string;
  /** Application-specific error code */
  code?: string;
  /** Short error title */
  title?: string;
  /** Detailed error description */
  detail?: string;
  /** Error source location */
  source?: {
    /** JSON Pointer to the value in request document */
    pointer?: string;
    /** Query parameter name that caused the issue */
    parameter?: string;
    /** Header name that caused the issue */
    header?: string;
  };
  /** Meta information */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Error Document
 *
 * Top-level document structure for error responses.
 */
export interface JsonApiErrorDocument {
  /** JSON:API version information */
  jsonapi: {
    version: '1.1';
  };
  /** Error list */
  errors: JsonApiError[];
  /** Meta information */
  meta?: JsonApiMeta;
}

/**
 * JSON:API Request Body (Create/Update)
 *
 * Request body structure for resource creation/modification.
 *
 * @template T - Attributes type
 *
 * @example
 * ```typescript
 * const createBody: JsonApiRequestBody<Article> = {
 *   data: {
 *     type: 'articles',
 *     attributes: { title: 'New Article' }
 *   }
 * };
 * ```
 */
export interface JsonApiRequestBody<T = unknown> {
  data: {
    /** Resource type */
    type: string;
    /** Resource ID (required for update, optional for create) */
    id?: string;
    /** Resource attributes */
    attributes?: Partial<T>;
    /** Relationship information */
    relationships?: Record<string, JsonApiRelationship>;
  };
}

/**
 * JSON:API Bulk Request Body
 *
 * Request body structure for bulk resource creation/modification.
 *
 * @template T - Attributes type
 */
export interface JsonApiBulkRequestBody<T = unknown> {
  data: Array<{
    /** Resource type */
    type: string;
    /** Resource ID (required for update) */
    id?: string;
    /** Resource attributes */
    attributes?: Partial<T>;
    /** Relationship information */
    relationships?: Record<string, JsonApiRelationship>;
  }>;
}
