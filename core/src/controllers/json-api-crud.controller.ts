/**
 * JSON:API CRUD Base Controller
 *
 * @packageDocumentation
 * @module controllers
 *
 * Dependencies:
 * - @nestjs/common: HTTP decorators, exception classes
 * - express: Request type
 * - class-transformer: DTO transformation
 * - class-validator: DTO validation
 * - reflect-metadata: Metadata handling
 * - services/*: PrismaAdapter, QueryService, SerializerService
 * - interfaces/*: JSON:API, controller options types
 * - exceptions/*: Validation exceptions
 * - constants/*: Metadata constants
 * - utils/*: Naming, ID conversion
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
 * JSON:API CRUD Base Controller
 *
 * Supports Rails-style @model pattern and before_action/after_action.
 *
 * Main features:
 * - this.model: Entity instance filtered and validated through DTO
 * - this.record: Original record retrieved from DB
 * - @BeforeAction/@AfterAction: Rails-style hook decorators
 * - beforeCreate/afterCreate etc.: Overridable individual hooks
 *
 * ## Service Injection Pattern
 *
 * NestJS DI container does not auto-inject dependencies for abstract classes.
 * Therefore, subclasses must inject services through constructor
 * and implement protected getters.
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
 *   // Required: implement abstract getters
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
   * Prisma Adapter Service
   *
   * NestJS DI Limitation:
   * Abstract classes cannot receive direct injection from DI container.
   * Subclasses must inject services through constructor
   * and implement this getter to provide to the base class.
   *
   * @example
   * ```typescript
   * // Implement in subclass (required)
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
   * Query Service
   *
   * @see prismaAdapter getter description - same injection pattern applies
   */
  protected abstract get queryService(): JsonApiQueryService;

  /**
   * Serializer Service
   *
   * @see prismaAdapter getter description - same injection pattern applies
   */
  protected abstract get serializerService(): JsonApiSerializerService;

  /**
   * Module Options (optional)
   *
   * Implement when module-level settings like ID type conversion or debug mode are needed.
   * Returns undefined by default, override in subclass when needed.
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
   * Debug Logger
   */
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Controller Options
   * @JsonApiController decorator or direct definition
   */
  protected get options(): JsonApiControllerOptions {
    return (
      Reflect.getMetadata(JSON_API_CONTROLLER_OPTIONS, this.constructor) || {}
    );
  }

  /**
   * Whether debug mode is enabled
   */
  protected get isDebugMode(): boolean {
    return this.moduleOptions?.debug ?? false;
  }

  /**
   * Current working model instance
   * - Filtered to only allowed fields through DTO
   * - Validated with class-validator
   * - Can be modified in lifecycle hooks
   */
  protected model: Record<string, unknown> = {};

  /**
   * Current target record for show/update/delete (original from DB)
   * - Available in show, update, delete actions
   * - null in create action
   */
  protected record: Record<string, unknown> | null = null;

  /**
   * Current request object
   */
  protected request!: Request;

  /**
   * Parsed query parameters
   */
  protected parsedQuery!: ParsedQuery;

  /**
   * Currently executing action name
   * Default CRUD: 'index', 'show', 'create', 'update', 'delete', etc.
   * Custom: 'publish', 'archive', etc.
   */
  protected currentAction: string = "";

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Convert ID according to module settings
   * @param id String ID
   * @returns Converted ID (string or number)
   */
  protected convertIdByConfig(id: string): string | number {
    const idType = this.moduleOptions?.idType ?? "string";
    return convertId(id, idType);
  }

  /**
   * Output debug log
   * Only outputs when debug option is enabled
   */
  protected debugLog(message: string, context?: Record<string, unknown>): void {
    if (this.isDebugMode) {
      this.logger.debug(message, context ? JSON.stringify(context) : undefined);
    }
  }

  // ============================================
  // Action Execution and Hook System
  // ============================================

  /**
   * Action Execution Wrapper
   *
   * Automatically executes @BeforeAction/@AfterAction hooks before and after action execution.
   * Works the same for default CRUD actions (index, show, create, update, delete)
   * as well as custom actions registered with @JsonApiAction.
   *
   * ## Execution Order
   * 1. Set action name in this.currentAction
   * 2. Execute @BeforeAction hooks (check only/except conditions)
   * 3. Execute handler (actual business logic)
   * 4. Execute @AfterAction hooks (check only/except conditions)
   *
   * ## Usage in Custom Actions
   * ```typescript
   * @Post(':id/publish')
   * @JsonApiAction('publish')
   * async publish(@Param('id') id: string) {
   *   return this.executeAction('publish', async () => {
   *     // @BeforeAction('loadRecord', { only: ['publish'] }) executes
   *     // @BeforeAction('authenticate') executes (always if no only/except)
   *
   *     const updated = await this.prismaAdapter.update(...);
   *     return this.serializerService.serialize(...);
   *
   *     // @AfterAction('logActivity', { except: ['index'] }) executes
   *   });
   * }
   * ```
   *
   * @param action Action name (default CRUD: 'index', 'show', 'create', 'update', 'delete'
   *               or custom: 'publish', 'archive', etc.)
   * @param handler Async function that performs the actual action logic
   * @returns Return value of handler
   *
   * @see JsonApiAction - Custom action registration decorator
   * @see BeforeAction - Pre-action hook
   * @see AfterAction - Post-action hook
   */
  protected async executeAction<T>(
    action: string,
    handler: () => Promise<T>
  ): Promise<T> {
    this.currentAction = action;

    // Execute @BeforeAction hooks
    await this.runBeforeActionHooks();

    // Execute actual action
    const result = await handler();

    // Execute @AfterAction hooks
    await this.runAfterActionHooks();

    return result;
  }

  /**
   * Execute @BeforeAction hooks
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
   * Execute @AfterAction hooks
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
   * Determine whether to execute hook
   *
   * Evaluates @BeforeAction/@AfterAction's only/except options
   * to determine if the hook should run for the current action.
   *
   * ## only/except behavior rules
   * 1. If only is specified: Execute only if action is in the only array
   * 2. If except is specified: Execute only if action is NOT in the except array
   * 3. If neither is specified: Execute for all actions
   * 4. If both are specified: only takes precedence
   *
   * ## Custom action support
   * Both default CRUD actions and custom actions registered with @JsonApiAction
   * can be used in only/except arrays.
   *
   * @example
   * // Mixed use of default CRUD + custom actions
   * { only: ['show', 'update', 'delete', 'publish', 'archive'] }
   * { except: ['index', 'show'] } // Executes for create, update, delete, publish, etc.
   *
   * @param options Hook options (including only/except)
   * @param action Currently executing action name
   * @returns Whether to execute the hook
   */
  private shouldRunHook(options: ActionHookOptions, action: string): boolean {
    if (options.only && options.only.length > 0) {
      return options.only.includes(action);
    }
    if (options.except && options.except.length > 0) {
      return !options.except.includes(action);
    }
    return true; // Execute always if no only/except
  }

  /**
   * Check if action is enabled
   *
   * Evaluates @JsonApiController's only/except options
   * to check if the default CRUD action is enabled.
   *
   * Note: This method only applies to default CRUD actions.
   * Custom actions (defined with @JsonApiAction) are defined as separate routes
   * and are not affected by this method.
   *
   * @param action Action name to check
   * @returns Whether the action is enabled
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
  // Individual Lifecycle Hooks - Override to use
  // ============================================

  /** Pre-index action hook */
  protected async beforeIndex(): Promise<void> {}
  /** Post-index action hook */
  protected async afterIndex(_records: any[]): Promise<void> {}
  /** Pre-show action hook (after record retrieval) */
  protected async beforeShow(): Promise<void> {}
  /** Post-show action hook */
  protected async afterShow(): Promise<void> {}
  /** Pre-create action hook (after model build, before DB save) */
  protected async beforeCreate(): Promise<void> {}
  /** Post-create action hook (after DB save) */
  protected async afterCreate(): Promise<void> {}
  /** Pre-update action hook (after model build, before DB save) */
  protected async beforeUpdate(): Promise<void> {}
  /** Post-update action hook (after DB save) */
  protected async afterUpdate(): Promise<void> {}
  /** Pre-delete action hook (after record retrieval, before deletion) */
  protected async beforeDelete(): Promise<void> {}
  /** Post-delete action hook (after deletion) */
  protected async afterDelete(): Promise<void> {}
  /** Pre-upsert action hook */
  protected async beforeUpsert(): Promise<void> {}
  /** Post-upsert action hook */
  protected async afterUpsert(): Promise<void> {}

  // ============================================
  // Model Build Methods
  // ============================================

  /**
   * Build model from request body (type-safe version)
   * - Extract attributes from JSON:API body
   * - Transform to DTO class (filter only allowed fields via whitelist)
   * - Validate with class-validator
   *
   * @typeParam T - DTO type (CreateDto or UpdateDto)
   * @param body JSON:API request body (type-safe)
   * @param dtoClass DTO class (create or update)
   * @returns Validated model object (DTO type)
   *
   * @example
   * // Type-safe usage
   * const model = await this.buildModel<CreateArticleDto>(body, CreateArticleDto);
   * // model is inferred as CreateArticleDto type
   */
  protected async buildModel<T extends object = Record<string, unknown>>(
    body: JsonApiRequestBody<T>,
    dtoClass?: Type<T>
  ): Promise<T> {
    // Extract attributes from JSON:API body
    const attributes = body?.data?.attributes || {};

    // Extract IDs from relationships
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

    // Return raw data if no DTO class
    if (!dtoClass) {
      return rawData;
    }

    // Transform to DTO instance
    const dtoInstance = plainToInstance(dtoClass, rawData);

    // Validate with class-validator
    const errors = await validate(dtoInstance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      throw new JsonApiValidationException(errors);
    }

    // Convert validated DTO to plain object (remove undefined fields)
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
   * Find record by ID
   * Retrieved record is stored in this.record
   */
  protected async findRecord(id: string): Promise<Record<string, unknown>> {
    // Convert ID type (string or number based on settings)
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
  // CRUD Actions
  // ============================================

  /**
   * GET / - Retrieve resource list
   */
  @Get()
  async index(@Req() request: Request): Promise<JsonApiDocument> {
    return this.executeAction("index", async () => {
      this.request = request;
      this.record = null;
      this.model = {};

      // Parse query with whitelist applied
      const { parsed, errors } = this.queryService.parseWithWhitelist(
        request,
        this.options.query
      );

      // When error occurs in onDisallowed: 'error' mode
      if (errors.length > 0) {
        throw new JsonApiQueryException(
          errors.map((msg) => this.parseErrorMessage(msg))
        );
      }

      this.parsedQuery = parsed;

      // beforeIndex hook
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

      // afterIndex hook
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
   * GET /:id - Retrieve single resource
   */
  @Get(":id")
  async show(
    @Param("id") id: string,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("show", async () => {
      this.request = request;
      this.model = {};

      // Parse query with whitelist applied
      const { parsed, errors } = this.queryService.parseWithWhitelist(
        request,
        this.options.query
      );

      // When error occurs in onDisallowed: 'error' mode
      if (errors.length > 0) {
        throw new JsonApiQueryException(
          errors.map((msg) => this.parseErrorMessage(msg))
        );
      }

      this.parsedQuery = parsed;

      // Retrieve record → store in this.record
      await this.findRecord(id);

      // beforeShow hook
      await this.beforeShow();

      // afterShow hook
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
   * POST / - Create single resource
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

      // Build model → store in this.model
      this.model = await this.buildModel(body, this.options.dto?.create);

      // beforeCreate hook (this.model can be modified)
      await this.beforeCreate();

      // Save to DB
      const data = await this.prismaAdapter.create(
        this.options.model,
        this.model
      );
      this.record = data;

      // afterCreate hook
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
   * POST /_bulk/create - Create multiple resources
   * (Non-standard extension)
   * Ensures atomic execution with transaction - prevents partial failures
   *
   * Error handling strategy:
   * 1. Validate all data before starting transaction (Pre-validation)
   * 2. On validation failure, return error immediately without entering transaction
   * 3. Only perform DB operations within transaction
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

      // Step 1: Pre-validate all models before entering transaction
      // On validation error, fail immediately without transaction to prevent partial failures
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

      // If validation errors exist, return error response before entering transaction
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

      // Step 2: Save only validated data via transaction
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
   * PATCH /:id - Update single resource
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

      // Retrieve existing record → store in this.record
      await this.findRecord(id);

      // Build model → store in this.model
      this.model = await this.buildModel(body, this.options.dto?.update);

      // beforeUpdate hook (this.model, this.record can be used)
      await this.beforeUpdate();

      // Update DB (with ID type conversion applied)
      const data = await this.prismaAdapter.update(
        this.options.model,
        { id: this.convertIdByConfig(id) },
        this.model
      );
      this.record = data;

      // afterUpdate hook
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
   * PATCH /_bulk/update - Update multiple resources
   * (Non-standard extension)
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
   * PUT /:id - Upsert (update if exists, create if not)
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

      // Attempt to retrieve existing record
      try {
        await this.findRecord(id);
      } catch {
        this.record = null;
      }

      // Build model
      const dtoClass = this.record
        ? this.options.dto?.update
        : this.options.dto?.create;
      this.model = await this.buildModel(body, dtoClass);

      // beforeUpsert hook
      await this.beforeUpsert();

      // Apply ID type conversion
      const convertedId = this.convertIdByConfig(id);
      const data = await this.prismaAdapter.upsert(
        this.options.model,
        { id: convertedId },
        { id: convertedId, ...this.model },
        this.model
      );
      this.record = data;

      // afterUpsert hook
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
   * PUT /_bulk/upsert - Upsert multiple resources
   * (Non-standard extension)
   */
  @Put("_bulk/upsert")
  async upsertMany(
    @Body() body: any,
    @Req() request: Request
  ): Promise<JsonApiDocument> {
    return this.executeAction("upsertMany", async () => {
      this.request = request;
      const dataArray = Array.isArray(body.data) ? body.data : [body.data];

      // Execute all upsert operations atomically via transaction
      const upsertedCount = await this.prismaAdapter.transaction(async (tx) => {
        let count = 0;
        for (const item of dataArray) {
          this.model = await this.buildModel(
            { data: item },
            this.options.dto?.create
          );
          await this.beforeUpsert();

          // Execute upsert in transaction context
          const delegate = (tx as any)[this.options.model];

          // If ID exists, upsert; otherwise create
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
   * DELETE /:id - Delete single resource
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

      // Retrieve existing record → store in this.record
      await this.findRecord(id);

      // beforeDelete hook
      await this.beforeDelete();

      // Delete from DB (with ID type conversion applied)
      await this.prismaAdapter.delete(this.options.model, {
        id: this.convertIdByConfig(id),
      });

      // afterDelete hook
      await this.afterDelete();
    });
  }

  /**
   * POST /_bulk/delete - Delete multiple resources
   * (Non-standard extension)
   *
   * Note: HTTP specification does not define request body for DELETE method,
   * which may be ignored by some proxies/gateways. Therefore, POST is used.
   * Ensures atomic execution via transaction.
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

      // Execute delete operation atomically via transaction
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
  // Helper Methods
  // ============================================

  /**
   * Collect included relationship data
   * Returns with relationship name for accurate serializer matching in serializeIncluded
   *
   * @param data - Main resource data array
   * @param includes - Include path array (e.g., ['comments', 'author.profile'])
   * @returns IncludedResource[] - Array containing relationship name and data
   *
   * @see IncludedResource - Return type definition
   * @see JsonApiSerializerService.serializeIncluded - Method that consumes this result
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

        // Add relationship objects at current level to included
        for (const relItem of relatedItems) {
          addToIncluded(relItem, current);
        }

        // If deeper path exists, traverse recursively
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
   * Extract Base URL from request
   */
  protected getBaseUrl(request: Request): string {
    return `${request.protocol}://${request.get("host")}`;
  }

  /**
   * Get resource type
   */
  protected getResourceType(): string {
    return this.options.type || pluralize(this.options.model);
  }

  /**
   * Convert query validation error message to QueryValidationError
   *
   * Converts error message strings returned from parseWithWhitelist
   * to JSON:API format QueryValidationError objects.
   *
   * @param message Error message string
   * @returns QueryValidationError object
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

    // Return as general error for unknown error formats
    return {
      status: "400",
      code: "INVALID_QUERY_PARAMETER",
      title: "Invalid Query Parameter",
      detail: message,
    };
  }
}
