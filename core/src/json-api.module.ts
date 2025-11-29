/**
 * JSON:API 모듈
 *
 * @packageDocumentation
 * @module json-api
 *
 * 의존성:
 * - @nestjs/common: Module, DynamicModule, Global, Provider, Type
 * - @nestjs/core: APP_FILTER, APP_GUARD, APP_INTERCEPTOR
 * - interfaces/*: 모듈 옵션 타입
 * - services/*: PrismaAdapter, QueryService, SerializerService
 * - guards/*: ContentTypeGuard
 * - interceptors/*: ResponseInterceptor
 * - filters/*: ExceptionFilter
 * - constants/*: 메타데이터 상수
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
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, HttpAdapterHost } from "@nestjs/core";
import { JsonApiModuleOptions, JsonApiModuleAsyncOptions } from "./interfaces";
import { PrismaAdapterService } from "./services/prisma-adapter.service";
import { JsonApiQueryService } from "./services/json-api-query.service";
import { JsonApiSerializerService } from "./services/json-api-serializer.service";
import { JsonApiResponseInterceptor } from "./interceptors/json-api-response.interceptor";
import { JsonApiExceptionFilter } from "./filters/json-api-exception.filter";
import { JsonApiContentTypeGuard } from "./guards/json-api-content-type.guard";
import { JSON_API_MODULE_OPTIONS, PRISMA_SERVICE_TOKEN } from "./constants";

/**
 * JSON:API 모듈
 *
 * NestJS 애플리케이션에 JSON:API 1.1 지원을 추가합니다.
 *
 * @example
 * ```typescript
 * // 동기 설정
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
 * // 비동기 설정
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
   * 모듈 초기화 시 Express 쿼리 파서를 확장 모드로 설정
   *
   * JSON:API 필터링(filter[field][operator]=value)을 위해
   * 중첩된 쿼리 파라미터를 객체로 파싱할 수 있어야 합니다.
   */
  onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (httpAdapter) {
      const instance = httpAdapter.getInstance();
      // Express 확장 쿼리 파서 설정 (qs 라이브러리 사용)
      // filter[status]=draft → { filter: { status: 'draft' } }
      instance.set("query parser", "extended");
      this.logger.log("Express 확장 쿼리 파서 설정 완료 (JSON:API 필터링 지원)");
    }
  }

  /**
   * 동기 모듈 설정
   *
   * @example
   * JsonApiModule.forRoot({
   *   pagination: { defaultLimit: 20, maxLimit: 100 },
   *   baseUrl: 'https://api.example.com',
   * })
   */
  static forRoot(options: JsonApiModuleOptions): DynamicModule {
    // prismaServiceToken은 클래스 또는 문자열 토큰을 받을 수 있음
    // 문자열 토큰 사용 시, 해당 토큰으로 등록된 Provider가 imports에 있어야 함
    const prismaToken = options.prismaServiceToken;

    const providers: Provider[] = [
      {
        provide: JSON_API_MODULE_OPTIONS,
        useValue: options,
      },
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
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

    // Prisma 서비스 토큰이 제공된 경우에만 연결
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // exports 배열 구성
    // PRISMA_SERVICE_TOKEN은 실제로 제공된 경우에만 export
    const exports: Array<string | symbol | Type<any>> = [
      JSON_API_MODULE_OPTIONS,
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
    ];

    if (prismaToken) {
      exports.push(PRISMA_SERVICE_TOKEN);
    }

    return {
      module: JsonApiModule,
      providers,
      exports,
    };
  }

  /**
   * 비동기 모듈 설정
   *
   * @example
   * JsonApiModule.forRootAsync({
   *   imports: [ConfigModule, PrismaModule],
   *   prismaServiceToken: PrismaService, // 클래스 토큰 권장
   *   useFactory: (config: ConfigService) => ({
   *     pagination: {
   *       defaultLimit: config.get('PAGINATION_DEFAULT_LIMIT', 20),
   *       maxLimit: config.get('PAGINATION_MAX_LIMIT', 100),
   *     },
   *     baseUrl: config.get('API_BASE_URL'),
   *   }),
   *   inject: [ConfigService],
   * })
   */
  static forRootAsync(options: JsonApiModuleAsyncOptions): DynamicModule {
    const prismaToken = options.prismaServiceToken;

    const providers: Provider[] = [
      // 모듈 옵션 비동기 제공
      {
        provide: JSON_API_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      ...(options.extraProviders || []),
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
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

    // Prisma 서비스 토큰이 제공된 경우에만 연결
    // 클래스 토큰(PrismaService) 또는 문자열 토큰('PRISMA_SERVICE') 모두 지원
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // exports 배열 구성
    // PRISMA_SERVICE_TOKEN은 실제로 제공된 경우에만 export하여
    // 다른 모듈에서 존재하지 않는 토큰을 주입하려는 에러 방지
    const exports: Array<string | symbol | Type<any>> = [
      JSON_API_MODULE_OPTIONS,
      PrismaAdapterService,
      JsonApiQueryService,
      JsonApiSerializerService,
    ];

    if (prismaToken) {
      exports.push(PRISMA_SERVICE_TOKEN);
    }

    return {
      module: JsonApiModule,
      imports: options.imports || [],
      providers,
      exports,
    };
  }
}
