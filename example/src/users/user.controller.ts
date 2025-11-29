import { Controller, Inject } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  BeforeAction,
  AfterAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "./user.serializer";
import { CreateUserDto, UpdateUserDto } from "./dto";

/**
 * UserController
 *
 * Provides JSON:API CRUD endpoints for the user resource.
 *
 * Available endpoints:
 * - GET    /users          - List users
 * - GET    /users/:id      - Get user details
 * - POST   /users          - Create user
 * - PATCH  /users/:id      - Update user
 * - DELETE /users/:id      - Delete user
 */
@Controller("users")
@JsonApiController({
  model: "user",
  serializer: UserSerializer,
  dto: {
    create: CreateUserDto,
    update: UpdateUserDto,
  },
  // Specify allowed actions (excluding bulk operations)
  only: ["index", "show", "create", "update", "delete"],
  // Query parameter whitelist
  query: {
    allowedFilters: ["email", "name", "role", "createdAt"],
    allowedSorts: ["createdAt", "-createdAt", "name", "-name", "email"],
    allowedIncludes: ["articles", "comments"],
    maxIncludeDepth: 1,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
@AfterAction("logResponse", { except: ["index"] })
export class UserController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly _moduleOptions: JsonApiModuleOptions
  ) {
    super();
  }

  // Abstract getter implementation (required)
  protected get prismaAdapter() {
    return this._prismaAdapter;
  }

  protected get queryService() {
    return this._queryService;
  }

  protected get serializerService() {
    return this._serializerService;
  }

  protected get moduleOptions() {
    return this._moduleOptions;
  }

  // Custom hook methods
  protected async logRequest(): Promise<void> {
    console.log(`[User] ${this.currentAction} request started`);
  }

  protected async logResponse(): Promise<void> {
    console.log(`[User] ${this.currentAction} response completed`);
  }

  // Lifecycle hook overrides
  protected async beforeCreate(): Promise<void> {
    // Add email duplication check logic here
    console.log("[User] Pre-create processing");
  }

  protected async afterCreate(): Promise<void> {
    // Add post-creation notification logic here
    console.log(`[User] User created: ${this.record?.id}`);
  }

  protected async beforeDelete(): Promise<void> {
    // Add pre-deletion validation logic here
    console.log(`[User] Pre-delete processing: ${this.record?.id}`);
  }
}
