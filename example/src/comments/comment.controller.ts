import { Controller, Inject } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  BeforeAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { CommentSerializer } from "./comment.serializer";
import { CreateCommentDto, UpdateCommentDto } from "./dto";

/**
 * CommentController
 *
 * Provides JSON:API CRUD endpoints for the comment resource.
 *
 * Available endpoints:
 * - GET    /comments          - List comments
 * - GET    /comments/:id      - Get comment details
 * - POST   /comments          - Create comment
 * - PATCH  /comments/:id      - Update comment
 * - DELETE /comments/:id      - Delete comment
 */
@Controller("comments")
@JsonApiController({
  model: "comment",
  serializer: CommentSerializer,
  dto: {
    create: CreateCommentDto,
    update: UpdateCommentDto,
  },
  // Allowed actions
  only: ["index", "show", "create", "update", "delete"],
  // Query parameter whitelist
  query: {
    allowedFilters: ["authorId", "articleId", "createdAt"],
    allowedSorts: ["createdAt", "-createdAt"],
    allowedIncludes: ["author", "article", "article.author"],
    maxIncludeDepth: 2,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
export class CommentController extends JsonApiCrudController {
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
    console.log(`[Comment] ${this.currentAction} request`);
  }

  // Lifecycle hook overrides
  protected async beforeCreate(): Promise<void> {
    console.log("[Comment] Pre-create processing");
  }

  protected async afterCreate(): Promise<void> {
    console.log(`[Comment] Comment created: ${this.record?.id}`);
    // Add notification logic here
  }

  protected async beforeDelete(): Promise<void> {
    console.log(`[Comment] Pre-delete processing: ${this.record?.id}`);
  }
}
