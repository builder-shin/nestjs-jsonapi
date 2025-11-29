/**
 * JSON:API Module Metadata Constants
 *
 * @packageDocumentation
 * @module constants
 */

// Module options
export const JSON_API_MODULE_OPTIONS = Symbol('JSON_API_MODULE_OPTIONS');

// Prisma service token
export const PRISMA_SERVICE_TOKEN = Symbol('PRISMA_SERVICE_TOKEN');

// Controller/Serializer metadata
export const JSON_API_CONTROLLER_OPTIONS = Symbol(
  'JSON_API_CONTROLLER_OPTIONS',
);
export const JSON_API_SERIALIZER_OPTIONS = Symbol('JSON_API_SERIALIZER_OPTIONS');
export const JSON_API_ATTRIBUTES = Symbol('JSON_API_ATTRIBUTES');
export const JSON_API_RELATIONSHIPS = Symbol('JSON_API_RELATIONSHIPS');

// Action hook metadata
export const JSON_API_ACTION_METADATA = Symbol('JSON_API_ACTION_METADATA');
export const BEFORE_ACTION_METADATA = Symbol('BEFORE_ACTION_METADATA');
export const AFTER_ACTION_METADATA = Symbol('AFTER_ACTION_METADATA');
