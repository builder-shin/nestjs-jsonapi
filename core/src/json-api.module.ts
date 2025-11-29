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
   * Synchronous module configuration
   *
   * @example
   * JsonApiModule.forRoot({
   *   pagination: { defaultLimit: 20, maxLimit: 100 },
   *   baseUrl: 'https://api.example.com',
   * })
   */
  static forRoot(options: JsonApiModuleOptions): DynamicModule {
    // prismaServiceToken can accept a class or string token
    // When using a string token, a Provider registered with that token must be in imports
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

    // Connect only when Prisma service token is provided
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // Construct exports array
    // PRISMA_SERVICE_TOKEN is only exported when actually provided
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
   * Asynchronous module configuration
   *
   * @example
   * JsonApiModule.forRootAsync({
   *   imports: [ConfigModule, PrismaModule],
   *   prismaServiceToken: PrismaService, // Class token recommended
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
      // Provide module options asynchronously
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

    // Connect only when Prisma service token is provided
    // Supports both class tokens (PrismaService) and string tokens ('PRISMA_SERVICE')
    if (prismaToken) {
      providers.push({
        provide: PRISMA_SERVICE_TOKEN,
        useExisting: prismaToken as Type<any> | string,
      });
    }

    // Construct exports array
    // PRISMA_SERVICE_TOKEN is only exported when actually provided
    // to prevent errors when other modules try to inject a non-existent token
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
