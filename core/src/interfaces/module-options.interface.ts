/**
 * Module configuration options interface definition
 *
 * @packageDocumentation
 * @module interfaces
 */

import { ModuleMetadata, Provider, Type } from '@nestjs/common';

/**
 * ID type configuration
 *
 * Select based on the ID field type of your Prisma model.
 *
 * - 'string': String ID (default)
 * - 'number': Numeric ID (auto-conversion)
 * - 'uuid': UUID format validation
 * - 'cuid': CUID format (supports both v1 and v2)
 * - 'auto': Auto-detect type
 */
export type IdType = 'string' | 'number' | 'uuid' | 'cuid' | 'auto';

/**
 * Module global configuration options
 *
 * Configuration object passed to JsonApiModule.forRoot().
 *
 * @example
 * ```typescript
 * JsonApiModule.forRoot({
 *   pagination: {
 *     defaultLimit: 20,
 *     maxLimit: 100,
 *   },
 *   baseUrl: 'https://api.example.com',
 *   idType: 'uuid',
 * });
 * ```
 */
export interface JsonApiModuleOptions {
  /**
   * Pagination settings (required)
   */
  pagination: {
    /**
     * Default page size
     */
    defaultLimit: number;
    /**
     * Maximum page size
     */
    maxLimit: number;
  };

  /**
   * Global base URL (optional)
   * @example 'https://api.example.com'
   */
  baseUrl?: string;

  /**
   * Prisma service injection token (optional)
   * Supports class type, string token, or symbol token.
   * @example PrismaService // Class type recommended
   * @example 'PRISMA_SERVICE' // String token
   * @default 'PRISMA_SERVICE'
   */
  prismaServiceToken?: Type<unknown> | string | symbol;

  /**
   * ID type configuration (optional)
   * - 'string': String ID (default)
   * - 'number': Numeric ID (auto-conversion)
   * - 'uuid': UUID format validation
   * - 'cuid': CUID format
   * - 'auto': Auto-detect type
   * @default 'string'
   */
  idType?: IdType;

  /**
   * Enable debug mode (optional)
   * @default false
   */
  debug?: boolean;
}

/**
 * Async module configuration options
 *
 * Configuration object passed to JsonApiModule.forRootAsync().
 *
 * @example
 * ```typescript
 * JsonApiModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     pagination: {
 *       defaultLimit: config.get('PAGINATION_DEFAULT'),
 *       maxLimit: config.get('PAGINATION_MAX'),
 *     },
 *   }),
 *   inject: [ConfigService],
 * });
 * ```
 */
export interface JsonApiModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Options factory function
   */
  useFactory: (
    ...args: any[]
  ) => Promise<JsonApiModuleOptions> | JsonApiModuleOptions;

  /**
   * Dependencies to inject into factory
   */
  inject?: any[];

  /**
   * Additional providers
   */
  extraProviders?: Provider[];

  /**
   * Prisma service injection token (optional)
   * Used when specifying directly in forRootAsync
   * Supports class type, string token, or symbol token.
   * @example PrismaService // Class type recommended
   * @default 'PRISMA_SERVICE'
   */
  prismaServiceToken?: Type<unknown> | string | symbol;
}
