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
 * Server Config API 설정
 *
 * 프론트엔드 개발자가 리소스 메타정보를 조회할 수 있는 API 설정입니다.
 */
export interface ServerConfigOptions {
  /**
   * API 활성화 여부
   * @default false
   */
  enabled: boolean;

  /**
   * 인증 비밀번호 (enabled=true 시 필수, 런타임에 검증)
   * Authorization 헤더로 전달: `Bearer <password>`
   */
  password?: string;

  /**
   * API 경로 prefix (선택)
   * @default 'server-config'
   */
  path?: string;

  /**
   * 노출할 정보 수준 (선택)
   * - 'minimal': 기본 정보만 (모델명, 타입, 활성 액션)
   * - 'standard': 쿼리 옵션 포함 (기본값)
   * - 'full': DTO 검증 규칙까지 포함
   * @default 'standard'
   */
  detailLevel?: 'minimal' | 'standard' | 'full';
}

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

  /**
   * Server Config API 설정 (선택)
   *
   * 프론트엔드 개발자가 리소스 메타정보를 조회할 수 있는 API를 제공합니다.
   * 기본값은 비활성화이며, 활성화 시 비밀번호가 필수입니다.
   *
   * @example
   * ```typescript
   * serverConfig: {
   *   enabled: true,
   *   password: process.env.SERVER_CONFIG_PASSWORD,
   *   detailLevel: 'standard',
   * }
   * ```
   */
  serverConfig?: ServerConfigOptions;
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

/**
 * 비동기 옵션 팩토리 인터페이스
 *
 * useClass 패턴에서 사용됩니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class JsonApiConfigService implements JsonApiOptionsFactory {
 *   createJsonApiOptions(): JsonApiModuleOptions {
 *     return {
 *       pagination: { defaultLimit: 20, maxLimit: 100 },
 *     };
 *   }
 * }
 * ```
 */
export interface JsonApiOptionsFactory {
  createJsonApiOptions(): Promise<JsonApiModuleOptions> | JsonApiModuleOptions;
}

/**
 * 확장된 비동기 모듈 옵션
 *
 * useClass, useExisting 패턴을 지원하는 확장 인터페이스입니다.
 * 기존 JsonApiModuleAsyncOptions와 호환되면서 추가 패턴을 제공합니다.
 *
 * @example
 * ```typescript
 * // useFactory 패턴 (기존 방식)
 * JsonApiModule.forRootAsync({
 *   useFactory: () => ({ pagination: { defaultLimit: 20, maxLimit: 100 } }),
 * });
 *
 * // useClass 패턴 (새로운 방식)
 * JsonApiModule.forRootAsync({
 *   useClass: JsonApiConfigService,
 * });
 *
 * // useExisting 패턴 (새로운 방식)
 * JsonApiModule.forRootAsync({
 *   useExisting: ExistingConfigService,
 * });
 * ```
 */
export interface JsonApiModuleAsyncOptionsExtended
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * 옵션 팩토리 함수 (useClass/useExisting 미사용 시 필수)
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<JsonApiModuleOptions> | JsonApiModuleOptions;

  /**
   * 팩토리에 주입할 의존성
   */
  inject?: any[];

  /**
   * 옵션 팩토리 클래스 (useFactory 대안)
   */
  useClass?: Type<JsonApiOptionsFactory>;

  /**
   * 기존 옵션 팩토리 사용 (useFactory 대안)
   */
  useExisting?: Type<JsonApiOptionsFactory>;

  /**
   * 추가 프로바이더
   */
  extraProviders?: Provider[];

  /**
   * Prisma 서비스 주입 토큰
   */
  prismaServiceToken?: Type<unknown> | string | symbol;
}
