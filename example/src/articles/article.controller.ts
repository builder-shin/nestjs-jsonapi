import { Controller, Inject, Post, Param, HttpCode, HttpStatus } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  JsonApiAction,
  BeforeAction,
  AfterAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { ArticleSerializer } from "./article.serializer";
import { CreateArticleDto, UpdateArticleDto } from "./dto";

/**
 * ArticleController
 *
 * Provides JSON:API CRUD endpoints for the article resource.
 *
 * Available endpoints:
 * - GET    /articles                - List articles
 * - GET    /articles/:id            - Get article details
 * - POST   /articles                - Create article
 * - POST   /articles/_bulk/create   - Bulk create articles
 * - PATCH  /articles/:id            - Update article
 * - DELETE /articles/:id            - Delete article
 * - POST   /articles/:id/publish    - Publish article (custom action)
 * - POST   /articles/:id/archive    - Archive article (custom action)
 */
@Controller("articles")
@JsonApiController({
  model: "article",
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
  // Allowed actions (including bulk create)
  only: ["index", "show", "create", "createMany", "update", "delete"],
  // Query parameter whitelist
  query: {
    allowedFilters: ["status", "authorId", "createdAt", "title"],
    allowedSorts: ["createdAt", "-createdAt", "title", "-title", "publishedAt", "-publishedAt"],
    allowedIncludes: ["author", "comments", "comments.author"],
    maxIncludeDepth: 2,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
@BeforeAction("loadArticle", { only: ["show", "update", "delete", "publish", "archive"] })
@AfterAction("notifySubscribers", { only: ["publish"] })
export class ArticleController extends JsonApiCrudController {
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

  /**
   * Publish article custom action
   *
   * POST /articles/:id/publish
   */
  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @JsonApiAction("publish")
  async publish(@Param("id") id: string) {
    return this.executeAction("publish", async () => {
      const updated = await this.prismaAdapter.update(
        "article",
        { id },
        {
          status: "published",
          publishedAt: new Date(),
        }
      );

      return this.serializerService.serializeOne(updated, ArticleSerializer);
    });
  }

  /**
   * Archive article custom action
   *
   * POST /articles/:id/archive
   */
  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @JsonApiAction("archive")
  async archive(@Param("id") id: string) {
    return this.executeAction("archive", async () => {
      const updated = await this.prismaAdapter.update("article", { id }, { status: "archived" });

      return this.serializerService.serializeOne(updated, ArticleSerializer);
    });
  }

  // Custom hook methods
  protected async logRequest(): Promise<void> {
    // Request logging example - recommend using Logger service in production
    console.log(`[Article] ${this.currentAction} request`);
  }

  protected async loadArticle(): Promise<void> {
    // Load record (automatically called in show, update, delete)
    console.log(`[Article] Loading record`);
  }

  protected async notifySubscribers(): Promise<void> {
    // Publish notification logic
    console.log(`[Article] Sending publish notification to subscribers: ${this.record?.id}`);
  }

  // Lifecycle hook overrides
  protected async beforeCreate(): Promise<void> {
    // Set default status to draft
    if (!this.model.status) {
      this.model.status = "draft";
    }
    console.log("[Article] Pre-create processing");
  }

  protected async afterCreate(): Promise<void> {
    console.log(`[Article] Article created: ${this.record?.id}`);
  }

  protected async beforeUpdate(): Promise<void> {
    // Automatically set publishedAt when status changes to published
    if (this.model.status === "published" && !this.model.publishedAt) {
      this.model.publishedAt = new Date();
    }
    console.log(`[Article] Pre-update processing: ${this.record?.id}`);
  }

  protected async beforeDelete(): Promise<void> {
    console.log(`[Article] Pre-delete processing: ${this.record?.id}`);
  }
}
