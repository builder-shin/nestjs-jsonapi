/**
 * JSON:API CRUD 베이스 컨트롤러
 *
 * @packageDocumentation
 * @module controllers
 *
 * 의존성:
 * - @nestjs/common: HTTP 데코레이터, 예외 클래스
 * - express: Request 타입
 * - class-transformer: DTO 변환
 * - class-validator: DTO 검증
 * - reflect-metadata: 메타데이터 처리
 * - services/*: PrismaAdapter, QueryService, SerializerService
 * - interfaces/*: JSON:API, 컨트롤러 옵션 타입
 * - exceptions/*: 검증 예외
 * - constants/*: 메타데이터 상수
 * - utils/*: 네이밍, ID 변환
 */

import {
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
  Type,
} from "@nestjs/common";
import { Request } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import "reflect-metadata";
import { PrismaAdapterService } from "../services/prisma-adapter.service";
import { JsonApiQueryService } from "../services/json-api-query.service";
import {
  JsonApiSerializerService,
  IncludedResource,
} from "../services/json-api-serializer.service";
import {
  JsonApiDocument,
  JsonApiRequestBody,
  JsonApiRelationship,
  JsonApiResourceIdentifier,
  JsonApiControllerOptions,
  JsonApiModuleOptions,
  ActionHookMetadata,
  ActionHookOptions,
  ParsedQuery,
} from "../interfaces";
import {
  JsonApiValidationException,
  JsonApiQueryException,
  QueryValidationError,
} from "../exceptions";
import {
  BEFORE_ACTION_METADATA,
  AFTER_ACTION_METADATA,
  JSON_API_CONTROLLER_OPTIONS,
} from "../constants";
import { pluralize, convertId } from "../utils";

/**
 * JSON:API CRUD 베이스 컨트롤러
 *
 * Rails 스타일의 @model 패턴과 before_action/after_action을 지원합니다.
 *
 * 주요 기능:
 * - this.model: DTO로 필터링되고 검증된 엔티티 인스턴스
 * - this.record: DB에서 조회된 원본 레코드
 * - @BeforeAction/@AfterAction: Rails 스타일 훅 데코레이터
 * - beforeCreate/afterCreate 등: 오버라이드 가능한 개별 훅
 *
 * ## 서비스 주입 패턴
 *
 * NestJS DI 컨테이너는 abstract class의 의존성을 자동 주입하지 않습니다.
 * 따라서 하위 클래스에서 constructor를 통해 서비스를 주입받고,
 * protected getter를 구현해야 합니다.
 *
 * @example
 * ```typescript
 * @Controller('articles')
 * @JsonApiController({ model: 'article', serializer: ArticleSerializer })
 * @BeforeAction('authenticate')
 * @BeforeAction('setArticle', { only: ['show', 'update', 'delete', 'publish'] })
 * @AfterAction('logActivity', { except: ['index', 'show'] })
 * export class ArticleController extends JsonApiCrudController {
 *   constructor(
 *     private readonly _prismaAdapter: PrismaAdapterService,
 *     private readonly _queryService: JsonApiQueryService,
 *     private readonly _serializerService: JsonApiSerializerService,
 *     @Inject(JSON_API_MODULE_OPTIONS)
 *     private readonly _moduleOptions: JsonApiModuleOptions,
 *   ) {
 *     super();
 *   }
 *
 *   // 필수: abstract getter 구현
 *   protected get prismaAdapter() { return this._prismaAdapter; }
 *   protected get queryService() { return this._queryService; }
 *   protected get serializerService() { return this._serializerService; }
 *   protected get moduleOptions() { return this._moduleOptions; }
 *
 *   protected async authenticate(): Promise<void> { ... }
 *   protected async setArticle(): Promise<void> { ... }
 *
 *   @Post(':id/publish')
 *   @JsonApiAction('publish')
 *   async publish(@Param('id') id: string) {
 *     return this.executeAction('publish', async () => { ... });
 *   }
 * }
 * ```
 */
export abstract class JsonApiCrudController {
  /**
   * Prisma 어댑터 서비스
   *
   * NestJS DI 제한사항:
   * abstract class는 DI 컨테이너에서 직접 주입을 받을 수 없습니다.
   * 하위 클래스에서 constructor를 통해 서비스를 주입받고,
   * 이 getter를 구현하여 베이스 클래스에 제공해야 합니다.
   *
   * @example
   * ```typescript
   * // 하위 클래스에서 구현 (필수)
   * constructor(
   *   private readonly _prismaAdapter: PrismaAdapterService,
   *   private readonly _queryService: JsonApiQueryService,
   *   private readonly _serializerService: JsonApiSerializerService,
   * ) {
   *   super();
   * }
   *
   * protected get prismaAdapter() { return this._prismaAdapter; }
   * protected get queryService() { return this._queryService; }
   * protected get serializerService() { return this._serializerService; }
   * ```
   */
  protected abstract get prismaAdapter(): PrismaAdapterService;

  /**
   * 쿼리 서비스
   *
   * @see prismaAdapter getter 설명 참조 - 동일한 주입 패턴 적용
   */
  protected abstract get queryService(): JsonApiQueryService;

  /**
   * 직렬화 서비스
   *
   * @see prismaAdapter getter 설명 참조 - 동일한 주입 패턴 적용
   */
  protected abstract get serializerService(): JsonApiSerializerService;

  /**
   * 모듈 옵션 (선택적)
   *
   * ID 타입 변환, 디버그 모드 등 모듈 수준 설정이 필요한 경우 구현합니다.
   * 기본값은 undefined를 반환하며, 필요시 하위 클래스에서 오버라이드합니다.
   *
   * @example
   * ```typescript
   * constructor(
   *   @Inject(JSON_API_MODULE_OPTIONS)
   *   private readonly _moduleOptions: JsonApiModuleOptions,
   * ) { super(); }
   *
   * protected get moduleOptions() { return this._moduleOptions; }
   * ```
   */
  protected get moduleOptions(): JsonApiModuleOptions | undefined {
    return undefined;
  }

  /**
   * 디버그 로거
   */
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * 컨트롤러 옵션
   * @JsonApiController 데코레이터 또는 직접 정의
   */
  protected get options(): JsonApiControllerOptions {
    return (
      Reflect.getMetadata(JSON_API_CONTROLLER_OPTIONS, this.constructor) || {}
    );
  }

  /**
   * 디버그 모드 활성화 여부
   */
  protected get isDebugMode(): boolean {
    return this.moduleOptions?.debug ?? false;
  }

  /**
   * 현재 작업 중인 모델 인스턴스
   * - DTO를 통해 허용된 필드만 필터링됨
   * - class-validator로 검증 완료된 상태
   * - 라이프사이클 훅에서 수정 가능
   */
  protected model: Record<string, unknown> = {};

  /**
   * 현재 조회/수정/삭제 대상 레코드 (DB에서 조회된 원본)
   * - show, update, delete 액션에서 사용 가능
   * - create 액션에서는 null
   */
  protected record: Record<string, unknown> | null = null;

  /**
   * 현재 요청 객체
   */
  protected request!: Request;

  /**
   * 파싱된 쿼리 파라미터
   */
  protected parsedQuery!: ParsedQuery;

  /**
   * 현재 실행 중인 액션명
   * 기본 CRUD: 'index', 'show', 'create', 'update', 'delete' 등
   * 커스텀: 'publish', 'archive' 등
   */
  protected currentAction: string = "";

  // ============================================
  // 유틸리티 메서드
  // ============================================

  /**
   * ID를 모듈 설정에 맞게 변환
   * @param id 문자열 ID
   * @returns 변환된 ID (string 또는 number)
   */
  protected convertIdByConfig(id: string): string | number {
    const idType = this.moduleOptions?.idType ?? "string";
    return convertId(id, idType);
  }

  /**
   * 디버그 로그 출력
   * debug 옵션이 활성화된 경우에만 출력
   */
  protected debugLog(message: string, context?: Record<string, unknown>): void {
    if (this.isDebugMode) {
      this.logger.debug(message, context ? JSON.stringify(context) : undefined);
    }
  }

  // ============================================
  // 액션 실행 및 훅 시스템
  // ============================================

  /**
   * 액션 실행 래퍼
   *
   * 액션 실행 전후에 @BeforeAction/@AfterAction 훅들을 자동으로 실행합니다.
   * 기본 CRUD 액션(index, show, create, update, delete)은 물론
   * @JsonApiAction으로 등록한 커스텀 액션에서도 동일하게 동작합니다.
   *
   * ## 실행 순서
   * 1. this.currentAction에 액션명 설정
   * 2. @BeforeAction 훅들 실행 (only/except 조건 확인)
   * 3. handler 실행 (실제 비즈니스 로직)
   * 4. @AfterAction 훅들 실행 (only/except 조건 확인)
   *
   * ## 커스텀 액션에서 사용
   * ```typescript
   * @Post(':id/publish')
   * @JsonApiAction('publish')
   * async publish(@Param('id') id: string) {
   *   return this.executeAction('publish', async () => {
   *     // @BeforeAction('loadRecord', { only: ['publish'] }) 실행됨
   *     // @BeforeAction('authenticate') 실행됨 (only/except 없으면 항상 실행)
   *
   *     const updated = await this.prismaAdapter.update(...);
   *     return this.serializerService.serialize(...);
   *
   *     // @AfterAction('logActivity', { except: ['index'] }) 실행됨
   *   });
   * }
   * ```
   *
   * @param action 액션명 (기본 CRUD: 'index', 'show', 'create', 'update', 'delete'
   *               또는 커스텀: 'publish', 'archive' 등)
   * @param handler 실제 액션 로직을 수행하는 비동기 함수
   * @returns handler의 반환값
   *
   * @see JsonApiAction - 커스텀 액션 등록 데코레이터
   * @see BeforeAction - 액션 실행 전 훅
   * @see AfterAction - 액션 실행 후 훅
   */
  protected async executeAction<T>(
    action: string,
    handler: () => Promise<T>
  ): Promise<T> {
    this.currentAction = action;

    // @BeforeAction 훅들 실행
    await this.runBeforeActionHooks();

    // 실제 액션 실행
    const result = await handler();

    // @AfterAction 훅들 실행
    await this.runAfterActionHooks();

    return result;
  }

  /**
   * @BeforeAction 훅들 실행
   */
  private async runBeforeActionHooks(): Promise<void> {
    const hooks: ActionHookMetadata[] =
      Reflect.getMetadata(BEFORE_ACTION_METADATA, this.constructor) || [];

    for (const hook of hooks) {
      if (this.shouldRunHook(hook.options, this.currentAction)) {
        const method = (this as any)[hook.methodName];
        if (typeof method === "function") {
          await method.call(this);
        }
      }
    }
  }

  /**
   * @AfterAction 훅들 실행
   */
  private async runAfterActionHooks(): Promise<void> {
    const hooks: ActionHookMetadata[] =
      Reflect.getMetadata(AFTER_ACTION_METADATA, this.constructor) || [];

    for (const hook of hooks) {
      if (this.shouldRunHook(hook.options, this.currentAction)) {
        const method = (this as any)[hook.methodName];
        if (typeof method === "function") {
          await method.call(this);
        }
      }
    }
  }

  /**
   * 훅 실행 여부 판단
   *
   * @BeforeAction/@AfterAction의 only/except 옵션을 평가하여
   * 해당 훅이 현재 액션에서 실행되어야 하는지 결정합니다.
   *
   * ## only/except 동작 규칙
   * 1. only가 지정된 경우: 액션이 only 배열에 포함되어야 실행
   * 2. except가 지정된 경우: 액션이 except 배열에 포함되지 않아야 실행
   * 3. 둘 다 없는 경우: 모든 액션에서 실행
   * 4. only와 except 둘 다 지정된 경우: only가 우선 적용
   *
   * ## 커스텀 액션 지원
   * only/except 배열에는 기본 CRUD 액션과 @JsonApiAction으로
   * 등록한 커스텀 액션 모두 사용할 수 있습니다.
   *
   * @example
   * // 기본 CRUD + 커스텀 액션 혼합 사용
   * { only: ['show', 'update', 'delete', 'publish', 'archive'] }
   * { except: ['index', 'show'] } // create, update, delete, publish 등에서 실행
   *
   * @param options 훅 옵션 (only/except 포함)
   * @param action 현재 실행 중인 액션명
   * @returns 훅 실행 여부
   */
  private shouldRunHook(options: ActionHookOptions, action: string): boolean {
    if (options.only && options.only.length > 0) {
      return options.only.includes(action);
    }
    if (options.except && options.except.length > 0) {
      return !options.except.includes(action);
    }
    return true; // only/except 없으면 항상 실행
  }

  /**
   * 액션 활성화 여부 확인
   *
   * @JsonApiController의 only/except 옵션을 평가하여
   * 해당 기본 CRUD 액션이 활성화되어 있는지 확인합니다.
   *
   * 참고: 이 메서드는 기본 CRUD 액션에만 적용됩니다.
   * 커스텀 액션(@JsonApiAction으로 정의)은 별도 라우트로 정의되므로
   * 이 메서드의 영향을 받지 않습니다.
   *
   * @param action 확인할 액션명
   * @returns 액션 활성화 여부
   */
  protected isActionEnabled(action: string): boolean {
    const { only, except } = this.options;

    if (only && only.length > 0) {
      return only.includes(action);
    }
    if (except && except.length > 0) {
      return !except.includes(action);
    }
    return true;
  }

  // ============================================
  // 개별 라이프사이클 훅 - 오버라이드하여 사용
  // ============================================

  /** index 액션 전 훅 */
  protected async beforeIndex(): Promise<void> {}
  /** index 액션 후 훅 */
  protected async afterIndex(_records: any[]): Promise<void> {}
  /** show 액션 전 훅 (레코드 조회 후) */
  protected async beforeShow(): Promise<void> {}
  /** show 액션 후 훅 */
  protected async afterShow(): Promise<void> {}
  /** create 액션 전 훅 (모델 빌드 후, DB 저장 전) */
  protected async beforeCreate(): Promise<void> {}
  /** create 액션 후 훅 (DB 저장 후) */
  protected async afterCreate(): Promise<void> {}
  /** update 액션 전 훅 (모델 빌드 후, DB 저장 전) */
  protected async beforeUpdate(): Promise<void> {}
  /** update 액션 후 훅 (DB 저장 후) */
  protected async afterUpdate(): Promise<void> {}
  /** delete 액션 전 훅 (레코드 조회 후, 삭제 전) */
  protected async beforeDelete(): Promise<void> {}
  /** delete 액션 후 훅 (삭제 후) */
  protected async afterDelete(): Promise<void> {}
  /** upsert 액션 전 훅 */
  protected async beforeUpsert(): Promise<void> {}
  /** upsert 액션 후 훅 */
  protected async afterUpsert(): Promise<void> {}

  // ============================================
  // 모델 빌드 메서드
  // ============================================

  /**
   * 요청 body에서 모델 빌드 (타입 안전 버전)
   * - JSON:API body에서 attributes 추출
   * - DTO 클래스로 변환 (whitelist에 의해 허용된 필드만 필터링)
   * - class-validator로 검증
   *
   * @typeParam T - DTO 타입 (CreateDto 또는 UpdateDto)
   * @param body JSON:API 요청 body (타입 안전)
   * @param dtoClass DTO 클래스 (create 또는 update)
   * @returns 검증된 모델 객체 (DTO 타입)
   *
   * @example
   * // 타입 안전한 사용
   * const model = await this.buildModel<CreateArticleDto>(body, CreateArticleDto);
   * // model은 CreateArticleDto 타입으로 추론됨
   */
  protected async buildModel<T extends object = Record<string, unknown>>(
    body: JsonApiRequestBody<T>,
    dtoClass?: Type<T>
  ): Promise<T> {
    // JSON:API body에서 attributes 추출
    const attributes = body?.data?.attributes || {};

    // relationships에서 ID 추출
    const relationships = body?.data?.relationships || {};
    const relationData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(relationships)) {
      const rel = value as JsonApiRelationship;
      if (rel?.data) {
        if (Array.isArray(rel.data)) {
          relationData[`${key}Ids`] = rel.data.map(
            (r: JsonApiResourceIdentifier) => r.id
          );
        } else {
          relationData[`${key}Id`] = rel.data.id;
        }
      }
    }

    const rawData = { ...attributes, ...relationData } as T;

    // DTO 클래스가 없으면 raw 데이터 반환
    if (!dtoClass) {
      return rawData;
    }

    // DTO 인스턴스로 변환
    const dtoInstance = plainToInstance(dtoClass, rawData);

    // class-validator로 검증
    const errors = await validate(dtoInstance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      throw new JsonApiValidationException(errors);
    }

    // 검증된 DTO를 plain object로 변환 (undefined 필드 제거)
    const result = {} as T;
    for (const key of Object.keys(dtoInstance as object)) {
      const value = (dtoInstance as Record<string, unknown>)[key];
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    return result;
  }

  /**
   * ID로 레코드 조회
   * 조회된 레코드는 this.record에 저장됨
   */
  protected async findRecord(id: string): Promise<Record<string, unknown>> {
    // ID 타입 변환 (설정에 따라 string 또는 number)
    const convertedId = this.convertIdByConfig(id);

    this.debugLog("findRecord called", {
      model: this.options.model,
      originalId: id,
      convertedId,
      idType: this.moduleOptions?.idType ?? "string",
    });

    const includeOption =
      this.parsedQuery?.include?.length > 0
        ? this.queryService.toPrismaOptions(
            {
              ...this.parsedQuery,
              filter: [],
              sort: [],
              page: { offset: 0, limit: 1 },
            },
            this.options.model
          ).include
        : undefined;

    const record = await this.prismaAdapter.findOne(this.options.model, {
      where: { id: convertedId },
      include: includeOption as Record<string, boolean | object>,
    });

    if (!record) {
      this.debugLog("Record not found", {
        model: this.options.model,
        id: convertedId,
      });
      throw new NotFoundException(
        `${this.options.model} with id "${id}" not found`
      );
    }

    this.debugLog("Record found", {
      model: this.options.model,
      recordId: record.id,
    });
    this.record = record;
    return record;
  }

  // ============================================
  // CRUD 액션
  // ============================================

  /**
   * GET / - 리소스 목록 조회
   */
  @Get()
  async index(@Req() request: Request): Promise<JsonApiDocument> {
    return this.executeAction("index", async () => {
      this.request = request;
      this.record = null;
      this.model = {};

      // 화이트리스트 적용된 쿼리 파싱
      const { parsed, errors } = this.queryService.parseWithWhitelist(
        request,
        this.options.query
      );

      // onDisallowed: 'error' 모드에서 에러 발생 시
      if (errors.length > 0) {
        throw new JsonApiQueryException(
          errors.map((msg) => this.parseErrorMessage(msg))
        );
      }

      this.parsedQuery = parsed;

      // beforeIndex 훅
      await this.beforeIndex();

      const prismaOptions = this.queryService.toPrismaOptions(
        this.parsedQuery,
        this.options.model
      );

      const [data, total] = await Promise.all([
        this.prismaAdapter.findMany(this.options.model, prismaOptions),
        this.prismaAdapter.count(
          this.options.model,
          prismaOptions.where as Record<string, unknown>
        ),
      ]);

      // afterIndex 훅
      await this.afterIndex(data);

      const included = this.collectIncludes(data, this.parsedQuery.include);

      return this.serializerService.serializeMany(
        data,
        this.options.serializer,
        {
          baseUrl: this.getBaseUrl(request),
          included,
          pagination: {
            offset: this.parsedQuery.page.offset,
            limit: this.parsedQuery.page.limit,
            total,
          },
          sparseFields: this.parsedQuery.fields[this.getResourceType()],
        }
      );
    });
  }

  /**
   * GET /:id - 단일 리소스 조회
   */
  @Get(":id")
  async show(
    @Param("id") id: string,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("show", async () => {
      this.request = request;
      this.model = {};

      // 화이트리스트 적용된 쿼리 파싱
      const { parsed, errors } = this.queryService.parseWithWhitelist(
        request,
        this.options.query
      );

      // onDisallowed: 'error' 모드에서 에러 발생 시
      if (errors.length > 0) {
        throw new JsonApiQueryException(
          errors.map((msg) => this.parseErrorMessage(msg))
        );
      }

      this.parsedQuery = parsed;

      // 레코드 조회 → this.record에 저장
      await this.findRecord(id);

      // beforeShow 훅
      await this.beforeShow();

      // afterShow 훅
      await this.afterShow();

      const included = this.collectIncludes(
        [this.record],
        this.parsedQuery.include
      );

      return this.serializerService.serializeOne(
        this.record,
        this.options.serializer,
        {
          baseUrl: this.getBaseUrl(request),
          included,
          sparseFields: this.parsedQuery.fields[this.getResourceType()],
        }
      );
    });
  }

  /**
   * POST / - 단일 리소스 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("create", async () => {
      this.request = request;
      this.parsedQuery = this.queryService.parse(request);
      this.record = null;

      // 모델 빌드 → this.model에 저장
      this.model = await this.buildModel(body, this.options.dto?.create);

      // beforeCreate 훅 (this.model 수정 가능)
      await this.beforeCreate();

      // DB 저장
      const data = await this.prismaAdapter.create(
        this.options.model,
        this.model
      );
      this.record = data;

      // afterCreate 훅
      await this.afterCreate();

      return this.serializerService.serializeOne(
        data,
        this.options.serializer,
        {
          baseUrl: this.getBaseUrl(request),
        }
      );
    });
  }

  /**
   * POST /_bulk/create - 여러 리소스 생성
   * (비표준 확장)
   * 트랜잭션으로 원자적 실행 보장 - 부분 실패 방지
   *
   * 에러 처리 전략:
   * 1. 트랜잭션 시작 전 모든 데이터 검증 (Pre-validation)
   * 2. 검증 실패 시 트랜잭션 진입 없이 즉시 에러 반환
   * 3. 트랜잭션 내에서는 DB 작업만 수행
   */
  @Post("_bulk/create")
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("createMany", async () => {
      this.request = request;
      this.record = null;

      const dataArray = Array.isArray(body.data) ? body.data : [body.data];

      // 1단계: 트랜잭션 진입 전 모든 모델 사전 검증
      // 검증 에러 발생 시 트랜잭션 없이 즉시 실패하여 부분 실패 방지
      const models: Record<string, unknown>[] = [];
      const validationErrors: Array<{ index: number; errors: any }> = [];

      for (let i = 0; i < dataArray.length; i++) {
        try {
          const model = await this.buildModel(
            { data: dataArray[i] },
            this.options.dto?.create
          );
          models.push(model);
        } catch (error) {
          validationErrors.push({
            index: i,
            errors: error instanceof Error ? error.message : error,
          });
        }
      }

      // 검증 에러가 있으면 트랜잭션 진입 전 에러 응답
      if (validationErrors.length > 0) {
        throw new UnprocessableEntityException({
          errors: validationErrors.map((ve) => ({
            status: "422",
            source: { pointer: `/data/${ve.index}` },
            title: "Validation Error",
            detail: ve.errors,
          })),
        });
      }

      // 2단계: 검증 완료된 데이터만 트랜잭션으로 저장
      const createdCount = await this.prismaAdapter.transaction(async (tx) => {
        const delegate = (tx as any)[this.options.model];
        const result = await delegate.createMany({
          data: models,
          skipDuplicates: false,
        });
        return result.count;
      });

      return this.serializerService.serializeNull({
        created: createdCount,
      });
    });
  }

  /**
   * PATCH /:id - 단일 리소스 업데이트
   */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("update", async () => {
      this.request = request;
      this.parsedQuery = this.queryService.parse(request);

      // 기존 레코드 조회 → this.record에 저장
      await this.findRecord(id);

      // 모델 빌드 → this.model에 저장
      this.model = await this.buildModel(body, this.options.dto?.update);

      // beforeUpdate 훅 (this.model, this.record 사용 가능)
      await this.beforeUpdate();

      // DB 업데이트 (ID 타입 변환 적용)
      const data = await this.prismaAdapter.update(
        this.options.model,
        { id: this.convertIdByConfig(id) },
        this.model
      );
      this.record = data;

      // afterUpdate 훅
      await this.afterUpdate();

      return this.serializerService.serializeOne(
        data,
        this.options.serializer,
        {
          baseUrl: this.getBaseUrl(request),
        }
      );
    });
  }

  /**
   * PATCH /_bulk/update - 여러 리소스 업데이트
   * (비표준 확장)
   */
  @Patch("_bulk/update")
  async updateMany(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("updateMany", async () => {
      this.request = request;
      const { filter, attributes } = body.data || {};

      this.model = attributes || {};
      await this.beforeUpdate();

      const result = await this.prismaAdapter.updateMany(
        this.options.model,
        filter || {},
        this.model
      );

      return this.serializerService.serializeNull({
        updated: result.count,
      });
    });
  }

  /**
   * PUT /:id - Upsert (있으면 업데이트, 없으면 생성)
   */
  @Put(":id")
  async upsert(
    @Param("id") id: string,
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("upsert", async () => {
      this.request = request;
      this.parsedQuery = this.queryService.parse(request);

      // 기존 레코드 조회 시도
      try {
        await this.findRecord(id);
      } catch {
        this.record = null;
      }

      // 모델 빌드
      const dtoClass = this.record
        ? this.options.dto?.update
        : this.options.dto?.create;
      this.model = await this.buildModel(body, dtoClass);

      // beforeUpsert 훅
      await this.beforeUpsert();

      // ID 타입 변환 적용
      const convertedId = this.convertIdByConfig(id);
      const data = await this.prismaAdapter.upsert(
        this.options.model,
        { id: convertedId },
        { id: convertedId, ...this.model },
        this.model
      );
      this.record = data;

      // afterUpsert 훅
      await this.afterUpsert();

      return this.serializerService.serializeOne(
        data,
        this.options.serializer,
        {
          baseUrl: this.getBaseUrl(request),
        }
      );
    });
  }

  /**
   * PUT /_bulk/upsert - 여러 리소스 Upsert
   * (비표준 확장)
   */
  @Put("_bulk/upsert")
  async upsertMany(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("upsertMany", async () => {
      this.request = request;
      const dataArray = Array.isArray(body.data) ? body.data : [body.data];

      // 트랜잭션으로 전체 upsert 작업을 원자적으로 실행
      const upsertedCount = await this.prismaAdapter.transaction(async (tx) => {
        let count = 0;
        for (const item of dataArray) {
          this.model = await this.buildModel(
            { data: item },
            this.options.dto?.create
          );
          await this.beforeUpsert();

          // 트랜잭션 컨텍스트에서 upsert 실행
          const delegate = (tx as any)[this.options.model];

          // ID가 있으면 upsert, 없으면 create
          if (item.id) {
            const convertedId = this.convertIdByConfig(item.id);
            await delegate.upsert({
              where: { id: convertedId },
              create: { id: convertedId, ...this.model },
              update: this.model,
            });
          } else {
            await delegate.create({
              data: this.model,
            });
          }
          count++;
        }
        return count;
      });

      return this.serializerService.serializeNull({
        upserted: upsertedCount,
      });
    });
  }

  /**
   * DELETE /:id - 단일 리소스 삭제
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id") id: string,
    @Req() request: Request
  ): Promise<void> {
    await this.executeAction("delete", async () => {
      this.request = request;
      this.model = {};

      // 기존 레코드 조회 → this.record에 저장
      await this.findRecord(id);

      // beforeDelete 훅
      await this.beforeDelete();

      // DB 삭제 (ID 타입 변환 적용)
      await this.prismaAdapter.delete(this.options.model, {
        id: this.convertIdByConfig(id),
      });

      // afterDelete 훅
      await this.afterDelete();
    });
  }

  /**
   * POST /_bulk/delete - 여러 리소스 삭제
   * (비표준 확장)
   *
   * 참고: HTTP 명세상 DELETE 메서드의 request body는 정의되지 않아
   * 일부 프록시/게이트웨이에서 무시될 수 있음. 따라서 POST 사용.
   * 트랜잭션으로 원자적 실행 보장.
   */
  @Post("_bulk/delete")
  async deleteMany(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("deleteMany", async () => {
      this.request = request;
      const { filter } = body.data || {};

      this.model = {};
      this.record = null;

      await this.beforeDelete();

      // 트랜잭션으로 삭제 작업을 원자적으로 실행
      const deletedCount = await this.prismaAdapter.transaction(async (tx) => {
        const delegate = (tx as any)[this.options.model];
        const result = await delegate.deleteMany({
          where: filter || {},
        });
        return result.count;
      });

      await this.afterDelete();

      return this.serializerService.serializeNull({
        deleted: deletedCount,
      });
    });
  }

  // ============================================
  // 헬퍼 메서드
  // ============================================

  /**
   * Include된 관계 데이터 수집
   * 관계명과 함께 반환하여 serializeIncluded에서 정확한 serializer 매칭 지원
   *
   * @param data - 메인 리소스 데이터 배열
   * @param includes - include 경로 배열 (예: ['comments', 'author.profile'])
   * @returns IncludedResource[] - 관계명과 데이터를 포함한 배열
   *
   * @see IncludedResource - 반환 타입 정의
   * @see JsonApiSerializerService.serializeIncluded - 이 결과를 소비하는 메서드
   */
  protected collectIncludes(
    data: any[],
    includes: string[]
  ): IncludedResource[] {
    if (includes.length === 0 || data.length === 0) {
      return [];
    }

    const included: IncludedResource[] = [];
    const seen = new Set<string>();

    const addToIncluded = (item: any, relationName: string): void => {
      if (item && item.id) {
        const key = `${relationName}-${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          included.push({ relationName, data: item });
        }
      }
    };

    const traverse = (items: any[], path: string[]): void => {
      if (path.length === 0 || items.length === 0) return;

      const [current, ...rest] = path;

      for (const item of items) {
        if (!item) continue;

        const related = item[current];
        if (!related) continue;

        const relatedItems = Array.isArray(related) ? related : [related];

        // 현재 레벨의 관계 객체들을 included에 추가
        for (const relItem of relatedItems) {
          addToIncluded(relItem, current);
        }

        // 더 깊은 경로가 있으면 재귀적으로 탐색
        if (rest.length > 0) {
          traverse(relatedItems, rest);
        }
      }
    };

    for (const includePath of includes) {
      const parts = includePath.split(".");
      traverse(data, parts);
    }

    return included;
  }

  /**
   * 요청에서 Base URL 추출
   */
  protected getBaseUrl(request: Request): string {
    return `${request.protocol}://${request.get("host")}`;
  }

  /**
   * 리소스 타입 획득
   */
  protected getResourceType(): string {
    return this.options.type || pluralize(this.options.model);
  }

  /**
   * 쿼리 검증 에러 메시지를 QueryValidationError로 변환
   *
   * parseWithWhitelist에서 반환되는 에러 메시지 문자열을
   * JSON:API 형식의 QueryValidationError 객체로 변환합니다.
   *
   * @param message 에러 메시지 문자열
   * @returns QueryValidationError 객체
   */
  private parseErrorMessage(message: string): QueryValidationError {
    // Filter field 'xxx' is not allowed
    const filterMatch = message.match(/Filter field '([^']+)' is not allowed/);
    if (filterMatch) {
      return JsonApiQueryException.disallowedFilter(filterMatch[1]);
    }

    // Sort field 'xxx' is not allowed
    const sortMatch = message.match(/Sort field '([^']+)' is not allowed/);
    if (sortMatch) {
      return JsonApiQueryException.disallowedSort(sortMatch[1]);
    }

    // Include 'xxx' exceeds max depth of N
    const depthMatch = message.match(
      /Include '([^']+)' exceeds max depth of (\d+)/
    );
    if (depthMatch) {
      return JsonApiQueryException.includeDepthExceeded(
        depthMatch[1],
        parseInt(depthMatch[2], 10)
      );
    }

    // Include 'xxx' is not allowed
    const includeMatch = message.match(/Include '([^']+)' is not allowed/);
    if (includeMatch) {
      return JsonApiQueryException.disallowedInclude(includeMatch[1]);
    }

    // Field 'xxx' for type 'yyy' is not allowed
    const fieldMatch = message.match(
      /Field '([^']+)' for type '([^']+)' is not allowed/
    );
    if (fieldMatch) {
      return JsonApiQueryException.disallowedField(fieldMatch[1], fieldMatch[2]);
    }

    // 알 수 없는 에러 형식은 일반 에러로 반환
    return {
      status: "400",
      code: "INVALID_QUERY_PARAMETER",
      title: "Invalid Query Parameter",
      detail: message,
    };
  }
}
