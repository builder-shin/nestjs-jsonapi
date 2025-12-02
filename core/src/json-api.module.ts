/**
 * JSON:API Module
 *
 * @packageDocumentation
 * @module json-api
 *
 * Dependencies:
 * - @nestjs/common: Module, DynamicModule, Global, Provider, Type
 * - @nestjs/core: APP_FILTER, APP_GUARD, APP_INTERCEPTOR
 * - interfaces/*: Module options types
 * - services/*: PrismaAdapter, QueryService, SerializerService
 * - guards/*: ContentTypeGuard
 * - interceptors/*: ResponseInterceptor
 * - filters/*: ExceptionFilter
 * - constants/*: Metadata constants
 */

import {
  Module,
  DynamicModule,
  Global,
  Provider,
  Type,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  HttpAdapterHost,
  DiscoveryModule,
  RouterModule,
} from "@nestjs/core";
import { JsonApiModuleOptions, JsonApiModuleAsyncOptions } from "./interfaces";
import { PrismaAdapterService } from "./services/prisma-adapter.service";
import { JsonApiQueryService } from "./services/json-api-query.service";
import { JsonApiSerializerService } from "./services/json-api-serializer.service";
import { ControllerRegistryService } from "./services/controller-registry.service";
import { JsonApiResponseInterceptor } from "./interceptors/json-api-response.interceptor";
import { JsonApiExceptionFilter } from "./filters/json-api-exception.filter";
import { JsonApiContentTypeGuard } from "./guards/json-api-content-type.guard";
import { JSON_API_MODULE_OPTIONS, PRISMA_SERVICE_TOKEN } from "./constants";
import { ServerConfigModule } from "./modules/server-config.module";

/**
 * JSON:API Module
 *
 * Adds JSON:API 1.1 support to NestJS applications.
 *
 * @example
 * ```typescript
 * // Synchronous configuration
 * @Module({
 *   imports: [
 *     JsonApiModule.forRoot({
 *       pagination: { defaultLimit: 20, maxLimit: 100 },
 *       baseUrl: 'https://api.example.com',
 *       prismaServiceToken: PrismaService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // Asynchronous configuration
 * @Module({
 *   imports: [
 *     JsonApiModule.forRootAsync({
 *       imports: [ConfigModule, PrismaModule],
 *       prismaServiceToken: PrismaService,
 *       useFactory: (config: ConfigService) => ({
 *         pagination: {
 *           defaultLimit: config.get('PAGINATION_DEFAULT_LIMIT', 20),
 *           maxLimit: config.get('PAGINATION_MAX_LIMIT', 100),
 *         },
 *         baseUrl: config.get('API_BASE_URL'),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class JsonApiModule implements OnModuleInit {
  private readonly logger = new Logger(JsonApiModule.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  /**
   * Sets Express query parser to extended mode on module initialization
   *
   * For JSON:API filtering (filter[field][operator]=value),
   * nested query parameters must be parseable as objects.
   */
  onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (httpAdapter) {
      const instance = httpAdapter.getInstance();
      // Set Express extended query parser (uses qs library)
      // filter[status]=draft → { filter: { status: 'draft' } }
      instance.set("query parser", "extended");
      this.logger.log("Express extended query parser configured (JSON:API filtering support)");
    }
  }

  /**
   * 동기 설정으로 모듈 초기화
   *
   * @example
   * JsonApiModule.forRoot({
   *   pagination: { defaultLimit: 20, maxLimit: 100 },
   *   baseUrl: 'https://api.example.com',
   *   serverConfig: { enabled: true, password: 'secret' },
   * })
   */
  static forRoot(options: JsonApiModuleOptions): DynamicModule {
    // 설정 검증: enabled=true면 password 필수
    this.validateServerConfig(options);

    // prismaServiceToken은 클래스 또는 문자열 토큰을 받을 수 있음
    const prismaToken = options.prismaServiceToken;

    // ========== 기존 providers 유지 + 신규 추가 ==========
    const providers: Provider[] = [
      {
        provide: JSON_API_MODULE_OPTIONS,
        useValue: options,
      },
      // 기존 서비스 (유지 필수)
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
      // 신규 서비스
      ControllerRegistryService,
      // 기존 글로벌 프로바이더 (유지 필수)
      {
        provide: APP_GUARD,
        useClass: JsonApiContentTypeGuard,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: JsonApiResponseInterceptor,
      },
      {
        provide: APP_FILTER,
        useClass: JsonApiExceptionFilter,
      },
    ];

    // 기존 Prisma 토큰 처리 (유지)
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // ========== 기존 exports 유지 + 신규 추가 ==========
    const exports: Array<string | symbol | Type<any>> = [
      JSON_API_MODULE_OPTIONS,
      // 기존 서비스 (유지 필수)
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
      // 신규 서비스
      ControllerRegistryService,
    ];

    if (prismaToken) {
      exports.push(PRISMA_SERVICE_TOKEN);
    }

    // ========== imports 구성 ==========
    // DiscoveryModule 추가 (ControllerRegistryService에서 DiscoveryService 사용)
    const imports: Array<Type<any> | DynamicModule> = [
      DiscoveryModule,
    ];

    // serverConfig가 활성화된 경우 RouterModule로 동적 경로 설정
    if (options.serverConfig?.enabled) {
      const serverConfigPath = options.serverConfig.path ?? "server-config";

      imports.push(
        ServerConfigModule,
        RouterModule.register([
          {
            path: serverConfigPath,
            module: ServerConfigModule,
          },
        ]),
      );
    }

    // global: true 제거 - @Global() 데코레이터가 이미 적용됨
    return {
      module: JsonApiModule,
      imports,
      providers,
      exports,
    };
  }

  /**
   * 비동기 설정으로 모듈 초기화
   *
   * 설계 결정: forRoot와 동작 통일
   * - 항상 ServerConfigModule 등록 (Guard에서 enabled 체크하여 비활성화 시 403 반환)
   * - 비동기 특성상 컴파일 타임에 enabled 여부를 알 수 없으므로 이 방식이 적합
   *
   * forRootAsync에서의 path 설정 제한:
   * NestJS 모듈 시스템 특성상, RouterModule.register()는 모듈 정의 시점에 호출되므로
   * useFactory에서 반환하는 serverConfig.path 값을 사용할 수 없습니다.
   *
   * 커스텀 경로 설정 방법:
   * 1. 동기 설정(forRoot) 사용 권장 - serverConfig.path 직접 지정 가능
   * 2. 환경변수 사용 - SERVER_CONFIG_PATH 환경변수로 경로 설정
   * 3. useFactory 내에서 경로가 필요하다면, 환경변수와 동기화하여 사용
   *
   * @example
   * JsonApiModule.forRootAsync({
   *   imports: [ConfigModule, PrismaModule],
   *   prismaServiceToken: PrismaService,
   *   useFactory: (config: ConfigService) => ({
   *     pagination: {
   *       defaultLimit: config.get('PAGINATION_DEFAULT_LIMIT', 20),
   *       maxLimit: config.get('PAGINATION_MAX_LIMIT', 100),
   *     },
   *     baseUrl: config.get('API_BASE_URL'),
   *     serverConfig: {
   *       enabled: config.get('SERVER_CONFIG_ENABLED', false),
   *       password: config.get('SERVER_CONFIG_PASSWORD'),
   *     },
   *   }),
   *   inject: [ConfigService],
   * })
   */
  static forRootAsync(options: JsonApiModuleAsyncOptions): DynamicModule {
    const prismaToken = options.prismaServiceToken;

    // ========== 기존 providers 유지 + 신규 추가 ==========
    const providers: Provider[] = [
      // 비동기 옵션 프로바이더
      {
        provide: JSON_API_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      // 추가 프로바이더 (기존 지원)
      ...(options.extraProviders || []),
      // 기존 서비스 (유지 필수)
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
      // 신규 서비스
      ControllerRegistryService,
      // 기존 글로벌 프로바이더 (유지 필수)
      {
        provide: APP_GUARD,
        useClass: JsonApiContentTypeGuard,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: JsonApiResponseInterceptor,
      },
      {
        provide: APP_FILTER,
        useClass: JsonApiExceptionFilter,
      },
      // 비동기 옵션 검증을 위한 팩토리
      {
        provide: "SERVER_CONFIG_VALIDATOR",
        inject: [JSON_API_MODULE_OPTIONS],
        useFactory: (moduleOptions: JsonApiModuleOptions) => {
          this.validateServerConfig(moduleOptions);
          return true;
        },
      },
    ];

    // 기존 Prisma 토큰 처리 (유지)
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // ========== 기존 exports 유지 + 신규 추가 ==========
    const exports: Array<string | symbol | Type<any>> = [
      JSON_API_MODULE_OPTIONS,
      // 기존 서비스 (유지 필수)
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
      // 신규 서비스
      ControllerRegistryService,
    ];

    if (prismaToken) {
      exports.push(PRISMA_SERVICE_TOKEN);
    }

    // ========== imports 구성 ==========
    const userImports = options.imports ?? [];
    const imports: NonNullable<typeof options.imports> = [
      DiscoveryModule,
      ...userImports,
    ];

    // forRootAsync에서는 항상 ServerConfigModule 등록
    // (비동기 특성상 enabled 여부를 컴파일 타임에 알 수 없음)
    const serverConfigPath = process.env.SERVER_CONFIG_PATH || "server-config";
    imports.push(
      ServerConfigModule,
      RouterModule.register([
        {
          path: serverConfigPath,
          module: ServerConfigModule,
        },
      ]),
    );

    // global: true 제거 - @Global() 데코레이터가 이미 적용됨
    return {
      module: JsonApiModule,
      imports,
      providers,
      exports,
    };
  }

  /**
   * ServerConfig 옵션 검증
   */
  private static validateServerConfig(options: JsonApiModuleOptions): void {
    if (options.serverConfig?.enabled && !options.serverConfig.password) {
      throw new Error(
        "JsonApiModule: serverConfig.password is required when serverConfig.enabled is true",
      );
    }
  }
}
